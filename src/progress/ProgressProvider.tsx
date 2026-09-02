import { createContext, useContext, useMemo, useRef, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { createProgressStore } from './store';
import type { AppProgress, ExamAttempt, ExerciseMode, SavedSession, StudyStatus } from './types';
import type { ProgressStore } from './store';

export interface ProgressContextValue {
  progress: AppProgress;
  status: ReturnType<ProgressStore['status']>;
  updateEntry(entryId: string, correct: boolean): void;
  setStudyStatus(entryId: string, status: StudyStatus): void;
  saveSession(session: SavedSession): void;
  clearSession(lessonId: string, mode: ExerciseMode): void;
  recordExam(attempt: ExamAttempt): void;
}

const ProgressContext = createContext<ProgressContextValue | undefined>(undefined);

export interface ProgressProviderProps {
  children: ReactNode;
  store?: ProgressStore;
}

export function ProgressProvider({ children, store }: ProgressProviderProps) {
  const ownedStore = useRef<ProgressStore | undefined>(undefined);
  const progressStore = store ?? (ownedStore.current ??= createProgressStore());
  const progress = useSyncExternalStore(progressStore.subscribe, progressStore.snapshot, progressStore.snapshot);

  const value = useMemo<ProgressContextValue>(() => ({
    progress,
    status: progressStore.status(),
    updateEntry: progressStore.updateEntry,
    setStudyStatus: progressStore.setStudyStatus,
    saveSession: progressStore.saveSession,
    clearSession: progressStore.clearSession,
    recordExam: progressStore.recordExam,
  }), [progress, progressStore]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress muss innerhalb von ProgressProvider verwendet werden');
  }
  return context;
}
