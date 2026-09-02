import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pinConfig } from './pin-config';
import { PinGate } from './PinGate';
import { isUnlocked, verifyPin } from './pin';

vi.mock('./pin', async () => {
  const actual = await vi.importActual<typeof import('./pin')>('./pin');
  return { ...actual, verifyPin: vi.fn() };
});

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

class ThrowingStorage extends MemoryStorage {
  constructor(private readonly operation: 'set' | 'remove') {
    super();
  }

  override setItem(key: string, value: string) {
    if (this.operation === 'set') throw new DOMException('blocked');
    super.setItem(key, value);
  }

  override removeItem(key: string) {
    if (this.operation === 'remove') throw new DOMException('blocked');
    super.removeItem(key);
  }
}

describe('PinGate', () => {
  const storage = new MemoryStorage();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal('localStorage', storage);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('shows the German casual-security lock screen with a digit-only six-character input', async () => {
    const user = userEvent.setup();
    render(<PinGate><h1>Fächer</h1></PinGate>);

    const input = screen.getByLabelText('Familien-PIN');
    await user.type(input, '12abc34567');

    expect(screen.getByText('Lernraum')).toBeInTheDocument();
    expect(screen.getByText('Dein Platz zum Üben')).toBeInTheDocument();
    expect(screen.getByText('Nur für unseren Lernbereich – keine sensiblen Daten speichern.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Öffnen' })).toBeInTheDocument();
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveAttribute('maxlength', '6');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveValue('123456');
  });

  it('shows the protected content and remembers a correct PIN', async () => {
    vi.mocked(verifyPin).mockResolvedValue(true);
    const user = userEvent.setup();
    render(<PinGate><h1>Fächer</h1></PinGate>);

    await user.type(screen.getByLabelText('Familien-PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Öffnen' }));

    expect(await screen.findByRole('heading', { name: 'Fächer' })).toBeInTheDocument();
    expect(isUnlocked(pinConfig)).toBe(true);
    expect(screen.getByRole('button', { name: 'Abmelden' })).toBeInTheDocument();
  });

  it('unlocks for the current session when remembering the verified PIN fails', async () => {
    vi.stubGlobal('localStorage', new ThrowingStorage('set'));
    vi.mocked(verifyPin).mockResolvedValue(true);
    const user = userEvent.setup();
    render(<PinGate><h1>Fächer</h1></PinGate>);

    await user.type(screen.getByLabelText('Familien-PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Öffnen' }));

    expect(await screen.findByRole('heading', { name: 'Fächer' })).toBeInTheDocument();
  });

  it('returns to the lock screen and removes the remembered unlock on logout', async () => {
    vi.mocked(verifyPin).mockResolvedValue(true);
    const user = userEvent.setup();
    render(<PinGate><h1>Fächer</h1></PinGate>);

    await user.type(screen.getByLabelText('Familien-PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Öffnen' }));
    await user.click(await screen.findByRole('button', { name: 'Abmelden' }));

    expect(screen.getByLabelText('Familien-PIN')).toBeInTheDocument();
    expect(isUnlocked(pinConfig)).toBe(false);
  });

  it('returns to the lock screen when storage removal fails during logout', async () => {
    vi.stubGlobal('localStorage', new ThrowingStorage('remove'));
    vi.mocked(verifyPin).mockResolvedValue(true);
    const user = userEvent.setup();
    render(<PinGate><h1>Fächer</h1></PinGate>);

    await user.type(screen.getByLabelText('Familien-PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Öffnen' }));
    await user.click(await screen.findByRole('button', { name: 'Abmelden' }));

    expect(screen.getByLabelText('Familien-PIN')).toBeInTheDocument();
  });

  it('announces the generic German error for a rejected PIN', async () => {
    vi.mocked(verifyPin).mockResolvedValue(false);
    const user = userEvent.setup();
    render(<PinGate><h1>Fächer</h1></PinGate>);

    await user.type(screen.getByLabelText('Familien-PIN'), '123456');
    await user.click(screen.getByRole('button', { name: 'Öffnen' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Der PIN stimmt nicht. Versuch es noch einmal.');
  });

  it('locks submissions for 30 seconds after five rejected attempts', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
    vi.mocked(verifyPin).mockResolvedValue(false);
    render(<PinGate><h1>Fächer</h1></PinGate>);
    const input = screen.getByLabelText('Familien-PIN');
    const button = screen.getByRole('button', { name: 'Öffnen' });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      fireEvent.change(input, { target: { value: '123456' } });
      fireEvent.click(button);
      await act(async () => {});
    }

    expect(screen.getByRole('status')).toHaveTextContent('Zu viele Versuche. Bitte warte 30 Sekunden.');
    expect(button).toBeDisabled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(button).toBeEnabled();
  });
});
