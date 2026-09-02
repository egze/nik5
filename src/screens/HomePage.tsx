import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { ProgressBar } from '../components/ProgressBar';
import { lessons, subjects } from '../content/catalog';
import { useProgress } from '../progress/ProgressProvider';

function learnedCount(entryIds: string[], entries: ReturnType<typeof useProgress>['progress']['entries']) {
  return entryIds.filter((entryId) => entries[entryId]?.status === 'known').length;
}

function attemptCount(entryIds: string[], entries: ReturnType<typeof useProgress>['progress']['entries']) {
  return entryIds.reduce((total, entryId) => total + (entries[entryId]?.attempts ?? 0), 0);
}

function attemptLabel(attempts: number) {
  return `${attempts} ${attempts === 1 ? 'Übungsversuch' : 'Übungsversuche'}`;
}

export function HomePage() {
  const { progress } = useProgress();

  return (
    <AppLayout>
      <section aria-labelledby="subjects-title">
        <p className="eyebrow">Fächer</p>
        <h1 id="subjects-title">Was möchtest du heute üben?</h1>
        <div className="subject-grid">
          {subjects.map((subject) => {
            const entryIds = lessons
              .filter((lesson) => lesson.subjectId === subject.id)
              .flatMap((lesson) => lesson.entries.map((entry) => entry.id));
            const learned = learnedCount(entryIds, progress.entries);
            const attempts = attemptCount(entryIds, progress.entries);

            return (
              <Link
                className="subject-card"
                key={subject.id}
                style={{ '--subject-accent': subject.accent } as CSSProperties}
                to={`/subjects/${subject.id}`}
              >
                <span className="subject-card__icon" aria-hidden="true">{subject.icon}</span>
                <div className="subject-card__content">
                  <strong>{subject.name}</strong>
                  <span>{subject.description}</span>
                  <ProgressBar label={`${learned} von ${entryIds.length} gelernt`} value={learned} total={entryIds.length} />
                  {attempts > 0 && <span className="practice-summary">{attemptLabel(attempts)}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </AppLayout>
  );
}
