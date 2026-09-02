import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { spanish01 } from '../../content/lessons/spanish-01';
import { acceptedAnswers } from '../../exercises/answers';
import { ProgressProvider } from '../../progress/ProgressProvider';
import { createProgressStore } from '../../progress/store';
import type { SavedSession } from '../../progress/types';
import { ExamMode } from './ExamMode';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function fullExamSession(overrides: Partial<SavedSession> = {}): SavedSession {
  const entryIds = spanish01.entries.map((entry) => entry.id);
  return {
    lessonId: 'spanish-01',
    mode: 'exam',
    entryIds,
    index: 0,
    direction: 'mixed',
    answers: entryIds.map((entryId) => ({ entryId, value: '', direction: 'es-de' })),
    updatedAt: '2026-09-02T08:00:00.000Z',
    ...overrides,
  };
}

function renderExamMode(store = createProgressStore(new MemoryStorage())) {
  return {
    store,
    ...render(
      <ProgressProvider store={store}>
        <MemoryRouter initialEntries={['/subjects/spanish/lessons/spanish-01/pruefung']}>
          <Routes>
            <Route path="/subjects/:subjectId/lessons/:lessonId/pruefung" element={<ExamMode />} />
          </Routes>
        </MemoryRouter>
      </ProgressProvider>,
    ),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ExamMode', () => {
  it('creates and persists every entry exactly once with its generated direction', async () => {
    let randomCall = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => (randomCall++ % 2 === 0 ? 0.1 : 0.9));
    const { store, unmount } = renderExamMode();

    await waitFor(() => expect(store.snapshot().sessions['spanish-01:exam']).toBeDefined());
    const first = store.snapshot().sessions['spanish-01:exam']!;
    expect(first.entryIds).toHaveLength(spanish01.entries.length);
    expect(new Set(first.entryIds)).toEqual(new Set(spanish01.entries.map((entry) => entry.id)));
    expect(first.answers.map((answer) => answer.entryId)).toEqual(first.entryIds);
    expect(first.answers.every((answer) => answer.direction === 'es-de' || answer.direction === 'de-es')).toBe(true);
    expect(screen.getByText('Aufgabe 1 von 38')).toBeInTheDocument();

    unmount();
    renderExamMode(store);
    expect(store.snapshot().sessions['spanish-01:exam']).toEqual(first);
  });

  it('withholds correctness and preserves values across forward and back navigation', async () => {
    const user = userEvent.setup();
    const store = createProgressStore(new MemoryStorage());
    const session = fullExamSession({
      entryIds: ['hola', 'el-dia', ...spanish01.entries.map((entry) => entry.id).filter((id) => id !== 'hola' && id !== 'el-dia')],
    });
    session.answers = session.entryIds.map((entryId, index) => ({
      entryId,
      value: '',
      direction: index === 1 ? 'de-es' : 'es-de',
    }));
    store.saveSession(session);
    renderExamMode(store);

    await user.type(screen.getByLabelText('Deine Übersetzung'), 'Hallo!');
    await user.click(screen.getByRole('button', { name: 'Nächste Aufgabe' }));

    expect(screen.queryByText('Richtig!')).not.toBeInTheDocument();
    expect(screen.queryByText('Nicht ganz.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Deine Übersetzung')).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Vorherige Aufgabe' }));
    expect(screen.getByLabelText('Deine Übersetzung')).toHaveValue('Hallo!');
    expect(store.snapshot().sessions['spanish-01:exam']?.answers[0]).toMatchObject({
      entryId: 'hola', value: 'Hallo!', direction: 'es-de',
    });
  });

  it('does not submit or reveal results when confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const store = createProgressStore(new MemoryStorage());
    store.saveSession(fullExamSession());
    renderExamMode(store);

    await user.click(screen.getByRole('button', { name: 'Prüfung abgeben' }));

    expect(confirm).toHaveBeenCalledWith('Wirklich abgeben? Danach siehst du alle Ergebnisse.');
    expect(screen.queryByText(/von 38 richtig/)).not.toBeInTheDocument();
    expect(store.snapshot().exams['spanish-01']).toBeUndefined();
    expect(store.snapshot().entries).toEqual({});
    expect(store.snapshot().sessions['spanish-01:exam']).toBeDefined();
  });

  it('scores blanks as wrong, records every entry once, and renders the complete review', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const store = createProgressStore(new MemoryStorage());
    const session = fullExamSession({ index: spanish01.entries.length - 1 });
    session.answers = session.answers.map((answer, index) => {
      const entry = spanish01.entries.find((candidate) => candidate.id === answer.entryId)!;
      return {
        ...answer,
        value: index < 19 ? acceptedAnswers(entry, 'es-de')[0]! : '',
      };
    });
    store.saveSession(session);
    renderExamMode(store);

    expect(screen.queryByText('19 von 38 richtig (50 %)')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Prüfung abgeben' }));

    expect(screen.getByRole('heading', { name: 'Prüfung abgeschlossen' })).toBeInTheDocument();
    expect(screen.getByText('19 von 38 richtig (50 %)')).toBeInTheDocument();
    expect(screen.getByText('19 Fehler')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(38);
    expect(screen.getAllByText('Keine Antwort')).toHaveLength(19);
    const firstReview = screen.getAllByRole('listitem')[0]!;
    expect(within(firstReview).getByText('el día')).toBeInTheDocument();
    expect(within(firstReview).getAllByText('der Tag')).toHaveLength(2);
    expect(within(firstReview).getByText('Richtig')).toBeInTheDocument();
    expect(within(firstReview).getByText('✓')).toHaveAttribute('aria-hidden', 'true');

    expect(Object.keys(store.snapshot().entries)).toHaveLength(38);
    spanish01.entries.forEach((entry, index) => {
      expect(store.snapshot().entries[entry.id]).toMatchObject({
        attempts: 1,
        correct: index < 19 ? 1 : 0,
      });
    });
    expect(store.snapshot().exams['spanish-01']).toEqual([
      expect.objectContaining({
        lessonId: 'spanish-01',
        percentage: 50,
        missedEntryIds: spanish01.entries.slice(19).map((entry) => entry.id),
      }),
    ]);
    expect(store.snapshot().sessions['spanish-01:exam']).toBeUndefined();

    const retry = screen.getByRole('link', { name: 'Fehler wiederholen' });
    expect(retry).toHaveAttribute(
      'href',
      `/subjects/spanish/lessons/spanish-01/schreiben?entries=${spanish01.entries.slice(19).map((entry) => entry.id).join(',')}`,
    );
  });

  it('allows moving past an empty answer without treating it as feedback', async () => {
    const user = userEvent.setup();
    const store = createProgressStore(new MemoryStorage());
    store.saveSession(fullExamSession());
    renderExamMode(store);

    expect(screen.getByLabelText('Deine Übersetzung')).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Nächste Aufgabe' }));

    expect(screen.getByText('Aufgabe 2 von 38')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
