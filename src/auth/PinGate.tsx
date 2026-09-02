import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { pinConfig } from './pin-config';
import { isUnlocked, logout, rememberUnlock, verifyPin } from './pin';

const incorrectPinMessage = 'Der PIN stimmt nicht. Versuch es noch einmal.';
const lockedMessage = 'Zu viele Versuche. Bitte warte 30 Sekunden.';

export function PinGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => isUnlocked(pinConfig));
  const [pin, setPin] = useState('');
  const [checking, setChecking] = useState(false);
  const [failures, setFailures] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [message, setMessage] = useState('');
  const locked = lockedUntil > Date.now();

  useEffect(() => {
    if (!lockedUntil) return undefined;

    const remaining = lockedUntil - Date.now();
    if (remaining <= 0) {
      setLockedUntil(0);
      setFailures(0);
      setMessage('');
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setLockedUntil(0);
      setFailures(0);
      setMessage('');
    }, remaining);
    return () => window.clearTimeout(timeout);
  }, [lockedUntil]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (locked) return;

    setChecking(true);
    let accepted = false;
    try {
      accepted = await verifyPin(pin, pinConfig);
    } catch {
      accepted = false;
    } finally {
      setChecking(false);
    }

    if (accepted) {
      rememberUnlock(pinConfig);
      setUnlocked(true);
      setMessage('');
      return;
    }

    const nextFailures = failures + 1;
    setFailures(nextFailures);
    setMessage(nextFailures >= 5 ? lockedMessage : incorrectPinMessage);
    if (nextFailures >= 5) setLockedUntil(Date.now() + 30_000);
  }

  function handlePinChange(event: ChangeEvent<HTMLInputElement>) {
    setPin(event.target.value.replace(/\D/g, '').slice(0, 6));
  }

  function handleLogout() {
    logout();
    setUnlocked(false);
    setPin('');
    setFailures(0);
    setLockedUntil(0);
    setMessage('');
  }

  if (unlocked) {
    return (
      <>
        <div className="auth-actions">
          <button className="logout-button" type="button" onClick={handleLogout}>Abmelden</button>
        </div>
        {children}
      </>
    );
  }

  return (
    <main className="pin-gate">
      <section className="pin-card" aria-labelledby="pin-gate-title">
        <p className="eyebrow">Dein Platz zum Üben</p>
        <h1 id="pin-gate-title">Lernraum</h1>
        <p className="pin-copy">Nur für unseren Lernbereich – keine sensiblen Daten speichern.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="family-pin">Familien-PIN</label>
          <input
            id="family-pin"
            value={pin}
            onChange={handlePinChange}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[0-9]*"
            type="text"
          />
          <button type="submit" disabled={checking || locked} aria-busy={checking}>Öffnen</button>
        </form>
        <p role="status" aria-live="polite">{message}</p>
      </section>
    </main>
  );
}
