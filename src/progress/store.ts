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

const hasOnlyKeys = (value: Record<string, unknown>, keys: string[]) => (
  Object.keys(value).every((key) => keys.includes(key))
);

const isNonNegativeInteger = (value: unknown): value is number => (
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
);

const isStringArray = (value: unknown): value is string[] => (
  Array.isArray(value) && value.every((item) => typeof item === 'string')
);

const hasText = (value: unknown): value is string => (
  typeof value === 'string' && value.trim().length > 0
);

const hasUniqueText = (values: string[]) => (
  values.every(hasText) && new Set(values).size === values.length
);

const isTimestamp = (value: unknown): value is string => (
  hasText(value) && Number.isFinite(Date.parse(value))
);

const isStudyStatus = (value: unknown): value is StudyStatus => (
  value === 'new' || value === 'known' || value === 'practice'
);

const isExerciseMode = (value: unknown): value is ExerciseMode => (
  value === 'learn' || value === 'multiple-choice' || value === 'writing' || value === 'exam'
);

const isDirection = (value: unknown): value is SavedSession['direction'] => (
  value === 'es-de' || value === 'de-es' || value === 'mixed'
);

const isAnswerDirection = (value: unknown): value is NonNullable<SavedSession['answers'][number]['direction']> => (
  value === 'es-de' || value === 'de-es'
);

const isEntryProgress = (value: unknown): value is EntryProgress => (
  isRecord(value)
  && hasOnlyKeys(value, ['attempts', 'correct', 'status'])
  && isNonNegativeInteger(value.attempts)
  && isNonNegativeInteger(value.correct)
  && value.correct <= value.attempts
  && isStudyStatus(value.status)
);

const isSessionAnswer = (value: unknown): value is SavedSession['answers'][number] => (
  isRecord(value)
  && hasOnlyKeys(value, ['entryId', 'value', 'direction', 'correct'])
  && hasText(value.entryId)
  && typeof value.value === 'string'
  && (value.direction === undefined || isAnswerDirection(value.direction))
  && (value.correct === undefined || typeof value.correct === 'boolean')
);

const isSavedSession = (value: unknown): value is SavedSession => {
  if (!isRecord(value)
    || !hasOnlyKeys(value, ['lessonId', 'mode', 'entryIds', 'index', 'direction', 'answers', 'updatedAt'])
    || !isStringArray(value.entryIds)
    || !Array.isArray(value.answers)
    || !value.answers.every(isSessionAnswer)) return false;

  const entryIds = value.entryIds;
  const answers = value.answers;
  return hasText(value.lessonId)
    && isExerciseMode(value.mode)
    && entryIds.length > 0
    && hasUniqueText(entryIds)
    && isNonNegativeInteger(value.index)
    && value.index < entryIds.length
    && isDirection(value.direction)
    && answers.every((answer) => entryIds.includes(answer.entryId))
    && new Set(answers.map((answer) => answer.entryId)).size === answers.length
    && isTimestamp(value.updatedAt);
};

const isExamAttempt = (value: unknown): value is ExamAttempt => (
  isRecord(value)
  && hasOnlyKeys(value, ['lessonId', 'completedAt', 'percentage', 'missedEntryIds'])
  && hasText(value.lessonId)
  && isTimestamp(value.completedAt)
  && isNonNegativeInteger(value.percentage)
  && value.percentage <= 100
  && isStringArray(value.missedEntryIds)
  && hasUniqueText(value.missedEntryIds)
);

const isProgress = (value: unknown): value is AppProgress => (
  isRecord(value)
  && hasOnlyKeys(value, ['version', 'entries', 'sessions', 'exams'])
  && value.version === 1
  && isRecord(value.entries)
  && isRecord(value.sessions)
  && isRecord(value.exams)
  && Object.entries(value.entries).every(([entryId, progress]) => hasText(entryId) && isEntryProgress(progress))
  && Object.entries(value.sessions).every(([key, session]) => (
    isSavedSession(session) && key === sessionKey(session.lessonId, session.mode)
  ))
  && Object.entries(value.exams).every(([lessonId, attempts]) => (
    hasText(lessonId)
    && Array.isArray(attempts)
    && attempts.every((attempt) => isExamAttempt(attempt) && attempt.lessonId === lessonId)
  ))
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
  status(): ProgressStoreStatus;
  subscribe(listener: () => void): () => void;
  updateEntry(entryId: string, correct: boolean): void;
  setStudyStatus(entryId: string, status: StudyStatus): void;
  saveSession(session: SavedSession): void;
  clearSession(lessonId: string, mode: ExerciseMode): void;
  recordExam(attempt: ExamAttempt): void;
}

export interface ProgressStoreStatus {
  persistence: 'persistent' | 'memory';
  warning?: string;
}

export function sessionKey(lessonId: string, mode: ExerciseMode) {
  return `${lessonId}:${mode}`;
}

const memoryWarning = 'Dein Fortschritt kann in diesem Browser nicht gespeichert werden.';
const recoveryWarning = 'Dein gespeicherter Fortschritt war beschädigt und wurde zurückgesetzt.';

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
  let warning: string | undefined;
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

  const recoverMalformed = (text: string) => {
    warning = recoveryWarning;
    replaceMalformed(text);
    state = emptyProgress();
    persist();
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
            recoverMalformed(persisted);
          }
        } catch {
          recoverMalformed(persisted);
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
    status: () => persistence === 'memory'
      ? { persistence, warning: memoryWarning }
      : warning ? { persistence, warning } : { persistence },
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
