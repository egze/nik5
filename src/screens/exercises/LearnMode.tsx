import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DirectionPicker } from '../../components/DirectionPicker';
import { AppLayout } from '../../components/AppLayout';
import { getLesson, getSubject } from '../../content/catalog';
import type { VocabularyEntry } from '../../content/types';
import type { Direction } from '../../exercises/engine';
import { useProgress } from '../../progress/ProgressProvider';
import { sessionKey } from '../../progress/store';
import type { SavedSession, StudyStatus } from '../../progress/types';
import { MissingContent } from '../NotFoundPage';

const shuffle = <Value,>(values: Value[]): Value[] => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const choice = Math.floor(Math.random() * (index + 1));
    [result[index], result[choice]] = [result[choice]!, result[index]!];
  }
  return result;
};

function answerFor(entry: VocabularyEntry, direction: Direction) {
  return direction === 'es-de' ? entry.german[0] : entry.spanish;
}

function promptFor(entry: VocabularyEntry, direction: Direction) {
  return direction === 'es-de' ? entry.spanish : entry.german[0];
}

function validSession(session: SavedSession | undefined, lessonId: string, entryIds: Set<string>): session is SavedSession {
  return Boolean(session
    && session.lessonId === lessonId
    && session.mode === 'learn'
    && (session.direction === 'es-de' || session.direction === 'de-es')
    && session.index >= 0
    && session.index < session.entryIds.length
    && session.entryIds.length > 0
    && session.entryIds.every((entryId) => entryIds.has(entryId)));
}

export function LearnMode() {
  const { subjectId, lessonId } = useParams();
  const { progress, setStudyStatus, saveSession, clearSession } = useProgress();
  const subject = subjectId ? getSubject(subjectId) : undefined;
  const lesson = lessonId ? getLesson(lessonId) : undefined;
  const belongsToSubject = subject && lesson
    && lesson.subjectId === subject.id
    && subject.lessonIds.includes(lesson.id);
  const [revealed, setRevealed] = useState(false);
  const [completion, setCompletion] = useState<{ known: number; practice: number; direction: Direction }>();

  if (!belongsToSubject || !subject || !lesson) return <MissingContent />;

  const entryIds = new Set(lesson.entries.map((entry) => entry.id));
  const saved = progress.sessions[sessionKey(lesson.id, 'learn')];
  const session = validSession(saved, lesson.id, entryIds) ? saved : undefined;
  const currentEntry = session ? lesson.entries.find((entry) => entry.id === session.entryIds[session.index]) : undefined;
  const basePath = `/subjects/${subject.id}/lessons/${lesson.id}`;

  const start = (direction: Direction) => {
    const practice = lesson.entries.filter((entry) => progress.entries[entry.id]?.status === 'practice');
    const remainder = lesson.entries.filter((entry) => progress.entries[entry.id]?.status !== 'practice');
    saveSession({
      lessonId: lesson.id,
      mode: 'learn',
      entryIds: [...shuffle(practice), ...shuffle(remainder)].map((entry) => entry.id),
      index: 0,
      direction,
      answers: [],
      updatedAt: new Date().toISOString(),
    });
    setCompletion(undefined);
    setRevealed(false);
  };

  const rate = (status: StudyStatus) => {
    if (!session || !currentEntry || !revealed || (status !== 'known' && status !== 'practice')) return;
    setStudyStatus(currentEntry.id, status);
    const nextIndex = session.index + 1;
    if (nextIndex === session.entryIds.length) {
      const statuses = session.entryIds.map((entryId) => (
        entryId === currentEntry.id ? status : progress.entries[entryId]?.status ?? 'new'
      ));
      clearSession(lesson.id, 'learn');
      setCompletion({
        known: statuses.filter((value) => value === 'known').length,
        practice: statuses.filter((value) => value === 'practice').length,
        direction: session.direction as Direction,
      });
    } else {
      saveSession({ ...session, index: nextIndex, updatedAt: new Date().toISOString() });
    }
    setRevealed(false);
  };

  if (completion) {
    return (
      <AppLayout>
        <section className="exercise-summary" aria-labelledby="learn-complete-title">
          <p className="eyebrow">Lernen</p>
          <h1 id="learn-complete-title">Karten abgeschlossen</h1>
          <p>{completion.known} kannst du, {completion.practice} übst du weiter.</p>
          <div className="exercise-actions">
            <button type="button" onClick={() => start(completion.direction)}>Noch einmal</button>
            <Link className="button-link button-link--secondary" to={basePath}>Zur Lektion</Link>
          </div>
        </section>
      </AppLayout>
    );
  }

  if (!session || !currentEntry) {
    return <AppLayout><DirectionPicker onSelect={start} /></AppLayout>;
  }

  const direction = session.direction as Direction;
  return (
    <AppLayout>
      <Link className="back-link" to={basePath}>← Zurück zur Lektion</Link>
      <section className="exercise" aria-labelledby="learn-title">
        <p className="eyebrow">Lernen</p>
        <h1 id="learn-title">Lernen</h1>
        <p className="exercise-progress" aria-live="polite">Karte {session.index + 1} von {session.entryIds.length}</p>
        <button
          className="flashcard"
          type="button"
          aria-label={revealed ? 'Antwort verbergen' : 'Antwort zeigen'}
          onClick={() => setRevealed((value) => !value)}
        >
          <span className="flashcard__prompt">{promptFor(currentEntry, direction)}</span>
          {revealed ? (
            <span className="flashcard__answer">
              {answerFor(currentEntry, direction)}
              {currentEntry.example && <small>{currentEntry.example.spanish}\n{currentEntry.example.german}</small>}
            </span>
          ) : <span className="flashcard__hint">Antwort zeigen</span>}
        </button>
        {revealed && (
          <div className="rating-actions" aria-label="Karte bewerten">
            <button type="button" onClick={() => rate('practice')}>Noch üben</button>
            <button type="button" onClick={() => rate('known')}>Kann ich</button>
          </div>
        )}
      </section>
    </AppLayout>
  );
}
