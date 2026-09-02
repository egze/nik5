import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LearnMode } from './LearnMode';
import { ProgressProvider } from '../../progress/ProgressProvider';
import { createProgressStore } from '../../progress/store';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function renderLearnMode(store = createProgressStore(new MemoryStorage())) {
  return {
    store,
    ...render(
      <ProgressProvider store={store}>
        <MemoryRouter initialEntries={['/subjects/spanish/lessons/spanish-01/lernen']}>
          <Routes><Route path="/subjects/:subjectId/lessons/:lessonId/lernen" element={<LearnMode />} /></Routes>
        </MemoryRouter>
      </ProgressProvider>,
    ),
  };
}

describe('LearnMode', () => {
  it('lets the student select a translation direction before starting', async () => {
    const user = userEvent.setup();
    renderLearnMode();

    await user.click(screen.getByRole('button', { name: 'Spanisch → Deutsch' }));

    expect(screen.getByRole('button', { name: 'Antwort zeigen' })).toBeInTheDocument();
    expect(screen.getByText('Karte 1 von 38')).toBeInTheDocument();
  });

  it('requires reveal before the student can rate a card and saves the rating', async () => {
    const user = userEvent.setup();
    const store = createProgressStore(new MemoryStorage());
    store.saveSession({
      lessonId: 'spanish-01', mode: 'learn', entryIds: ['hola', 'gracias'], index: 0,
      direction: 'es-de', answers: [], updatedAt: new Date().toISOString(),
    });
    renderLearnMode(store);

    expect(screen.queryByRole('button', { name: 'Kann ich' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Antwort zeigen' }));
    expect(screen.getByText('Hallo!')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Kann ich' }));

    expect(store.snapshot().entries.hola?.status).toBe('known');
    expect(store.snapshot().sessions['spanish-01:learn']).toMatchObject({ index: 1, entryIds: ['hola', 'gracias'] });
  });

  it('reveals the answer with the keyboard and resumes the saved card index', async () => {
    const user = userEvent.setup();
    const store = createProgressStore(new MemoryStorage());
    store.saveSession({
      lessonId: 'spanish-01', mode: 'learn', entryIds: ['hola', 'gracias'], index: 1,
      direction: 'es-de', answers: [], updatedAt: new Date().toISOString(),
    });
    renderLearnMode(store);

    expect(screen.getByText('Karte 2 von 2')).toBeInTheDocument();
    screen.getByRole('button', { name: 'Antwort zeigen' }).focus();
    await user.keyboard('{Enter}');

    expect(screen.getByText('Danke.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Noch üben' })).toBeInTheDocument();
  });
});
