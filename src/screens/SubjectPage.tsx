import { Link, useParams } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { ProgressBar } from '../components/ProgressBar';
import { getLesson, getSubject } from '../content/catalog';
import type { Lesson } from '../content/types';
import { useProgress } from '../progress/ProgressProvider';
import { MissingContent } from './NotFoundPage';

function lessonList(subjectId: string, lessonIds: string[]): Lesson[] {
  return lessonIds.flatMap((lessonId) => {
    const lesson = getLesson(lessonId);
    return lesson?.subjectId === subjectId ? [lesson] : [];
  });
}

export function SubjectPage() {
  const { subjectId } = useParams();
  const { progress } = useProgress();
  const subject = subjectId ? getSubject(subjectId) : undefined;

  if (!subject) return <MissingContent />;

  const subjectLessons = lessonList(subject.id, subject.lessonIds);

  return (
    <AppLayout>
      <Link className="back-link" to="/">← Zurück zu den Fächern</Link>
      <section aria-labelledby="subject-title">
        <p className="eyebrow">Fach</p>
        <h1 id="subject-title">{subject.name}</h1>
        <p className="page-intro">{subject.description}</p>
        <div className="lesson-grid">
          {subjectLessons.map((lesson, index) => {
            const learned = lesson.entries.filter((entry) => progress.entries[entry.id]?.status === 'known').length;
            const bestExam = Math.max(...(progress.exams[lesson.id] ?? []).map((attempt) => attempt.percentage));

            return (
              <Link className="lesson-card" key={lesson.id} to={`/subjects/${subject.id}/lessons/${lesson.id}`}>
                <span className="lesson-card__number" aria-hidden="true">{index + 1}</span>
                <div className="lesson-card__content">
                  <strong>{lesson.subtitle}</strong>
                  <span>{lesson.title}</span>
                  <ProgressBar
                    label={`${learned} von ${lesson.entries.length} gelernt`}
                    value={learned}
                    total={lesson.entries.length}
                  />
                  <span className="exam-result">
                    {Number.isFinite(bestExam) ? `Beste Prüfung: ${bestExam} %` : 'Noch keine Prüfung abgelegt'}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </AppLayout>
  );
}
