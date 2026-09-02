import type {
  AppProgress,
  EntryProgress,
  ExamAttempt,
  ExerciseMode,
  SavedSession,
  StudyStatus,
} from './types';

export const PROGRESS_KEY = 'lernraum.progress.v1';

const emptyProgress = (): AppProgress => ({ version: 1, entries: {}, sessions: {}, exams: {} });

const clone = <Value>(value: Value): Value => structuredClone(value);

const freeze = <Value>(value: Value): Value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach((child) => freeze(child));
  }
  return value;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isProgress = (value: unknown): value is AppProgress => (
  isRecord(value)
  && value.version === 1
  && isRecord(value.entries)
  && isRecord(value.sessions)
  && isRecord(value.exams)
);

const migrate = (value: unknown): AppProgress | undefined => {
  if (isProgress(value)) return clone(value);

  if (isRecord(value) && value.version === 0 && Array.isArray(value.knownIds)
    && value.knownIds.every((id) => typeof id === 'string')) {
    return {
      version: 1,
      entries: Object.fromEntries(value.knownIds.map((id) => [id, {
        attempts: 0,
        correct: 0,
        status: 'known' as const,
      }])),
      sessions: {},
      exams: {},
    };
  }

  return undefined;
};

export interface ProgressStore {
  snapshot(): AppProgress;
  status(): { persistence: 'persistent' | 'memory'; warning?: string };
  subscribe(listener: () => void): () => void;
  updateEntry(entryId: string, correct: boolean): void;
  setStudyStatus(entryId: string, status: StudyStatus): void;
  saveSession(session: SavedSession): void;
  clearSession(lessonId: string, mode: ExerciseMode): void;
  recordExam(attempt: ExamAttempt): void;
}

export function sessionKey(lessonId: string, mode: ExerciseMode) {
  return `${lessonId}:${mode}`;
}

const memoryWarning = 'Dein Fortschritt kann in diesem Browser nicht gespeichert werden.';

const defaultStorage = (): Storage | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

export function createProgressStore(storage: Storage | undefined = defaultStorage()): ProgressStore {
  let state = emptyProgress();
  let snapshot: AppProgress;
  let persistence: 'persistent' | 'memory' = storage ? 'persistent' : 'memory';
  const listeners = new Set<() => void>();

  const markMemoryOnly = () => {
    persistence = 'memory';
  };

  const persist = () => {
    if (!storage || persistence === 'memory') return;

    try {
      storage.setItem(PROGRESS_KEY, JSON.stringify(state));
    } catch {
      markMemoryOnly();
    }
  };

  const replaceMalformed = (text: string) => {
    if (!storage || persistence === 'memory') return;

    try {
      storage.setItem(`lernraum.progress.corrupt.${Date.now()}`, text);
    } catch {
      markMemoryOnly();
    }
  };

  if (storage) {
    try {
      const persisted = storage.getItem(PROGRESS_KEY);
      if (persisted !== null) {
        try {
          const migrated = migrate(JSON.parse(persisted));
          if (migrated) {
            state = migrated;
            persist();
          } else {
            replaceMalformed(persisted);
            state = emptyProgress();
            persist();
          }
        } catch {
          replaceMalformed(persisted);
          state = emptyProgress();
          persist();
        }
      }
    } catch {
      markMemoryOnly();
    }
  }

  snapshot = freeze(clone(state));

  const mutate = (nextState: AppProgress) => {
    state = nextState;
    snapshot = freeze(clone(state));
    persist();
    listeners.forEach((listener) => listener());
  };

  const entryFor = (entryId: string): EntryProgress => state.entries[entryId] ?? {
    attempts: 0,
    correct: 0,
    status: 'new',
  };

  return {
    snapshot: () => snapshot,
    status: () => persistence === 'persistent'
      ? { persistence }
      : { persistence, warning: memoryWarning },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    updateEntry: (entryId, correct) => {
      const current = entryFor(entryId);
      mutate({
        ...state,
        entries: {
          ...state.entries,
          [entryId]: {
            ...current,
            attempts: current.attempts + 1,
            correct: current.correct + (correct ? 1 : 0),
          },
        },
      });
    },
    setStudyStatus: (entryId, status) => {
      mutate({
        ...state,
        entries: { ...state.entries, [entryId]: { ...entryFor(entryId), status } },
      });
    },
    saveSession: (session) => {
      const saved = clone(session);
      mutate({
        ...state,
        sessions: { ...state.sessions, [sessionKey(saved.lessonId, saved.mode)]: saved },
      });
    },
    clearSession: (lessonId, mode) => {
      const key = sessionKey(lessonId, mode);
      const { [key]: _cleared, ...sessions } = state.sessions;
      mutate({ ...state, sessions });
    },
    recordExam: (attempt) => {
      const saved = clone(attempt);
      mutate({
        ...state,
        exams: { ...state.exams, [saved.lessonId]: [...(state.exams[saved.lessonId] ?? []), saved] },
      });
    },
  };
}
