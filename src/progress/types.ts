export type StudyStatus = 'new' | 'known' | 'practice';
export type ExerciseMode = 'learn' | 'multiple-choice' | 'writing' | 'exam';

export interface EntryProgress {
  attempts: number;
  correct: number;
  status: StudyStatus;
}

export interface SessionAnswer {
  entryId: string;
  value: string;
  direction?: 'es-de' | 'de-es';
  correct?: boolean;
}

export interface SavedSession {
  lessonId: string;
  mode: ExerciseMode;
  entryIds: string[];
  index: number;
  direction: 'es-de' | 'de-es' | 'mixed';
  answers: SessionAnswer[];
  updatedAt: string;
}

export interface ExamAttempt {
  lessonId: string;
  completedAt: string;
  percentage: number;
  missedEntryIds: string[];
}

export interface AppProgress {
  version: 1;
  entries: Record<string, EntryProgress>;
  sessions: Record<string, SavedSession>;
  exams: Record<string, ExamAttempt[]>;
}
