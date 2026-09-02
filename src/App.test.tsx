import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App, AppRoutes } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProgressProvider } from './progress/ProgressProvider';
import { createProgressStore, PROGRESS_KEY } from './progress/store';
import { verifyPin } from './auth/pin';

vi.mock('./auth/pin', async () => {
  const actual = await vi.importActual<typeof import('./auth/pin')>('./auth/pin');
  return { ...actual, verifyPin: vi.fn() };
});

class BrokenStorage implements Storage {
  get length() { return 0; }
  clear() {}
  getItem() { return null; }
  key() { return null; }
  removeItem() {}
  setItem() { throw new DOMException('blocked'); }
}

describe('App', () => {
  it('renders the German application identity', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Lernraum' })).toBeInTheDocument();
    expect(screen.getByText('Dein Platz zum Üben')).toBeInTheDocument();
  });

  it('recovers from an unexpected render error in German', () => {
    const Broken = () => { throw new Error('boom'); };

    render(<ErrorBoundary><Broken /></ErrorBoundary>);

    expect(screen.getByRole('heading', { name: 'Etwas ist schiefgelaufen.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Neu laden' })).toBeInTheDocument();
  });

  it('places the memory-only persistence warning directly below the app header', () => {
    const store = createProgressStore(new BrokenStorage());
    store.updateEntry('hola', true);

    render(
      <ProgressProvider store={store}>
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>
      </ProgressProvider>,
    );

    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent('Dein Fortschritt kann in diesem Browser nicht gespeichert werden.');
    expect(document.querySelector('header')?.nextElementSibling).toBe(notice);
  });

  it('keeps a multiple-choice attempt when returning home after unlocking and navigating the catalog', async () => {
    vi.mocked(verifyPin).mockResolvedValue(true);
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('Familien-PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Öffnen' }));
    await screen.findByRole('heading', { name: 'Was möchtest du heute üben?' });

    await user.click(screen.getByRole('link', { name: 'Fächer' }));
    await user.click(screen.getByRole('link', { name: /Spanisch/ }));
    await user.click(screen.getByRole('link', { name: /Erste Wörter/ }));
    await user.click(screen.getByRole('link', { name: /Multiple Choice/ }));
    await user.click(screen.getByRole('button', { name: 'Spanisch → Deutsch' }));

    const options = screen.getAllByRole('button').filter((button) => button.dataset.choice === 'true');
    await user.click(options[0]!);
    await user.click(screen.getByRole('link', { name: 'Fächer' }));

    expect(await screen.findByRole('heading', { name: 'Was möchtest du heute üben?' })).toBeInTheDocument();
    const persisted = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}') as { entries?: Record<string, { attempts: number }> };
    expect(Object.values(persisted.entries ?? {}).some((entry) => entry.attempts === 1)).toBe(true);
  });

  it.each([
    ['/subjects/spanish/lessons/spanish-01/schreiben', 'Übersetze den Ausdruck'],
    ['/subjects/spanish/lessons/spanish-01/pruefung', 'Teste die ganze Lektion'],
  ])('registers the typed exercise route %s', (path, heading) => {
    render(
      <ProgressProvider>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </ProgressProvider>,
    );

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });
});
