import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { LearnMode } from './LearnMode';
import { spanish01 } from '../../content/lessons/spanish-01';
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

const originalSpeechSynthesis = Object.getOwnPropertyDescriptor(globalThis, 'speechSynthesis');
const originalSpeechSynthesisUtterance = Object.getOwnPropertyDescriptor(globalThis, 'SpeechSynthesisUtterance');

function installSpeechSynthesis() {
  class TestUtterance {
    lang = '';
    rate = 1;

    constructor(readonly text: string) {}
  }

  const spoken: TestUtterance[] = [];
  Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
    configurable: true,
    value: TestUtterance,
  });
  Object.defineProperty(globalThis, 'speechSynthesis', {
    configurable: true,
    value: {
      cancel() {},
      speak(utterance: TestUtterance) { spoken.push(utterance); },
    },
  });
  return spoken;
}

afterEach(() => {
  if (originalSpeechSynthesis) Object.defineProperty(globalThis, 'speechSynthesis', originalSpeechSynthesis);
  else Reflect.deleteProperty(globalThis, 'speechSynthesis');

  if (originalSpeechSynthesisUtterance) {
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', originalSpeechSynthesisUtterance);
  } else {
    Reflect.deleteProperty(globalThis, 'SpeechSynthesisUtterance');
  }
});

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

    expect(screen.getByRole('button', { name: /Antwort zeigen/ })).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: /Antwort zeigen/ }));
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
    screen.getByRole('button', { name: /Antwort zeigen/ }).focus();
    await user.keyboard('{Enter}');

    expect(screen.getByText('Danke.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Noch üben' })).toBeInTheDocument();
  });

  it('speaks the current Spanish expression at normal and slow rates', async () => {
    const user = userEvent.setup();
    const spoken = installSpeechSynthesis();
    const store = createProgressStore(new MemoryStorage());
    store.saveSession({
      lessonId: 'spanish-01', mode: 'learn', entryIds: ['hola'], index: 0,
      direction: 'de-es', answers: [], updatedAt: new Date().toISOString(),
    });
    renderLearnMode(store);

    await user.click(screen.getByRole('button', { name: 'Anhören' }));
    await user.click(screen.getByRole('button', { name: 'Langsam' }));

    expect(spoken.map(({ text, lang, rate }) => ({ text, lang, rate }))).toEqual([
      { text: '¡Hola!', lang: 'es-ES', rate: 1 },
      { text: '¡Hola!', lang: 'es-ES', rate: 0.65 },
    ]);
    expect(screen.queryByText('¡Hola!')).not.toBeInTheDocument();
  });

  it('hides pronunciation actions when browser speech is unavailable', () => {
    const store = createProgressStore(new MemoryStorage());
    store.saveSession({
      lessonId: 'spanish-01', mode: 'learn', entryIds: ['hola'], index: 0,
      direction: 'es-de', answers: [], updatedAt: new Date().toISOString(),
    });
    renderLearnMode(store);

    expect(screen.queryByRole('button', { name: 'Anhören' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Langsam' })).not.toBeInTheDocument();
  });

  it('keeps the prompt, revealed answer, example, and action in the flashcard name', async () => {
    const user = userEvent.setup();
    const store = createProgressStore(new MemoryStorage());
    store.saveSession({
      lessonId: 'spanish-01', mode: 'learn', entryIds: ['se-dice'], index: 0,
      direction: 'es-de', answers: [], updatedAt: new Date().toISOString(),
    });
    renderLearnMode(store);

    const card = screen.getByRole('button', { name: /Antwort zeigen/ });
    expect(card).toHaveAccessibleName(/se dice.*Antwort zeigen/i);
    await user.click(card);

    expect(card).toHaveAccessibleName(/se dice.*man sagt.*En alemán.*Buenos días.*Guten Tag.*Antwort verbergen/is);
    expect(screen.getByText(/En alemán “buenos días” se dice “Guten Tag”\./)).toBeInTheDocument();
    expect(screen.getByText(/„Buenos días“ heißt „Guten Tag“ auf Deutsch\./)).toBeInTheDocument();
  });

  it('renders the Spanish and German example on separate lines without visible escape text', async () => {
    const user = userEvent.setup();
    const store = createProgressStore(new MemoryStorage());
    store.saveSession({
      lessonId: 'spanish-01', mode: 'learn', entryIds: ['se-dice'], index: 0,
      direction: 'es-de', answers: [], updatedAt: new Date().toISOString(),
    });
    const { container } = renderLearnMode(store);

    await user.click(screen.getByRole('button', { name: /Antwort zeigen/ }));

    expect(container.querySelector('.flashcard__answer small')?.textContent).toBe(
      'En alemán “buenos días” se dice “Guten Tag”.\n„Buenos días“ heißt „Guten Tag“ auf Deutsch.',
    );
  });

  it('rates cards for practice, clears a completed session, and reports both totals', async () => {
    const user = userEvent.setup();
    const store = createProgressStore(new MemoryStorage());
    store.saveSession({
      lessonId: 'spanish-01', mode: 'learn', entryIds: ['hola', 'gracias'], index: 0,
      direction: 'es-de', answers: [], updatedAt: new Date().toISOString(),
    });
    renderLearnMode(store);

    await user.click(screen.getByRole('button', { name: /Antwort zeigen/ }));
    await user.click(screen.getByRole('button', { name: 'Kann ich' }));
    await user.click(screen.getByRole('button', { name: /Antwort zeigen/ }));
    await user.click(screen.getByRole('button', { name: 'Noch üben' }));

    expect(store.snapshot().entries.gracias?.status).toBe('practice');
    expect(store.snapshot().sessions['spanish-01:learn']).toBeUndefined();
    expect(screen.getByText('1 kannst du, 1 übst du weiter.')).toBeInTheDocument();
  });

  it('puts practice entries first without omitting any entries on a new run', async () => {
    const user = userEvent.setup();
    const store = createProgressStore(new MemoryStorage());
    store.setStudyStatus('hola', 'practice');
    renderLearnMode(store);

    await user.click(screen.getByRole('button', { name: 'Spanisch → Deutsch' }));

    const queue = store.snapshot().sessions['spanish-01:learn']?.entryIds ?? [];
    expect(queue[0]).toBe('hola');
    expect(new Set(queue)).toEqual(new Set(spanish01.entries.map((entry) => entry.id)));
    expect(queue).toHaveLength(spanish01.entries.length);
  });

  it('shows a German prompt and Spanish answer for the reverse direction', async () => {
    const user = userEvent.setup();
    const store = createProgressStore(new MemoryStorage());
    store.saveSession({
      lessonId: 'spanish-01', mode: 'learn', entryIds: ['hola'], index: 0,
      direction: 'de-es', answers: [], updatedAt: new Date().toISOString(),
    });
    renderLearnMode(store);

    expect(screen.getByText('Hallo!')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Antwort zeigen/ }));

    expect(screen.getByText('¡Hola!')).toBeInTheDocument();
  });
});
