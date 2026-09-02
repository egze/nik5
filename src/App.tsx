import { HashRouter, Route, Routes } from 'react-router-dom';
import { PinGate } from './auth/PinGate';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HomePage } from './screens/HomePage';
import { LessonPage } from './screens/LessonPage';
import { NotFoundPage } from './screens/NotFoundPage';
import { SubjectPage } from './screens/SubjectPage';
import { ProgressProvider } from './progress/ProgressProvider';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/subjects/:subjectId" element={<SubjectPage />} />
      <Route path="/subjects/:subjectId/lessons/:lessonId" element={<LessonPage />} />
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
