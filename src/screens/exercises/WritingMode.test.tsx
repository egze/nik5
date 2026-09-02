import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { spanish01 } from '../../content/lessons/spanish-01';
import { ProgressProvider } from '../../progress/ProgressProvider';
import { createProgressStore } from '../../progress/store';
import type { SavedSession } from '../../progress/types';
import { WritingMode } from './WritingMode';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const savedWritingSession = (overrides: Partial<SavedSession> = {}): SavedSession => ({
  lessonId: 'spanish-01',
  mode: 'writing',
  entryIds: ['hola'],
  index: 0,
  direction: 'mixed',
  answers: [{ entryId: 'hola', value: '', direction: 'es-de' }],
  updatedAt: '2026-09-02T08:00:00.000Z',
  ...overrides,
});

function renderWritingMode(
  store = createProgressStore(new MemoryStorage()),
  path = '/subjects/spanish/lessons/spanish-01/schreiben',
) {
  return {
    store,
    ...render(
      <ProgressProvider store={store}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/subjects/:subjectId/lessons/:lessonId/schreiben" element={<WritingMode />} />
          </Routes>
        </MemoryRouter>
      </ProgressProvider>,
    ),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('WritingMode', () => {
  it('creates and persists one mixed-direction prompt for every lesson entry', async () => {
    let randomCall = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => (randomCall++ % 2 === 0 ? 0.1 : 0.9));
    const { store } = renderWritingMode();

    await waitFor(() => expect(store.snapshot().sessions['spanish-01:writing']).toBeDefined());
    const session = store.snapshot().sessions['spanish-01:writing']!;

    expect(session.entryIds).toHaveLength(spanish01.entries.length);
    expect(new Set(session.entryIds)).toEqual(new Set(spanish01.entries.map((entry) => entry.id)));
    expect(session.answers).toHaveLength(spanish01.entries.length);
    expect(session.answers.map((answer) => answer.entryId)).toEqual(session.entryIds);
    expect(new Set(session.answers.map((answer) => answer.direction))).toEqual(new Set(['es-de', 'de-es']));
  });

  it('submits from the form, accepts case and spacing, and records the attempt only once', async () => {
    const user = userEvent.setup();
    const store = createProgressStore(new MemoryStorage());
    store.saveSession(savedWritingSession());
    renderWritingMode(store);

    const input = screen.getByLabelText('Deine Übersetzung');
    await user.type(input, '  HALLO  {Enter}');

    expect(screen.getByRole('status')).toHaveTextContent('Richtig!');
    expect(input).toHaveValue('  HALLO  ');
    expect(input).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeInTheDocument();
    expect(store.snapshot().entries.hola).toMatchObject({ attempts: 1, correct: 1 });

    fireEvent.submit(input.closest('form')!);
    expect(store.snapshot().entries.hola).toMatchObject({ attempts: 1, correct: 1 });
  });

  it('accepts a stored synonym', async () => {
    const user = userEvent.setup();
    const store = createProgressStore(new MemoryStorage());
    store.saveSession(savedWritingSession({
      entryIds: ['se-dice'],
      answers: [{ entryId: 'se-dice', value: '', direction: 'es-de' }],
    }));
    renderWritingMode(store);

    await user.type(screen.getByLabelText('Deine Übersetzung'), 'heißt ...');
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));

    expect(screen.getByRole('status')).toHaveTextContent('Richtig!');
  });

  it('rejects a missing Spanish accent and shows the accepted answer until Weiter', async () => {
    const user = userEvent.setup();
    const store = createProgressStore(new MemoryStorage());
    store.saveSession(savedWritingSession({
      entryIds: ['buenos-dias'],
      answers: [{ entryId: 'buenos-dias', value: '', direction: 'de-es' }],
    }));
    renderWritingMode(store);

    const input = screen.getByLabelText('Deine Übersetzung');
    await user.type(input, 'Buenos dias');
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));

    expect(screen.getByRole('status')).toHaveTextContent('Nicht ganz.');
    expect(screen.getByText('Richtig wäre: ¡Buenos días!')).toBeInTheDocument();
    expect(input).toHaveValue('Buenos dias');
    expect(input).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeInTheDocument();
  });

  it('resumes the exact saved index, direction, value, and submitted feedback', () => {
    const store = createProgressStore(new MemoryStorage());
    store.saveSession(savedWritingSession({
      entryIds: ['hola', 'el-dia'],
      index: 1,
      answers: [
        { entryId: 'hola', value: 'Hallo', direction: 'es-de', correct: true },
        { entryId: 'el-dia', value: 'el dia', direction: 'de-es', correct: false },
      ],
    }));
    renderWritingMode(store);

    expect(screen.getByText('Aufgabe 2 von 2')).toBeInTheDocument();
    expect(screen.getByText('der Tag')).toBeInTheDocument();
    expect(screen.getByLabelText('Deine Übersetzung')).toHaveValue('el dia');
    expect(screen.getByLabelText('Deine Übersetzung')).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Nicht ganz.');
    expect(store.snapshot().entries['el-dia']).toBeUndefined();
  });

  it('clears the completed session and shows a shared result summary', async () => {
    const user = userEvent.setup();
    const store = createProgressStore(new MemoryStorage());
    store.saveSession(savedWritingSession());
    renderWritingMode(store);

    await user.type(screen.getByLabelText('Deine Übersetzung'), 'Hallo');
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    await user.click(screen.getByRole('button', { name: 'Weiter' }));

    expect(screen.getByRole('heading', { name: 'Schreiben abgeschlossen' })).toBeInTheDocument();
    expect(screen.getByText('1 von 1 richtig (100 %)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Zur Lektion' })).toBeInTheDocument();
    expect(store.snapshot().sessions['spanish-01:writing']).toBeUndefined();
  });

  it('uses only unique validated retry ids from the query', async () => {
    const { store } = renderWritingMode(
      createProgressStore(new MemoryStorage()),
      '/subjects/spanish/lessons/spanish-01/schreiben?entries=hola,el-dia,hola',
    );

    await waitFor(() => expect(store.snapshot().sessions['spanish-01:writing']).toBeDefined());

    expect(store.snapshot().sessions['spanish-01:writing']?.entryIds).toEqual(expect.arrayContaining(['hola', 'el-dia']));
    expect(store.snapshot().sessions['spanish-01:writing']?.entryIds).toHaveLength(2);
  });

  it.each([
    '/subjects/spanish/lessons/spanish-01/schreiben?entries=',
    '/subjects/spanish/lessons/spanish-01/schreiben?entries=unbekannt',
    '/subjects/spanish/lessons/spanish-01/schreiben?entries=hola,unbekannt',
    '/subjects/spanish/lessons/spanish-01/schreiben?entries=hola,',
  ])('falls back to every entry for an invalid or empty retry subset: %s', async (path) => {
    const { store } = renderWritingMode(createProgressStore(new MemoryStorage()), path);

    await waitFor(() => expect(store.snapshot().sessions['spanish-01:writing']).toBeDefined());

    expect(store.snapshot().sessions['spanish-01:writing']?.entryIds).toHaveLength(spanish01.entries.length);
  });
});
