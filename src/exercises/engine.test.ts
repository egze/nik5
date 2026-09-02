import { describe, expect, it } from 'vitest';
import type { VocabularyEntry } from '../content/types';
import { createExam, createMultipleChoice, scoreExam } from './engine';

const entries: VocabularyEntry[] = [
  { id: 'one', groupId: 'g', spanish: 'Uno', german: ['Eins'], kind: 'word' },
  { id: 'two', groupId: 'g', spanish: 'Dos', german: ['Zwei'], kind: 'word' },
  { id: 'three', groupId: 'g', spanish: 'Tres', german: ['Drei'], kind: 'word' },
  { id: 'four', groupId: 'g', spanish: 'Cuatro', german: ['Vier'], kind: 'word' },
];

const sequenceRandom = (values: number[]) => {
  let index = 0;
  return () => values[index++] ?? 0;
};

describe('exercise engine', () => {
  it('creates four normalized-distinct multiple-choice options', () => {
    const question = createMultipleChoice(entries, 'one', 'es-de', () => 0);
    expect(question.options).toHaveLength(4);
    expect(new Set(question.options.map((option) => option.toLocaleLowerCase())).size).toBe(4);
    expect(question.options).toContain('Eins');
    expect(question.prompt).toBe('Uno');
  });

  it('returns all distinct options when fewer than four are available', () => {
    const question = createMultipleChoice(entries.slice(0, 2), 'one', 'es-de', () => 0);
    expect(question.options).toEqual(expect.arrayContaining(['Eins', 'Zwei']));
    expect(question.options).toHaveLength(2);
  });

  it('excludes all equivalent answers for the current entry from distractors', () => {
    const current: VocabularyEntry = {
      ...entries[0], german: ['Eins', 'Ein'], acceptedGerman: ['Eine'],
    };
    const question = createMultipleChoice([current, ...entries.slice(1)], 'one', 'es-de', () => 0);
    expect(question.options).toContain('Eins');
    expect(question.options).not.toContain('Ein');
    expect(question.options).not.toContain('Eine');
  });

  it('caps multiple-choice options at four when enough distractors exist', () => {
    const expanded = [...entries, ...Array.from({ length: 4 }, (_, index) => ({
      id: `extra-${index}`, groupId: 'g', spanish: `Extra ${index}`,
      german: [`Extra DE ${index}`], kind: 'word' as const,
    }))];
    expect(createMultipleChoice(expanded, 'one', 'es-de', () => 0).options).toHaveLength(4);
  });

  it('creates a stable question with a zero-valued random source', () => {
    expect(createMultipleChoice(entries, 'one', 'de-es', () => 0)).toEqual({
      entryId: 'one', direction: 'de-es', prompt: 'Eins', answers: ['Uno'],
      options: ['Dos', 'Tres', 'Cuatro', 'Uno'],
    });
  });

  it('covers every entry exactly once in an exam', () => {
    const questions = createExam(entries, sequenceRandom([0.1, 0.9, 0.2, 0.8, 0.4, 0.6]));
    expect(new Set(questions.map((question) => question.entryId))).toEqual(new Set(entries.map((entry) => entry.id)));
    expect(questions).toHaveLength(entries.length);
  });

  it('uses both directions when random values select both', () => {
    const questions = createExam(entries, sequenceRandom([0, 0, 0, 1, 0, 0, 0, 1]));
    expect(new Set(questions.map((question) => question.direction))).toEqual(new Set(['es-de', 'de-es']));
  });

  it('scores answers and reports missed entry ids', () => {
    const questions = createExam(entries, () => 0);
    const score = scoreExam(questions, { one: 'Eins', two: 'wrong', three: 'Drei', four: 'Vier' }, entries);
    expect(score).toEqual({ total: 4, correct: 3, percentage: 75, missedEntryIds: ['two'] });
    expect(scoreExam([], {}, entries)).toEqual({ total: 0, correct: 0, percentage: 0, missedEntryIds: [] });
  });
});
