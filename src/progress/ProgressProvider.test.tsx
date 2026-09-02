import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppLayout } from '../components/AppLayout';
import { StorageNotice } from '../components/StorageNotice';
import { ProgressProvider, useProgress } from './ProgressProvider';
import { PROGRESS_KEY, createProgressStore } from './store';

function ProgressConsumer() {
  const { progress, updateEntry } = useProgress();

  return (
    <button onClick={() => updateEntry('hola', true)} type="button">
      {progress.entries.hola?.correct ?? 0}
    </button>
  );
}

function OutsideProvider() {
  useProgress();
  return null;
}

class BrokenStorage implements Storage {
  get length() { return 0; }
  clear() {}
  getItem() { return null; }
  key() { return null; }
  removeItem() {}
  setItem() { throw new DOMException('blocked'); }
}

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe('ProgressProvider', () => {
  it('reactively exposes the injected store state and mutations', () => {
    const store = createProgressStore(new MemoryStorage());
    render(
      <ProgressProvider store={store}>
        <ProgressConsumer />
      </ProgressProvider>,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toHaveTextContent('1');
    expect(store.snapshot().entries.hola).toMatchObject({ attempts: 1, correct: 1 });
  });

  it('rejects use outside the provider', () => {
    expect(() => render(<OutsideProvider />)).toThrow(
      'useProgress muss innerhalb von ProgressProvider verwendet werden',
    );
  });

  it('shows the storage notice only when persistence falls back to memory', () => {
    const store = createProgressStore(new BrokenStorage());
    store.updateEntry('hola', true);
    render(
      <ProgressProvider store={store}>
        <StorageNotice />
      </ProgressProvider>,
    );

    expect(screen.getByText('Dein Fortschritt kann in diesem Browser nicht gespeichert werden.')).toBeInTheDocument();
  });

  it('shows a corrupt-progress recovery notice directly after the header while storage remains persistent', () => {
    const storage = new MemoryStorage();
    storage.setItem(PROGRESS_KEY, '{not valid json');
    const store = createProgressStore(storage);

    render(
      <MemoryRouter>
        <ProgressProvider store={store}>
          <AppLayout><p>Üben</p></AppLayout>
        </ProgressProvider>
      </MemoryRouter>,
    );

    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent('Dein gespeicherter Fortschritt war beschädigt und wurde zurückgesetzt.');
    expect(screen.getByRole('banner').nextElementSibling).toBe(notice);
  });
});
