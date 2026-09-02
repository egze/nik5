import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { AppLayout } from '../../components/AppLayout';
import { getLesson, getSubject } from '../../content/catalog';
import type { Lesson, VocabularyEntry } from '../../content/types';
import { acceptedAnswers, isCorrectAnswer } from '../../exercises/answers';
import { createExam, type Direction } from '../../exercises/engine';
import { useProgress } from '../../progress/ProgressProvider';
import { sessionKey } from '../../progress/store';
import type { SavedSession, SessionAnswer } from '../../progress/types';
import { MissingContent } from '../NotFoundPage';
import { ResultPanel } from './ResultPanel';

interface EntrySelection {
  entries: VocabularyEntry[];
  requiredIds?: Set<string>;
}

function requestedEntries(lesson: Lesson, search: string): EntrySelection {
  const requested = new URLSearchParams(search).get('entries');
  if (requested === null) return { entries: lesson.entries };

  const ids = requested.split(',');
  const lessonIds = new Set(lesson.entries.map((entry) => entry.id));
  if (ids.some((id) => id.length === 0 || !lessonIds.has(id))) {
    return { entries: lesson.entries, requiredIds: lessonIds };
  }

  const uniqueIds = [...new Set(ids)];
  const byId = new Map(lesson.entries.map((entry) => [entry.id, entry]));
  return {
    entries: uniqueIds.map((id) => byId.get(id)!),
    requiredIds: new Set(uniqueIds),
  };
}

function matchesEntries(session: SavedSession, expectedIds: Set<string>) {
  return session.entryIds.length === expectedIds.size
    && new Set(session.entryIds).size === session.entryIds.length
    && session.entryIds.every((entryId) => expectedIds.has(entryId));
}

function isUsableSession(
  session: SavedSession | undefined,
  lessonId: string,
  lessonIds: Set<string>,
  requiredIds?: Set<string>,
) {
  return Boolean(session
    && session.lessonId === lessonId
    && session.mode === 'writing'
    && session.direction === 'mixed'
    && session.index >= 0
    && session.index < session.entryIds.length
    && session.entryIds.length > 0
    && new Set(session.entryIds).size === session.entryIds.length
    && session.entryIds.every((entryId) => lessonIds.has(entryId))
    && (!requiredIds || matchesEntries(session, requiredIds)));
}

function completeAnswers(session: SavedSession): SessionAnswer[] {
  return session.entryIds.map((entryId) => {
    const saved = session.answers.find((answer) => answer.entryId === entryId);
    return saved?.direction
      ? saved
      : { entryId, value: saved?.value ?? '', direction: Math.random() < 0.5 ? 'es-de' : 'de-es' };
  });
}

function createWritingSession(lessonId: string, entries: VocabularyEntry[]): SavedSession {
  const prompts = createExam(entries);
  return {
    lessonId,
    mode: 'writing',
    entryIds: prompts.map((prompt) => prompt.entryId),
    index: 0,
    direction: 'mixed',
    answers: prompts.map((prompt) => ({
      entryId: prompt.entryId,
      value: '',
      direction: prompt.direction,
    })),
    updatedAt: new Date().toISOString(),
  };
}

function promptFor(entry: VocabularyEntry, direction: Direction) {
  return direction === 'es-de' ? entry.spanish : entry.german[0];
}

interface InitialWritingState {
  session?: SavedSession;
  needsSave: boolean;
}

export function WritingMode() {
  const { subjectId, lessonId } = useParams();
  const location = useLocation();
  const { progress, updateEntry, saveSession, clearSession } = useProgress();
  const subject = subjectId ? getSubject(subjectId) : undefined;
  const lesson = lessonId ? getLesson(lessonId) : undefined;
  const belongsToSubject = Boolean(subject && lesson
    && lesson.subjectId === subject.id
    && subject.lessonIds.includes(lesson.id));
  const selection = lesson ? requestedEntries(lesson, location.search) : { entries: [] };
  const lessonIds = new Set(lesson?.entries.map((entry) => entry.id) ?? []);
  const [initial] = useState<InitialWritingState>(() => {
    if (!belongsToSubject || !lesson) return { needsSave: false };
    const saved = progress.sessions[sessionKey(lesson.id, 'writing')];
    if (saved && isUsableSession(saved, lesson.id, lessonIds, selection.requiredIds)) {
      const answers = completeAnswers(saved);
      const hydrated = answers === saved.answers ? saved : { ...saved, answers };
      return { session: hydrated, needsSave: answers.some((answer, index) => answer !== saved.answers[index]) };
    }
    return { session: createWritingSession(lesson.id, selection.entries), needsSave: true };
  });
  const [session, setSession] = useState(initial.session);
  const [completion, setCompletion] = useState<{ correct: number; total: number }>();

  useEffect(() => {
    if (belongsToSubject && initial.needsSave && initial.session) saveSession(initial.session);
  }, [belongsToSubject, initial, saveSession]);

  if (!belongsToSubject || !subject || !lesson || !session) return <MissingContent />;

  const basePath = `/subjects/${subject.id}/lessons/${lesson.id}`;
  const currentId = session.entryIds[session.index];
  const currentEntry = lesson.entries.find((entry) => entry.id === currentId);
  const currentAnswer = session.answers.find((answer) => answer.entryId === currentId);
  if (!currentEntry || !currentAnswer?.direction) return <MissingContent />;
  const currentDirection = currentAnswer.direction;

  const persist = (next: SavedSession) => {
    setSession(next);
    saveSession(next);
  };

  const changeValue = (value: string) => {
    if (currentAnswer.correct !== undefined) return;
    const next = {
      ...session,
      answers: session.answers.map((answer) => (
        answer.entryId === currentId ? { ...answer, value } : answer
      )),
      updatedAt: new Date().toISOString(),
    };
    persist(next);
  };

  const submitAnswer = (event: FormEvent) => {
    event.preventDefault();
    if (currentAnswer.correct !== undefined) return;
    const correct = isCorrectAnswer(currentAnswer.value, currentEntry, currentDirection);
    const next = {
      ...session,
      answers: session.answers.map((answer) => (
        answer.entryId === currentId ? { ...answer, correct } : answer
      )),
      updatedAt: new Date().toISOString(),
    };
    updateEntry(currentEntry.id, correct);
    persist(next);
  };

  const advance = () => {
    if (currentAnswer.correct === undefined) return;
    const nextIndex = session.index + 1;
    if (nextIndex === session.entryIds.length) {
      clearSession(lesson.id, 'writing');
      setCompletion({
        correct: session.answers.filter((answer) => answer.correct).length,
        total: session.entryIds.length,
      });
      return;
    }
    persist({ ...session, index: nextIndex, updatedAt: new Date().toISOString() });
  };

  const restart = () => {
    const next = createWritingSession(lesson.id, selection.entries);
    setCompletion(undefined);
    persist(next);
  };

  if (completion) {
    return (
      <AppLayout>
        <ResultPanel
          correct={completion.correct}
          eyebrow="Schreiben"
          lessonPath={basePath}
          onRestart={restart}
          title="Schreiben abgeschlossen"
          total={completion.total}
        />
      </AppLayout>
    );
  }

  const submitted = currentAnswer.correct !== undefined;
  return (
    <AppLayout>
      <Link className="back-link" to={basePath}>← Zurück zur Lektion</Link>
      <section className="exercise" aria-labelledby="writing-title">
        <p className="eyebrow">Schreiben</p>
        <h1 id="writing-title">Übersetze den Ausdruck</h1>
        <p className="exercise-progress" aria-live="polite">Aufgabe {session.index + 1} von {session.entryIds.length}</p>
        <p className="writing-prompt">{promptFor(currentEntry, currentDirection)}</p>
        <form className="writing-form" onSubmit={submitAnswer}>
          <label htmlFor="writing-answer">Deine Übersetzung</label>
          <input
            autoComplete="off"
            disabled={submitted}
            id="writing-answer"
            onChange={(event) => changeValue(event.target.value)}
            spellCheck={false}
            value={currentAnswer.value}
          />
          {!submitted ? <button type="submit">Prüfen</button> : null}
        </form>
        {submitted ? (
          <div className={currentAnswer.correct ? 'writing-feedback writing-feedback--correct' : 'writing-feedback writing-feedback--wrong'} aria-live="polite">
            <span aria-hidden="true">{currentAnswer.correct ? '✓' : '✕'}</span>
            <p role="status">{currentAnswer.correct ? 'Richtig!' : 'Nicht ganz.'}</p>
            {!currentAnswer.correct ? <p>Richtig wäre: {acceptedAnswers(currentEntry, currentDirection)[0]}</p> : null}
            <button type="button" onClick={advance}>Weiter</button>
          </div>
        ) : null}
      </section>
    </AppLayout>
  );
}
