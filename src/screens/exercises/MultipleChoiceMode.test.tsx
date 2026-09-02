import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MultipleChoiceMode } from './MultipleChoiceMode';
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

function renderMultipleChoiceMode(store = createProgressStore(new MemoryStorage())) {
  return {
    store,
    ...render(
      <ProgressProvider store={store}>
        <MemoryRouter initialEntries={['/subjects/spanish/lessons/spanish-01/auswahl']}>
          <Routes><Route path="/subjects/:subjectId/lessons/:lessonId/auswahl" element={<MultipleChoiceMode />} /></Routes>
        </MemoryRouter>
      </ProgressProvider>,
    ),
  };
}

describe('MultipleChoiceMode', () => {
  it('shows four options and records one correct choice without advancing automatically', async () => {
    const user = userEvent.setup();
    const store = createProgressStore(new MemoryStorage());
    store.saveSession({
      lessonId: 'spanish-01', mode: 'multiple-choice', entryIds: ['el-dia', 'hola'], index: 0,
      direction: 'es-de', answers: [], updatedAt: new Date().toISOString(),
    });
    renderMultipleChoiceMode(store);

    const options = screen.getAllByRole('button', { name: /^(der Tag|.+)$/ }).filter((button) => (
      button.getAttribute('data-choice') === 'true'
    ));
    expect(options).toHaveLength(4);
    await user.click(screen.getByRole('button', { name: 'der Tag' }));

    expect(screen.getByRole('status')).toHaveTextContent('Richtig!');
    expect(screen.getByText('✓')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText(/Die richtige Übersetzung ist: der Tag/)).toBeInTheDocument();
    options.forEach((option) => expect(option).toBeDisabled());
    expect(store.snapshot().entries['el-dia']).toMatchObject({ attempts: 1, correct: 1 });
    expect(store.snapshot().sessions['spanish-01:multiple-choice']?.index).toBe(0);
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeInTheDocument();
  });

  it('resumes at its saved index and clears a completed session with a summary', async () => {
    const user = userEvent.setup();
    const store = createProgressStore(new MemoryStorage());
    store.saveSession({
      lessonId: 'spanish-01', mode: 'multiple-choice', entryIds: ['el-dia'], index: 0,
      direction: 'es-de', answers: [], updatedAt: new Date().toISOString(),
    });
    renderMultipleChoiceMode(store);

    await user.click(screen.getByRole('button', { name: 'der Tag' }));
    await user.click(screen.getByRole('button', { name: 'Weiter' }));

    expect(screen.getByRole('heading', { name: 'Auswahl abgeschlossen' })).toBeInTheDocument();
    expect(screen.getByText('1 von 1 richtig (100 %)')).toBeInTheDocument();
    expect(store.snapshot().sessions['spanish-01:multiple-choice']).toBeUndefined();
  });

  it('resumes a saved question without changing its queue or index', () => {
    const store = createProgressStore(new MemoryStorage());
    store.saveSession({
      lessonId: 'spanish-01', mode: 'multiple-choice', entryIds: ['el-dia', 'hola'], index: 1,
      direction: 'es-de', answers: [], updatedAt: new Date().toISOString(),
    });
    renderMultipleChoiceMode(store);

    expect(screen.getByText('Frage 2 von 2')).toBeInTheDocument();
    expect(screen.getByText('¡Hola!')).toBeInTheDocument();
    expect(store.snapshot().sessions['spanish-01:multiple-choice']).toMatchObject({
      entryIds: ['el-dia', 'hola'], index: 1,
    });
  });

  it('shows incorrect textual feedback with a visible cross and locks every option', async () => {
    const user = userEvent.setup();
    const store = createProgressStore(new MemoryStorage());
    store.saveSession({
      lessonId: 'spanish-01', mode: 'multiple-choice', entryIds: ['el-dia'], index: 0,
      direction: 'es-de', answers: [], updatedAt: new Date().toISOString(),
    });
    renderMultipleChoiceMode(store);

    const options = screen.getAllByRole('button').filter((button) => button.getAttribute('data-choice') === 'true');
    const wrongOption = options.find((option) => option.textContent !== 'der Tag');
    if (!wrongOption) throw new Error('Expected a distractor option');
    await user.click(wrongOption);

    expect(screen.getByRole('status')).toHaveTextContent('Nicht ganz.');
    expect(screen.getByText('✕')).toHaveAttribute('aria-hidden', 'true');
    options.forEach((option) => expect(option).toBeDisabled());
    expect(store.snapshot().entries['el-dia']).toMatchObject({ attempts: 1, correct: 0 });
  });

  it('does not record another attempt when remounting an answered saved question', async () => {
    const user = userEvent.setup();
    const store = createProgressStore(new MemoryStorage());
    store.saveSession({
      lessonId: 'spanish-01', mode: 'multiple-choice', entryIds: ['el-dia'], index: 0,
      direction: 'es-de', answers: [], updatedAt: new Date().toISOString(),
    });
    const firstView = renderMultipleChoiceMode(store);

    await user.click(screen.getByRole('button', { name: 'der Tag' }));
    expect(store.snapshot().entries['el-dia']?.attempts).toBe(1);
    firstView.unmount();
    renderMultipleChoiceMode(store);

    expect(screen.getByRole('status')).toHaveTextContent('Richtig!');
    expect(screen.getByRole('button', { name: 'der Tag' })).toBeDisabled();
    expect(store.snapshot().entries['el-dia']?.attempts).toBe(1);
  });
});
