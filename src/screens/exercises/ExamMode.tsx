import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppLayout } from '../../components/AppLayout';
import { getLesson, getSubject } from '../../content/catalog';
import type { Lesson, VocabularyEntry } from '../../content/types';
import { acceptedAnswers, isCorrectAnswer } from '../../exercises/answers';
import { createExam, scoreExam, type Direction, type ExamScore, type Prompt } from '../../exercises/engine';
import { useProgress } from '../../progress/ProgressProvider';
import { sessionKey } from '../../progress/store';
import type { SavedSession, SessionAnswer } from '../../progress/types';
import { MissingContent } from '../NotFoundPage';
import { ResultPanel, type ResultReviewItem } from './ResultPanel';

function hasEveryEntryOnce(session: SavedSession, lesson: Lesson) {
  const lessonIds = new Set(lesson.entries.map((entry) => entry.id));
  return session.entryIds.length === lesson.entries.length
    && new Set(session.entryIds).size === session.entryIds.length
    && session.entryIds.every((entryId) => lessonIds.has(entryId));
}

function isUsableSession(session: SavedSession | undefined, lesson: Lesson) {
  return Boolean(session
    && session.lessonId === lesson.id
    && session.mode === 'exam'
    && session.direction === 'mixed'
    && session.index >= 0
    && session.index < session.entryIds.length
    && hasEveryEntryOnce(session, lesson));
}

function completeAnswers(session: SavedSession): { answers: SessionAnswer[]; changed: boolean } {
  let changed = session.answers.length !== session.entryIds.length;
  const answers = session.entryIds.map((entryId, index) => {
    const saved = session.answers.find((answer) => answer.entryId === entryId);
    if (saved?.direction) {
      if (saved !== session.answers[index]) changed = true;
      return { entryId, value: saved.value, direction: saved.direction };
    }
    changed = true;
    const direction: Direction = Math.random() < 0.5 ? 'es-de' : 'de-es';
    return { entryId, value: saved?.value ?? '', direction };
  });
  return { answers, changed };
}

function createExamSession(lesson: Lesson): SavedSession {
  const questions = createExam(lesson.entries);
  return {
    lessonId: lesson.id,
    mode: 'exam',
    entryIds: questions.map((question) => question.entryId),
    index: 0,
    direction: 'mixed',
    answers: questions.map((question) => ({
      entryId: question.entryId,
      value: '',
      direction: question.direction,
    })),
    updatedAt: new Date().toISOString(),
  };
}

function questionFor(entry: VocabularyEntry, direction: Direction): Prompt {
  return {
    entryId: entry.id,
    direction,
    prompt: direction === 'es-de' ? entry.spanish : entry.german[0]!,
    answers: acceptedAnswers(entry, direction),
  };
}

interface InitialExamState {
  session?: SavedSession;
  needsSave: boolean;
}

interface ExamResult {
  score: ExamScore;
  reviewItems: ResultReviewItem[];
}

export function ExamMode() {
  const { subjectId, lessonId } = useParams();
  const { progress, updateEntry, saveSession, clearSession, recordExam } = useProgress();
  const subject = subjectId ? getSubject(subjectId) : undefined;
  const lesson = lessonId ? getLesson(lessonId) : undefined;
  const belongsToSubject = Boolean(subject && lesson
    && lesson.subjectId === subject.id
    && subject.lessonIds.includes(lesson.id));
  const [initial] = useState<InitialExamState>(() => {
    if (!belongsToSubject || !lesson) return { needsSave: false };
    const saved = progress.sessions[sessionKey(lesson.id, 'exam')];
    if (saved && isUsableSession(saved, lesson)) {
      const completed = completeAnswers(saved);
      return {
        session: completed.changed ? { ...saved, answers: completed.answers } : saved,
        needsSave: completed.changed,
      };
    }
    return { session: createExamSession(lesson), needsSave: true };
  });
  const [session, setSession] = useState(initial.session);
  const [result, setResult] = useState<ExamResult>();
  const submitting = useRef(false);

  useEffect(() => {
    if (belongsToSubject && initial.needsSave && initial.session) saveSession(initial.session);
  }, [belongsToSubject, initial, saveSession]);

  if (!belongsToSubject || !subject || !lesson || !session) return <MissingContent />;

  const basePath = `/subjects/${subject.id}/lessons/${lesson.id}`;
  const entriesById = new Map(lesson.entries.map((entry) => [entry.id, entry]));
  const questions = session.entryIds.map((entryId) => {
    const entry = entriesById.get(entryId)!;
    const answer = session.answers.find((candidate) => candidate.entryId === entryId)!;
    return questionFor(entry, answer.direction as Direction);
  });

  const persist = (next: SavedSession) => {
    setSession(next);
    saveSession(next);
  };

  const changeValue = (value: string) => {
    const currentId = session.entryIds[session.index];
    const next = {
      ...session,
      answers: session.answers.map((answer) => (
        answer.entryId === currentId ? { ...answer, value } : answer
      )),
      updatedAt: new Date().toISOString(),
    };
    persist(next);
  };

  const navigate = (index: number) => {
    if (index < 0 || index >= session.entryIds.length) return;
    persist({ ...session, index, updatedAt: new Date().toISOString() });
  };

  const submitExam = () => {
    if (submitting.current || result) return;
    if (!window.confirm('Wirklich abgeben? Danach siehst du alle Ergebnisse.')) return;
    submitting.current = true;

    const values = Object.fromEntries(session.answers.map((answer) => [answer.entryId, answer.value]));
    const score = scoreExam(questions, values, lesson.entries);
    const reviewItems = questions.map((question) => ({
      entryId: question.entryId,
      prompt: question.prompt,
      value: values[question.entryId] ?? '',
      accepted: question.answers,
      correct: isCorrectAnswer(values[question.entryId] ?? '', entriesById.get(question.entryId)!, question.direction),
    }));

    reviewItems.forEach((item) => updateEntry(item.entryId, item.correct));
    recordExam({
      lessonId: lesson.id,
      completedAt: new Date().toISOString(),
      percentage: score.percentage,
      missedEntryIds: score.missedEntryIds,
    });
    clearSession(lesson.id, 'exam');
    setResult({ score, reviewItems });
  };

  if (result) {
    const retryPath = result.score.missedEntryIds.length > 0
      ? `${basePath}/schreiben?entries=${result.score.missedEntryIds.join(',')}`
      : undefined;
    return (
      <AppLayout>
        <ResultPanel
          correct={result.score.correct}
          eyebrow="Prüfung"
          lessonPath={basePath}
          retryPath={retryPath}
          reviewItems={result.reviewItems}
          title="Prüfung abgeschlossen"
          total={result.score.total}
        />
      </AppLayout>
    );
  }

  const currentId = session.entryIds[session.index]!;
  const currentQuestion = questions[session.index]!;
  const currentAnswer = session.answers.find((answer) => answer.entryId === currentId)!;
  return (
    <AppLayout>
      <Link className="back-link" to={basePath}>← Zurück zur Lektion</Link>
      <section className="exercise" aria-labelledby="exam-title">
        <p className="eyebrow">Prüfung</p>
        <h1 id="exam-title">Teste die ganze Lektion</h1>
        <p className="exercise-progress" aria-live="polite">Aufgabe {session.index + 1} von {session.entryIds.length}</p>
        <p className="writing-prompt">{currentQuestion.prompt}</p>
        <form className="writing-form" onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="exam-answer">Deine Übersetzung</label>
          <input
            autoComplete="off"
            id="exam-answer"
            onChange={(event) => changeValue(event.target.value)}
            spellCheck={false}
            value={currentAnswer.value}
          />
        </form>
        <div className="exam-navigation" aria-label="Prüfungsnavigation">
          <button
            disabled={session.index === 0}
            type="button"
            onClick={() => navigate(session.index - 1)}
          >
            Vorherige Aufgabe
          </button>
          <button
            disabled={session.index === session.entryIds.length - 1}
            type="button"
            onClick={() => navigate(session.index + 1)}
          >
            Nächste Aufgabe
          </button>
          <button className="exam-navigation__submit" type="button" onClick={submitExam}>Prüfung abgeben</button>
        </div>
      </section>
    </AppLayout>
  );
}
