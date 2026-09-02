import { describe, expect, it } from 'vitest';
import {
  PROGRESS_KEY,
  createProgressStore,
  sessionKey,
} from './store';
import type { SavedSession } from './types';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const savedSession: SavedSession = {
  lessonId: 'spanish-01',
  mode: 'writing',
  entryIds: ['hola', 'adios'],
  index: 1,
  direction: 'mixed',
  answers: [{ entryId: 'hola', value: 'Hallo', direction: 'es-de', correct: true }],
  updatedAt: '2026-09-02T08:00:00.000Z',
};

const expectMalformedDocumentReset = (document: unknown) => {
  const storage = new MemoryStorage();
  const persisted = JSON.stringify(document);
  storage.setItem(PROGRESS_KEY, persisted);

  expect(createProgressStore(storage).snapshot()).toEqual({ version: 1, entries: {}, sessions: {}, exams: {} });
  const backupKey = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .find((key) => key?.startsWith('lernraum.progress.corrupt.'));
  expect(backupKey).toMatch(/^lernraum\.progress\.corrupt\.\d+$/);
  expect(storage.getItem(backupKey!)).toBe(persisted);
};

describe('progress store', () => {
  it('starts with an empty version-one document', () => {
    const store = createProgressStore(new MemoryStorage());

    expect(store.snapshot()).toEqual({ version: 1, entries: {}, sessions: {}, exams: {} });
    expect(store.status()).toEqual({ persistence: 'persistent' });
  });

  it('records attempts and correct answers for an entry', () => {
    const store = createProgressStore(new MemoryStorage());

    store.updateEntry('hola', true);
    store.updateEntry('hola', false);

    expect(store.snapshot().entries.hola).toEqual({ attempts: 2, correct: 1, status: 'new' });
  });

  it('keeps snapshots and mutation inputs isolated from later changes', () => {
    const store = createProgressStore(new MemoryStorage());
    const session = structuredClone(savedSession);
    store.saveSession(session);
    const firstSnapshot = store.snapshot();

    expect(() => {
      firstSnapshot.sessions[sessionKey('spanish-01', 'writing')]!.answers[0]!.value = 'changed';
    }).toThrow(TypeError);
    session.answers[0]!.value = 'also changed';

    expect(store.snapshot().sessions[sessionKey('spanish-01', 'writing')]!.answers[0]!.value).toBe('Hallo');
  });

  it('round-trips, keys, and clears saved sessions by lesson and mode', () => {
    const storage = new MemoryStorage();
    const store = createProgressStore(storage);
    store.saveSession(savedSession);

    expect(JSON.parse(storage.getItem(PROGRESS_KEY) ?? '')).toMatchObject({
      sessions: { 'spanish-01:writing': savedSession },
    });
    expect(createProgressStore(storage).snapshot().sessions[sessionKey('spanish-01', 'writing')]).toEqual(savedSession);

    store.clearSession('spanish-01', 'writing');
    expect(store.snapshot().sessions).toEqual({});
  });

  it('preserves exam attempts as lesson history', () => {
    const store = createProgressStore(new MemoryStorage());
    const first = {
      lessonId: 'spanish-01', completedAt: '2026-09-02T08:00:00.000Z', percentage: 75, missedEntryIds: ['adios'],
    };
    const second = {
      lessonId: 'spanish-01', completedAt: '2026-09-02T09:00:00.000Z', percentage: 100, missedEntryIds: [],
    };

    store.recordExam(first);
    store.recordExam(second);

    expect(store.snapshot().exams['spanish-01']).toEqual([first, second]);
  });

  it('migrates version-zero known ids to version-one entry progress', () => {
    const storage = new MemoryStorage();
    storage.setItem(PROGRESS_KEY, JSON.stringify({ version: 0, knownIds: ['hola'] }));

    expect(createProgressStore(storage).snapshot()).toEqual({
      version: 1,
      entries: { hola: { attempts: 0, correct: 0, status: 'known' } },
      sessions: {},
      exams: {},
    });
  });

  it('backs up malformed persisted JSON and starts a fresh document', () => {
    const storage = new MemoryStorage();
    storage.setItem(PROGRESS_KEY, '{not valid json');

    const store = createProgressStore(storage);
    const backupKey = storage.key(0) === PROGRESS_KEY ? storage.key(1) : storage.key(0);

    expect(store.snapshot()).toEqual({ version: 1, entries: {}, sessions: {}, exams: {} });
    expect(backupKey).toMatch(/^lernraum\.progress\.corrupt\.\d+$/);
    expect(storage.getItem(backupKey!)).toBe('{not valid json');
    expect(storage.getItem(PROGRESS_KEY)).toBe(JSON.stringify(store.snapshot()));
  });

  it('backs up and resets a version-one document with malformed entry progress', () => {
    expectMalformedDocumentReset({
      version: 1,
      entries: { hola: { attempts: 'one', correct: 0, status: 'new' } },
      sessions: {},
      exams: {},
    });
  });

  it('backs up and resets a version-one document with a malformed saved session', () => {
    expectMalformedDocumentReset({
      version: 1,
      entries: {},
      sessions: {
        'spanish-01:writing': {
          lessonId: 'spanish-01',
          mode: 'writing',
          entryIds: ['hola'],
          index: 'first',
          direction: 'mixed',
          answers: [],
          updatedAt: '2026-09-02T08:00:00.000Z',
        },
      },
      exams: {},
    });
  });

  it('backs up and resets a version-one document with malformed exam history', () => {
    expectMalformedDocumentReset({
      version: 1,
      entries: {},
      sessions: {},
      exams: { 'spanish-01': {} },
    });
  });

  it('notifies a subscriber once for each mutation and stops after unsubscribe', () => {
    const store = createProgressStore(new MemoryStorage());
    let notifications = 0;
    const unsubscribe = store.subscribe(() => { notifications += 1; });

    store.setStudyStatus('hola', 'practice');
    unsubscribe();
    store.updateEntry('hola', true);

    expect(notifications).toBe(1);
  });

  it('falls back to memory when persistent writes fail', () => {
    const broken = new MemoryStorage();
    broken.setItem = () => { throw new DOMException('blocked'); };
    const store = createProgressStore(broken);
    store.updateEntry('hola', true);

    expect(store.snapshot().entries.hola?.correct).toBe(1);
    expect(store.status().persistence).toBe('memory');
  });
});
