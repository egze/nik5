import type { VocabularyEntry } from '../content/types';
import { acceptedAnswers, isCorrectAnswer, normalizeAnswer, type Direction } from './answers';

export type { Direction } from './answers';

export type RandomSource = () => number;

export interface Prompt {
  entryId: string;
  direction: Direction;
  prompt: string;
  answers: string[];
}

export interface MultipleChoiceQuestion extends Prompt {
  options: string[];
}

export interface ExamAnswer { entryId: string; value: string; }

export interface ExamScore {
  total: number;
  correct: number;
  percentage: number;
  missedEntryIds: string[];
}

function shuffle<T>(values: T[], random: RandomSource): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const choice = Math.floor(random() * (index + 1));
    const current = result[index]!;
    result[index] = result[choice]!;
    result[choice] = current;
  }
  return result;
}

function distinctAnswers(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = normalizeAnswer(value);
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function createPrompt(entry: VocabularyEntry, direction: Direction): Prompt {
  const source = direction === 'es-de' ? entry.spanish : (entry.german[0] ?? '');
  return { entryId: entry.id, direction, prompt: source, answers: acceptedAnswers(entry, direction) };
}

export function createMultipleChoice(
  entries: VocabularyEntry[], entryId: string, direction: Direction, random: RandomSource = Math.random,
): MultipleChoiceQuestion {
  const entry = entries.find((candidate) => candidate.id === entryId);
  if (!entry) throw new Error(`Unknown vocabulary entry: ${entryId}`);

  const currentAnswers = acceptedAnswers(entry, direction);
  const correct = currentAnswers[0];
  if (correct === undefined) throw new Error(`Entry has no answer: ${entryId}`);
  const allAnswers = entries.flatMap((candidate) => acceptedAnswers(candidate, direction));
  const currentAnswerKeys = new Set(currentAnswers.map(normalizeAnswer));
  const distractors = distinctAnswers(allAnswers.filter((answer) => !currentAnswerKeys.has(normalizeAnswer(answer))));
  const options = distractors.slice(0, 3);
  options.unshift(correct);
  return { ...createPrompt(entry, direction), options: shuffle(options, random) };
}

export function createExam(entries: VocabularyEntry[], random: RandomSource = Math.random): Prompt[] {
  return shuffle(entries, random).map((entry) => createPrompt(entry, random() < 0.5 ? 'es-de' : 'de-es'));
}

export function scoreExam(questions: Prompt[], values: Record<string, string>, entries: VocabularyEntry[]): ExamScore {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const missedEntryIds: string[] = [];
  let correct = 0;
  for (const question of questions) {
    const entry = byId.get(question.entryId);
    if (entry && isCorrectAnswer(values[question.entryId] ?? '', entry, question.direction)) correct += 1;
    else missedEntryIds.push(question.entryId);
  }
  const total = questions.length;
  return { total, correct, percentage: total === 0 ? 0 : Math.round(correct / total * 100), missedEntryIds };
}
