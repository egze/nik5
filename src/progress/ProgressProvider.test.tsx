import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StorageNotice } from '../components/StorageNotice';
import { ProgressProvider, useProgress } from './ProgressProvider';
import { createProgressStore } from './store';

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
  get length() { return 0; }
  clear() {}
  getItem() { return null; }
  key() { return null; }
  removeItem() {}
  setItem() {}
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
});
