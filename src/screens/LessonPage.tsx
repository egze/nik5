import { Link, useParams } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { ProgressBar } from '../components/ProgressBar';
import { getLesson, getSubject } from '../content/catalog';
import { useProgress } from '../progress/ProgressProvider';
import { MissingContent } from './NotFoundPage';

const modes = [
  { slug: 'lernen', title: 'Lernen', description: 'Karten ansehen und selbst einschätzen' },
  { slug: 'auswahl', title: 'Multiple Choice', description: 'Die richtige Übersetzung auswählen' },
  { slug: 'schreiben', title: 'Schreiben', description: 'Übersetzungen selbst eingeben' },
  { slug: 'pruefung', title: 'Prüfung', description: 'Alle Wörter ohne direkte Hinweise testen' },
] as const;

export function LessonPage() {
  const { subjectId, lessonId } = useParams();
  const { progress } = useProgress();
  const subject = subjectId ? getSubject(subjectId) : undefined;
  const lesson = lessonId ? getLesson(lessonId) : undefined;
  const belongsToSubject = subject && lesson
    && lesson.subjectId === subject.id
    && subject.lessonIds.includes(lesson.id);

  if (!belongsToSubject || !subject || !lesson) return <MissingContent />;

  const learned = lesson.entries.filter((entry) => progress.entries[entry.id]?.status === 'known').length;
  const wordsLabel = `${lesson.entries.length} Wörter und Wendungen`;
  const basePath = `/subjects/${subject.id}/lessons/${lesson.id}`;

  return (
    <AppLayout>
      <Link className="back-link" to={`/subjects/${subject.id}`}>← Zurück zu {subject.name}</Link>
      <section aria-labelledby="lesson-title">
        <p className="eyebrow">{lesson.subtitle}</p>
        <h1 id="lesson-title">{lesson.title}</h1>
        <p className="page-intro">{wordsLabel}</p>
        <ProgressBar label={`${learned} von ${lesson.entries.length} gelernt`} value={learned} total={lesson.entries.length} />
        <div className="mode-grid" aria-label="Übungsarten">
          {modes.map((mode) => (
            <Link className="mode-card" key={mode.slug} to={`${basePath}/${mode.slug}`}>
              <strong>{mode.title}</strong>
              <span>{mode.description}</span>
              <span className="mode-card__cta">Los geht's →</span>
            </Link>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
