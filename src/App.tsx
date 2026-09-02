import { HashRouter, Route, Routes } from 'react-router-dom';
import { PinGate } from './auth/PinGate';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HomePage } from './screens/HomePage';
import { LessonPage } from './screens/LessonPage';
import { NotFoundPage } from './screens/NotFoundPage';
import { SubjectPage } from './screens/SubjectPage';
import { LearnMode } from './screens/exercises/LearnMode';
import { MultipleChoiceMode } from './screens/exercises/MultipleChoiceMode';
import { ProgressProvider } from './progress/ProgressProvider';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/subjects/:subjectId" element={<SubjectPage />} />
      <Route path="/subjects/:subjectId/lessons/:lessonId" element={<LessonPage />} />
      <Route path="/subjects/:subjectId/lessons/:lessonId/lernen" element={<LearnMode />} />
      <Route path="/subjects/:subjectId/lessons/:lessonId/auswahl" element={<MultipleChoiceMode />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <PinGate>
        <ProgressProvider>
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </ProgressProvider>
      </PinGate>
    </ErrorBoundary>
  );
}
