import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppRoutes } from '../App';
import { PinGate } from '../auth/PinGate';
import { AUTH_KEY } from '../auth/pin';
import { pinConfig } from '../auth/pin-config';
import { ProgressProvider } from '../progress/ProgressProvider';
import { createProgressStore } from '../progress/store';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function renderCatalogAt(path: string) {
  return render(
    <ProgressProvider store={createProgressStore(new MemoryStorage())}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </ProgressProvider>,
  );
}

describe('catalog browsing flow', () => {
  it('navigates from subjects to the Spanish lesson modes', async () => {
    const user = userEvent.setup();
    renderCatalogAt('/');

    await user.click(screen.getByRole('link', { name: /Spanisch/ }));
    expect(screen.getByRole('heading', { name: 'Spanisch' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /Erste Wörter/ }));
    expect(screen.getByRole('heading', { name: 'Begrüßen und vorstellen' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lernen/ })).toBeInTheDocument();
    expect(screen.getByText('38 Wörter und Wendungen')).toBeInTheDocument();
  });

  it('shows the catalog fallback for an unknown subject', () => {
    renderCatalogAt('/subjects/unbekannt');

    expect(screen.getByText('Diesen Lerninhalt gibt es nicht.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Zurück zu den Fächern' })).toHaveAttribute('href', '/');
  });

  it('shows the catalog fallback for an unknown or mismatched lesson', () => {
    renderCatalogAt('/subjects/spanish/lessons/unbekannt');

    expect(screen.getByText('Diesen Lerninhalt gibt es nicht.')).toBeInTheDocument();
  });

  it('shows no learned entries at the start of a lesson', () => {
    renderCatalogAt('/subjects/spanish/lessons/spanish-01');

    expect(screen.getByText('0 von 38 gelernt')).toBeInTheDocument();
  });

  it('removes the auth marker when signing out', async () => {
    const user = userEvent.setup();
    localStorage.setItem(AUTH_KEY, pinConfig.credentialVersion);

    render(
      <PinGate>
        <ProgressProvider store={createProgressStore(new MemoryStorage())}>
          <MemoryRouter initialEntries={['/']}>
            <AppRoutes />
          </MemoryRouter>
        </ProgressProvider>
      </PinGate>,
    );

    await user.click(screen.getByRole('button', { name: 'Abmelden' }));

    expect(localStorage.getItem(AUTH_KEY)).toBeNull();
  });
});
