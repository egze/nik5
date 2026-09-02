import { PinGate } from './auth/PinGate';

export function App() {
  return (
    <PinGate>
      <main className="app-shell">
        <p className="eyebrow">Dein Platz zum Üben</p>
        <h1>Lernraum</h1>
      </main>
    </PinGate>
  );
}
