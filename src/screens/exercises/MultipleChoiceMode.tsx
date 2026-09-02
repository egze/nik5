import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DirectionPicker } from '../../components/DirectionPicker';
import { AppLayout } from '../../components/AppLayout';
import { getLesson, getSubject } from '../../content/catalog';
import { createMultipleChoice, type Direction } from '../../exercises/engine';
import { normalizeAnswer } from '../../exercises/answers';
import { useProgress } from '../../progress/ProgressProvider';
import { sessionKey } from '../../progress/store';
import type { SavedSession } from '../../progress/types';
import { MissingContent } from '../NotFoundPage';

const shuffle = <Value,>(values: Value[]): Value[] => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const choice = Math.floor(Math.random() * (index + 1));
    [result[index], result[choice]] = [result[choice]!, result[index]!];
  }
  return result;
};

function validSession(session: SavedSession | undefined, lessonId: string, entryIds: Set<string>): session is SavedSession {
  return Boolean(session
    && session.lessonId === lessonId
    && session.mode === 'multiple-choice'
    && (session.direction === 'es-de' || session.direction === 'de-es')
    && session.index >= 0
    && session.index < session.entryIds.length
    && session.entryIds.length > 0
    && session.entryIds.every((entryId) => entryIds.has(entryId)));
}

export function MultipleChoiceMode() {
  const { subjectId, lessonId } = useParams();
  const { progress, updateEntry, saveSession, clearSession } = useProgress();
  const subject = subjectId ? getSubject(subjectId) : undefined;
  const lesson = lessonId ? getLesson(lessonId) : undefined;
  const belongsToSubject = subject && lesson
    && lesson.subjectId === subject.id
    && subject.lessonIds.includes(lesson.id);
  const [selected, setSelected] = useState<string | null>(null);
  const [completion, setCompletion] = useState<{ correct: number; total: number; direction: Direction }>();
  const entries = lesson?.entries ?? [];
  const entryIds = new Set(entries.map((entry) => entry.id));
  const saved = lesson ? progress.sessions[sessionKey(lesson.id, 'multiple-choice')] : undefined;
  const session = lesson && validSession(saved, lesson.id, entryIds) ? saved : undefined;
  const currentId = session?.entryIds[session.index];
  const question = useMemo(() => (
    session && currentId
      ? createMultipleChoice(entries, currentId, session.direction as Direction)
      : undefined
  ), [currentId, entries, session?.direction]);
  const savedAnswer = session && currentId
    ? [...session.answers].reverse().find((answer) => answer.entryId === currentId)
    : undefined;
  const selectedValue = selected ?? savedAnswer?.value ?? null;

  if (!belongsToSubject || !subject || !lesson) return <MissingContent />;

  const basePath = `/subjects/${subject.id}/lessons/${lesson.id}`;

  const start = (direction: Direction) => {
    saveSession({
      lessonId: lesson.id,
      mode: 'multiple-choice',
      entryIds: shuffle(lesson.entries).map((entry) => entry.id),
      index: 0,
      direction,
      answers: [],
      updatedAt: new Date().toISOString(),
    });
    setCompletion(undefined);
    setSelected(null);
  };

  const choose = (value: string) => {
    if (!session || !question || selectedValue !== null) return;
    const correct = question.answers.some((answer) => normalizeAnswer(answer) === normalizeAnswer(value));
    setSelected(value);
    updateEntry(question.entryId, correct);
    saveSession({
      ...session,
      answers: [...session.answers, {
        entryId: question.entryId,
        value,
        direction: question.direction,
        correct,
      }],
      updatedAt: new Date().toISOString(),
    });
  };

  const advance = () => {
    if (!session || selectedValue === null) return;
    const nextIndex = session.index + 1;
    if (nextIndex === session.entryIds.length) {
      const correct = session.answers.filter((answer) => answer.correct).length;
      clearSession(lesson.id, 'multiple-choice');
      setCompletion({ correct, total: session.entryIds.length, direction: session.direction as Direction });
    } else {
      saveSession({ ...session, index: nextIndex, updatedAt: new Date().toISOString() });
    }
    setSelected(null);
  };

  if (completion) {
    const percentage = completion.total === 0 ? 0 : Math.round(completion.correct / completion.total * 100);
    return (
      <AppLayout>
        <section className="exercise-summary" aria-labelledby="choice-complete-title">
          <p className="eyebrow">Multiple Choice</p>
          <h1 id="choice-complete-title">Auswahl abgeschlossen</h1>
          <p>{completion.correct} von {completion.total} richtig ({percentage} %)</p>
          <div className="exercise-actions">
            <button type="button" onClick={() => start(completion.direction)}>Noch einmal</button>
            <Link className="button-link button-link--secondary" to={basePath}>Zur Lektion</Link>
          </div>
        </section>
      </AppLayout>
    );
  }

  if (!session || !question) {
    return <AppLayout><DirectionPicker onSelect={start} /></AppLayout>;
  }

  const isCorrect = selectedValue !== null && question.answers.some((answer) => (
    normalizeAnswer(answer) === normalizeAnswer(selectedValue)
  ));
  return (
    <AppLayout>
      <Link className="back-link" to={basePath}>← Zurück zur Lektion</Link>
      <section className="exercise" aria-labelledby="choice-title">
        <p className="eyebrow">Multiple Choice</p>
        <h1 id="choice-title">Welche Übersetzung passt?</h1>
        <p className="exercise-progress" aria-live="polite">Frage {session.index + 1} von {session.entryIds.length}</p>
        <p className="choice-prompt">{question.prompt}</p>
        <div className="choice-options" aria-label="Antwortmöglichkeiten">
          {question.options.map((option) => (
            <button
              data-choice="true"
              disabled={selectedValue !== null}
              key={option}
              type="button"
              onClick={() => choose(option)}
            >
              {option}
            </button>
          ))}
        </div>
        {selectedValue !== null && (
          <div className={`choice-feedback ${isCorrect ? 'choice-feedback--correct' : 'choice-feedback--wrong'}`} aria-live="polite">
            <p role="status">{isCorrect ? 'Richtig!' : 'Nicht ganz.'}</p>
            <p>Die richtige Übersetzung ist: {question.answers[0]}</p>
            <button type="button" onClick={advance}>Weiter</button>
          </div>
        )}
      </section>
    </AppLayout>
  );
}
