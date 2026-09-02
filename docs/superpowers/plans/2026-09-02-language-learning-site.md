# Language Learning Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a German-language, PIN-gated vocabulary practice site whose first Spanish lesson contains all 38 bold entries visible in the supplied textbook photograph.

**Architecture:** A static React application uses hash routes and typed lesson files, with pure TypeScript modules for content validation and exercise generation. Versioned browser storage owns progress and sessions, while a Web Crypto PBKDF2 verifier provides the documented casual-access PIN gate. GitHub Actions validates, tests, builds, and publishes the Vite artifact to GitHub Pages.

**Tech Stack:** Node.js 22, npm, React, TypeScript, Vite, React Router, Vitest, Testing Library, jsdom, Web Crypto, CSS, GitHub Actions, GitHub Pages

**Spec:** `docs/superpowers/specs/2026-09-02-language-learning-site-design.md`

## Global Constraints

- All student-facing copy is German and suitable for a fifth-grade student.
- The UI must work at 320 px phone width through desktop widths, with keyboard access, visible focus, non-color feedback, and reduced-motion support.
- Hash-based routes and relative Vite assets must work from a GitHub Pages repository subpath.
- Lesson photographs are never copied into the repository or published site.
- The supplied family PIN is never committed in plain text; only a salted PBKDF2 verifier is stored.
- The PIN gate is labeled in documentation as a casual-access barrier, not secure authorization.
- Progress and unfinished sessions persist locally, with schema validation, migration, corruption recovery, and in-memory fallback.
- Content validation, unit/component tests, and the production build must all pass before deployment.
- Keep lesson data independent of screens and exercise code so later subjects do not require component changes.

---

## File Map

The implementation creates these focused units:

```text
.
├── .github/workflows/deploy.yml        # validate/test/build/deploy pipeline
├── README.md                           # German usage + Russian maintainer guide
├── index.html                          # Vite entry document and metadata
├── package.json                        # scripts and dependency contract
├── package-lock.json                   # locked dependency graph
├── tsconfig.app.json                   # browser TypeScript config
├── tsconfig.json                       # project references
├── tsconfig.node.json                  # Vite/scripts TypeScript config
├── vite.config.ts                      # React, Vitest, relative base
├── scripts/
│   ├── set-pin.mjs                     # interactive PBKDF2 verifier generator
│   └── validate-content.ts             # build-time catalog validation
└── src/
    ├── App.tsx                         # providers, gate, and hash router
    ├── App.test.tsx                    # app-shell and route smoke tests
    ├── main.tsx                        # browser bootstrap
    ├── test/setup.ts                   # jest-dom and test cleanup
    ├── styles/global.css               # tokens, responsive layout, states
    ├── auth/
    │   ├── PinGate.tsx                 # lock screen and local throttling
    │   ├── PinGate.test.tsx
    │   ├── pin-config.ts               # generated salt/hash/iteration config
    │   ├── pin.ts                      # PBKDF2 comparison
    │   └── pin.test.ts
    ├── content/
    │   ├── catalog.ts                  # subject/lesson lookup API
    │   ├── catalog.test.ts
    │   ├── types.ts                    # subject and lesson contracts
    │   ├── validate.ts                 # invariant checks
    │   ├── validate.test.ts
    │   └── lessons/spanish-01.ts       # first photographed vocabulary page
    ├── exercises/
    │   ├── answers.ts                  # normalization and accepted answers
    │   ├── answers.test.ts
    │   ├── engine.ts                   # prompts, choices, exams, scoring
    │   └── engine.test.ts
    ├── progress/
    │   ├── ProgressProvider.tsx         # reactive progress API
    │   ├── store.ts                    # versioned persistence and fallback
    │   ├── store.test.ts
    │   └── types.ts                    # progress/session/result contracts
    ├── components/
    │   ├── AppLayout.tsx               # header, breadcrumbs, logout
    │   ├── DirectionPicker.tsx          # translation direction control
    │   ├── ErrorBoundary.tsx            # runtime recovery UI
    │   ├── ProgressBar.tsx              # accessible numeric progress
    │   └── StorageNotice.tsx            # persistence warning
    └── screens/
        ├── HomePage.tsx                 # subject catalog
        ├── SubjectPage.tsx              # lessons and progress
        ├── LessonPage.tsx               # mode selection
        ├── NotFoundPage.tsx              # route/content recovery
        ├── catalog-flow.test.tsx
        └── exercises/
            ├── LearnMode.tsx
            ├── LearnMode.test.tsx
            ├── MultipleChoiceMode.tsx
            ├── MultipleChoiceMode.test.tsx
            ├── WritingMode.tsx
            ├── WritingMode.test.tsx
            ├── ExamMode.tsx
            ├── ExamMode.test.tsx
            └── ResultPanel.tsx
```

---

### Task 1: Tested React/Vite application shell

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/App.test.tsx`
- Create: `src/test/setup.ts`
- Create: `src/styles/global.css`

**Interfaces:**
- Consumes: approved design document only.
- Produces: `App(): JSX.Element`, npm scripts `dev`, `test`, `build`, `validate`, and `set-pin`; a jsdom test environment used by every later task.

- [ ] **Step 1: Create the package and tool configuration**

Create `package.json` with Node 22, ESM, and these scripts/dependencies:

```json
{
  "name": "lernraum",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=22 <23" },
  "scripts": {
    "dev": "vite",
    "validate": "tsx scripts/validate-content.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "build": "npm run validate && tsc -b && vite build",
    "set-pin": "node scripts/set-pin.mjs"
  },
  "dependencies": {
    "react": "latest",
    "react-dom": "latest",
    "react-router-dom": "latest"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@testing-library/user-event": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "@vitejs/plugin-react": "latest",
    "jsdom": "latest",
    "tsx": "latest",
    "typescript": "latest",
    "vite": "latest",
    "vitest": "latest"
  }
}
```

Run `npm install` once so `package-lock.json` records exact versions. Configure `vite.config.ts` with `base: './'`, the React plugin, and Vitest `environment: 'jsdom'`, `setupFiles: './src/test/setup.ts'`. Configure strict TypeScript with `noUncheckedIndexedAccess`, DOM libraries, and project references.

- [ ] **Step 2: Write the failing shell test**

```tsx
// src/App.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the German application identity', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Lernraum' })).toBeInTheDocument();
    expect(screen.getByText('Dein Platz zum Üben')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the shell test and verify the expected failure**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL because `src/App.tsx` does not exist.

- [ ] **Step 4: Add the minimal accessible shell**

```tsx
// src/App.tsx
export function App() {
  return (
    <main className="app-shell">
      <p className="eyebrow">Dein Platz zum Üben</p>
      <h1>Lernraum</h1>
    </main>
  );
}
```

`src/main.tsx` mounts `<App />` into `#root`. `src/test/setup.ts` imports `@testing-library/jest-dom/vitest` and calls Testing Library `cleanup` after each test. Begin `global.css` with concrete color, typography, focus, spacing, and reduced-motion tokens:

```css
:root {
  font-family: Inter, ui-rounded, "Avenir Next", system-ui, sans-serif;
  color: #20322f;
  background: #f6f3ea;
  font-synthesis: none;
  --ink: #20322f;
  --muted: #677572;
  --paper: #fffdf7;
  --teal: #177c73;
  --teal-dark: #0e5c55;
  --coral: #ed785f;
  --line: #d9ded8;
  --shadow: 0 18px 50px rgb(40 58 53 / 10%);
}

* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; min-height: 100vh; }
button, input { font: inherit; }
:focus-visible { outline: 3px solid #ef9f32; outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; }
}
```

- [ ] **Step 5: Verify shell, types, and production compilation**

Run: `npm test -- src/App.test.tsx && npx tsc -b --pretty false && npx vite build`

Expected: one passing test, zero TypeScript errors, and `dist/index.html` generated.

- [ ] **Step 6: Commit the shell**

```bash
git add package.json package-lock.json index.html tsconfig*.json vite.config.ts src
git commit -m "chore: scaffold tested learning app"
```

---

### Task 2: Typed catalog, validation, and first Spanish lesson

**Files:**
- Create: `src/content/types.ts`
- Create: `src/content/lessons/spanish-01.ts`
- Create: `src/content/catalog.ts`
- Create: `src/content/catalog.test.ts`
- Create: `src/content/validate.ts`
- Create: `src/content/validate.test.ts`
- Create: `scripts/validate-content.ts`

**Interfaces:**
- Consumes: npm `validate` script from Task 1.
- Produces: `Subject`, `Lesson`, `VocabularyEntry`, `subjects`, `lessons`, `getSubject(id)`, `getLesson(id)`, and `validateCatalog(subjects, lessons): string[]`.

- [ ] **Step 1: Define the domain contracts**

```ts
// src/content/types.ts
export type EntryKind = 'word' | 'phrase';

export interface ExamplePair {
  spanish: string;
  german: string;
}

export interface VocabularyEntry {
  id: string;
  groupId: string;
  spanish: string;
  german: string[];
  kind: EntryKind;
  note?: string;
  acceptedSpanish?: string[];
  acceptedGerman?: string[];
  example?: ExamplePair;
}

export interface LessonGroup {
  id: string;
  title: string;
}

export interface Lesson {
  id: string;
  subjectId: string;
  title: string;
  subtitle: string;
  sourceDate: string;
  groups: LessonGroup[];
  entries: VocabularyEntry[];
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  icon: string;
  accent: string;
  lessonIds: string[];
}
```

- [ ] **Step 2: Write failing validator and catalog tests**

```ts
// src/content/validate.test.ts
import { describe, expect, it } from 'vitest';
import { validateCatalog } from './validate';
import type { Lesson, Subject } from './types';

const subject: Subject = { id: 'spanish', name: 'Spanisch', description: 'Wörter', icon: '¡Hola!', accent: '#ed785f', lessonIds: ['one'] };
const lesson: Lesson = {
  id: 'one', subjectId: 'spanish', title: 'Start', subtitle: 'Erste Wörter', sourceDate: '2026-09-02',
  groups: [{ id: 'greetings', title: 'Begrüßung' }],
  entries: [{ id: 'hola', groupId: 'greetings', spanish: '¡Hola!', german: ['Hallo!'], kind: 'phrase' }],
};

describe('validateCatalog', () => {
  it('accepts a valid linked catalog', () => expect(validateCatalog([subject], [lesson])).toEqual([]));
  it('reports duplicate entry ids with lesson context', () => {
    const invalid = { ...lesson, entries: [lesson.entries[0]!, lesson.entries[0]!] };
    expect(validateCatalog([subject], [invalid])).toContain('Lektion one: doppelter Eintrag hola');
  });
  it('reports unknown groups and empty translations', () => {
    const invalid = { ...lesson, entries: [{ ...lesson.entries[0]!, groupId: 'missing', german: [] }] };
    expect(validateCatalog([subject], [invalid])).toEqual(expect.arrayContaining([
      'Lektion one, Eintrag hola: unbekannte Gruppe missing',
      'Lektion one, Eintrag hola: deutsche Übersetzung fehlt',
    ]));
  });
});
```

```ts
// src/content/catalog.test.ts
import { describe, expect, it } from 'vitest';
import { getLesson, getSubject, lessons } from './catalog';

describe('first Spanish lesson', () => {
  it('contains the 38 bold photographed entries', () => {
    expect(getSubject('spanish')?.lessonIds).toEqual(['spanish-01']);
    expect(getLesson('spanish-01')?.entries).toHaveLength(38);
    expect(lessons[0]?.entries.at(-1)?.spanish).toBe('la isla');
  });
});
```

- [ ] **Step 3: Run content tests and verify the expected failure**

Run: `npm test -- src/content/validate.test.ts src/content/catalog.test.ts`

Expected: FAIL because the validator and catalog modules do not exist.

- [ ] **Step 4: Implement validator and catalog lookup**

`validateCatalog` must collect all errors in one run. It checks duplicate subject, lesson, group, and entry identifiers; empty display values/translations; subject-to-lesson links in both directions; entry group references; and complete example pairs. Export the validated data and lookups:

```ts
// src/content/catalog.ts
import { spanish01 } from './lessons/spanish-01';
import type { Lesson, Subject } from './types';

export const subjects: Subject[] = [{
  id: 'spanish',
  name: 'Spanisch',
  description: 'Wörter, Sätze und kleine Prüfungen',
  icon: '¡Hola!',
  accent: '#ed785f',
  lessonIds: ['spanish-01'],
}];

export const lessons: Lesson[] = [spanish01];
export const getSubject = (id: string) => subjects.find((subject) => subject.id === id);
export const getLesson = (id: string) => lessons.find((lesson) => lesson.id === id);
```

`scripts/validate-content.ts` calls `validateCatalog(subjects, lessons)`, prints each error to `console.error`, and sets `process.exitCode = 1`; on success it prints `Inhalte geprüft: 1 Fach, 1 Lektion, 38 Einträge.`.

- [ ] **Step 5: Transcribe the photographed vocabulary exactly**

Create `spanish01` with title `Begrüßen und vorstellen`, subtitle `Erste Wörter aus Unidad 1`, source date `2026-09-02`, and groups `begrüßung`, `befinden`, and `nomen`. Use these 38 required pairs; semicolon-separated German values become separate accepted translations:

| # | Spanish | German |
|---:|---|---|
| 1 | el día | der Tag |
| 2 | ¡Buenos días! | Guten Morgen!; Guten Tag! |
| 3 | ¡Buenas tardes! | Guten Tag!; Guten Abend! |
| 4 | ¡Buenas noches! | Guten Abend!; Gute Nacht! |
| 5 | en alemán | auf Deutsch |
| 6 | se dice... | man sagt ...; (es) heißt ... |
| 7 | ¡Hola! | Hallo! |
| 8 | ¿Qué tal? | Wie geht’s? |
| 9 | bien | gut |
| 10 | Gracias. | Danke. |
| 11 | y | und |
| 12 | tú | du |
| 13 | también | auch |
| 14 | yo | ich |
| 15 | (Yo) soy... | Ich bin ... |
| 16 | ¿Cómo te llamas? | Wie heißt du? |
| 17 | ¿Cómo...? | Wie ...? |
| 18 | Me llamo... | Ich heiße ... |
| 19 | Perdón. | Entschuldigung. |
| 20 | ¿De dónde eres? | Woher kommst du? |
| 21 | ¿De dónde...? | Woher ...? |
| 22 | Soy de... | Ich komme aus ... |
| 23 | de | von; aus |
| 24 | Alemania | Deutschland |
| 25 | ¡Adiós! | Auf Wiedersehen!; Tschüs! |
| 26 | ¡Hasta luego! | Bis später! |
| 27 | muy | sehr |
| 28 | así, así | so einigermaßen; Es geht so. |
| 29 | mal | schlecht |
| 30 | fatal | (sehr) schlecht |
| 31 | el barco | das Schiff |
| 32 | el caballo | das Pferd |
| 33 | el dado | der Würfel |
| 34 | el elefante | der Elefant |
| 35 | la foca | die Robbe |
| 36 | el gato | die Katze |
| 37 | el hueso | der Knochen |
| 38 | la isla | die Insel |

Attach the photograph's blue examples to entries `se-dice`, `soy`, `me-llamo`, `soy-de`, and `fatal`. Set `note: 'Adverb'` on `bien` and `mal`. Add answer variants without optional parenthesized words for `(Yo) soy...`, `(es) heißt ...`, and `(sehr) schlecht`. Preserve accents, inverted punctuation, and the photograph's three-dot ellipses. Do not add the photograph itself.

- [ ] **Step 6: Verify validation and transcription**

Run: `npm run validate && npm test -- src/content`

Expected: success message with 38 entries and all content tests PASS. Convert `/Users/aleksandrlossenko/Downloads/IMG_0057.heic` to a temporary JPEG if needed, then compare the resulting lesson file against both photographed columns from top to bottom.

- [ ] **Step 7: Commit the content layer**

```bash
git add src/content scripts/validate-content.ts
git commit -m "feat: add validated Spanish starter lesson"
```

---

### Task 3: Pure answer and quiz engine

**Files:**
- Create: `src/exercises/answers.ts`
- Create: `src/exercises/answers.test.ts`
- Create: `src/exercises/engine.ts`
- Create: `src/exercises/engine.test.ts`

**Interfaces:**
- Consumes: `VocabularyEntry` from Task 2.
- Produces: `Direction`, `Prompt`, `MultipleChoiceQuestion`, `ExamScore`, `normalizeAnswer`, `acceptedAnswers`, `isCorrectAnswer`, `createMultipleChoice`, `createExam`, and `scoreExam`.

- [ ] **Step 1: Write failing answer-normalization tests**

```ts
import { describe, expect, it } from 'vitest';
import { isCorrectAnswer, normalizeAnswer } from './answers';
import type { VocabularyEntry } from '../content/types';

const entry: VocabularyEntry = {
  id: 'morning', groupId: 'g', spanish: '¡Buenos días!',
  german: ['Guten Morgen!', 'Guten Tag!'], kind: 'phrase',
};

describe('answers', () => {
  it('ignores case, repeated space, and optional outer punctuation', () => {
    expect(normalizeAnswer('  ¿QUÉ   TAL? ')).toBe('qué tal');
    expect(isCorrectAnswer('guten   morgen', entry, 'es-de')).toBe(true);
  });
  it('keeps meaningful accents', () => {
    expect(normalizeAnswer('días')).not.toBe(normalizeAnswer('dias'));
    expect(isCorrectAnswer('Buenos dias', entry, 'de-es')).toBe(false);
  });
});
```

- [ ] **Step 2: Run answer tests and verify the expected failure**

Run: `npm test -- src/exercises/answers.test.ts`

Expected: FAIL because `answers.ts` does not exist.

- [ ] **Step 3: Implement exact answer rules**

```ts
export type Direction = 'es-de' | 'de-es';

export function normalizeAnswer(value: string): string {
  return value
    .normalize('NFC')
    .trim()
    .toLocaleLowerCase('de-DE')
    .replace(/^[¿¡]+|[?!¡¿.…]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function acceptedAnswers(entry: VocabularyEntry, direction: Direction): string[] {
  return direction === 'es-de'
    ? [...entry.german, ...(entry.acceptedGerman ?? [])]
    : [entry.spanish, ...(entry.acceptedSpanish ?? [])];
}

export function isCorrectAnswer(value: string, entry: VocabularyEntry, direction: Direction): boolean {
  const normalized = normalizeAnswer(value);
  return acceptedAnswers(entry, direction).some((answer) => normalizeAnswer(answer) === normalized);
}
```

- [ ] **Step 4: Write failing engine tests**

Test a four-entry fixture. Assert that multiple choice returns exactly four normalized-distinct options including the correct answer; a 0-valued deterministic RNG creates a stable question; exam generation includes every entry once; directions contain both values under a controlled RNG sequence; and `scoreExam` returns exact totals plus missed entry ids.

```ts
it('covers every entry exactly once in an exam', () => {
  const questions = createExam(entries, sequenceRandom([0.1, 0.9, 0.2, 0.8, 0.4, 0.6]));
  expect(new Set(questions.map((question) => question.entryId))).toEqual(new Set(entries.map((entry) => entry.id)));
  expect(questions).toHaveLength(entries.length);
});
```

- [ ] **Step 5: Run engine tests and verify the expected failure**

Run: `npm test -- src/exercises/engine.test.ts`

Expected: FAIL because `engine.ts` does not exist.

- [ ] **Step 6: Implement deterministic question generation and scoring**

Use these public contracts:

```ts
export type RandomSource = () => number;
export interface Prompt {
  entryId: string;
  direction: Direction;
  prompt: string;
  answers: string[];
}
export interface MultipleChoiceQuestion extends Prompt {
  options: string[];
}
export interface ExamAnswer { entryId: string; value: string; }
export interface ExamScore { total: number; correct: number; percentage: number; missedEntryIds: string[]; }

export function createMultipleChoice(
  entries: VocabularyEntry[], entryId: string, direction: Direction, random: RandomSource = Math.random,
): MultipleChoiceQuestion;
export function createExam(entries: VocabularyEntry[], random: RandomSource = Math.random): Prompt[];
export function scoreExam(questions: Prompt[], values: Record<string, string>, entries: VocabularyEntry[]): ExamScore;
```

Use Fisher–Yates with the injected random source. Deduplicate distractors by `normalizeAnswer`. If a lesson has fewer than four distinct answers, return every distinct option instead of duplicating. Calculate percentage as `Math.round(correct / total * 100)`, with zero entries yielding zero.

- [ ] **Step 7: Verify all pure-engine tests**

Run: `npm test -- src/exercises`

Expected: all normalization, choice, exam, and scoring tests PASS.

- [ ] **Step 8: Commit the exercise engine**

```bash
git add src/exercises
git commit -m "feat: add deterministic vocabulary exercise engine"
```

---

### Task 4: Versioned progress store and React provider

**Files:**
- Create: `src/progress/types.ts`
- Create: `src/progress/store.ts`
- Create: `src/progress/store.test.ts`
- Create: `src/progress/ProgressProvider.tsx`
- Create: `src/components/StorageNotice.tsx`

**Interfaces:**
- Consumes: lesson/entry ids and exercise directions.
- Produces: `AppProgress`, `SavedSession`, `ExamAttempt`, `ProgressStore`, `createProgressStore(storage?)`, `ProgressProvider`, and `useProgress()`.

- [ ] **Step 1: Define persistence contracts**

```ts
export type StudyStatus = 'new' | 'known' | 'practice';
export type ExerciseMode = 'learn' | 'multiple-choice' | 'writing' | 'exam';

export interface EntryProgress {
  attempts: number;
  correct: number;
  status: StudyStatus;
}
export interface SessionAnswer {
  entryId: string;
  value: string;
  direction?: 'es-de' | 'de-es';
  correct?: boolean;
}
export interface SavedSession {
  lessonId: string;
  mode: ExerciseMode;
  entryIds: string[];
  index: number;
  direction: 'es-de' | 'de-es' | 'mixed';
  answers: SessionAnswer[];
  updatedAt: string;
}
export interface ExamAttempt {
  lessonId: string;
  completedAt: string;
  percentage: number;
  missedEntryIds: string[];
}
export interface AppProgress {
  version: 1;
  entries: Record<string, EntryProgress>;
  sessions: Record<string, SavedSession>;
  exams: Record<string, ExamAttempt[]>;
}
```

- [ ] **Step 2: Write failing store tests**

Use an in-test `MemoryStorage implements Storage`. Cover empty initialization, entry updates, session round trips, exam history, a version-0 migration fixture shaped as `{ version: 0, knownIds: ['hola'] }` (migrated to a v1 `known` entry with empty sessions/exams), malformed JSON backup under `lernraum.progress.corrupt.<timestamp>`, and a storage object whose `setItem` throws. Assert the final case reports `persistence: 'memory'` while later reads still return updates.

```ts
it('falls back to memory when persistent writes fail', () => {
  const broken = new MemoryStorage();
  broken.setItem = () => { throw new DOMException('blocked'); };
  const store = createProgressStore(broken);
  store.updateEntry('hola', true);
  expect(store.snapshot().entries.hola?.correct).toBe(1);
  expect(store.status().persistence).toBe('memory');
});
```

- [ ] **Step 3: Run store tests and verify the expected failure**

Run: `npm test -- src/progress/store.test.ts`

Expected: FAIL because `store.ts` does not exist.

- [ ] **Step 4: Implement the store as a small observable**

```ts
export interface ProgressStore {
  snapshot(): AppProgress;
  status(): { persistence: 'persistent' | 'memory'; warning?: string };
  subscribe(listener: () => void): () => void;
  updateEntry(entryId: string, correct: boolean): void;
  setStudyStatus(entryId: string, status: StudyStatus): void;
  saveSession(session: SavedSession): void;
  clearSession(lessonId: string, mode: ExerciseMode): void;
  recordExam(attempt: ExamAttempt): void;
}

export const PROGRESS_KEY = 'lernraum.progress.v1';
export function sessionKey(lessonId: string, mode: ExerciseMode) {
  return `${lessonId}:${mode}`;
}
```

Clone state at mutation boundaries, write after every mutation, notify subscribers once, and retain state in memory if serialization or storage fails. Preserve malformed persisted text under a timestamped diagnostic key when storage permits, then replace active state with an empty v1 document.

- [ ] **Step 5: Connect the store to React**

`ProgressProvider({ children, store? })` owns one store instance unless a store is injected by a test, uses `useSyncExternalStore`, and exposes state, status, and mutation methods through context. `useProgress()` throws `useProgress muss innerhalb von ProgressProvider verwendet werden` when called outside the provider. `StorageNotice` renders `Dein Fortschritt kann in diesem Browser nicht gespeichert werden.` only for memory fallback.

- [ ] **Step 6: Verify store and provider behavior**

Run: `npm test -- src/progress && npm run build`

Expected: progress tests PASS and strict production compilation succeeds.

- [ ] **Step 7: Commit local persistence**

```bash
git add src/progress src/components/StorageNotice.tsx
git commit -m "feat: persist versioned learning progress"
```

---

### Task 5: Family PIN gate

**Files:**
- Create: `scripts/set-pin.mjs`
- Create: `src/auth/pin-config.ts`
- Create: `src/auth/pin.ts`
- Create: `src/auth/pin.test.ts`
- Create: `src/auth/PinGate.tsx`
- Create: `src/auth/PinGate.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Web Crypto, browser storage, and the separately supplied six-digit PIN.
- Produces: `PinConfig`, `derivePin(pin, config)`, `verifyPin(pin, config)`, `isUnlocked(config)`, `rememberUnlock(config)`, `logout()`, and `PinGate`.

- [ ] **Step 1: Write failing cryptographic behavior tests**

```ts
import { describe, expect, it } from 'vitest';
import { derivePin, verifyPin } from './pin';
import type { PinConfig } from './pin';

const config: PinConfig = {
  saltHex: '00112233445566778899aabbccddeeff',
  hashHex: '',
  iterations: 100,
  credentialVersion: 'test-v1',
};

it('accepts only the pin that produced the verifier', async () => {
  const hashHex = await derivePin('123456', config);
  const ready = { ...config, hashHex };
  expect(await verifyPin('123456', ready)).toBe(true);
  expect(await verifyPin('654321', ready)).toBe(false);
});
```

Also test that `rememberUnlock` stores only the credential version under `lernraum.auth`, `isUnlocked` rejects a changed version, and `logout` removes the marker.

- [ ] **Step 2: Run PIN tests and verify the expected failure**

Run: `npm test -- src/auth/pin.test.ts`

Expected: FAIL because the PIN module does not exist.

- [ ] **Step 3: Implement PBKDF2 and remembered state**

Use `crypto.subtle.importKey` plus `deriveBits` with PBKDF2/SHA-256. Convert hex with explicit byte helpers. Compare equal-length byte arrays without an early return. Reject input not matching `^\d{6}$` before derivation. Production config uses 310,000 iterations; tests inject 100 for speed.

```ts
export interface PinConfig {
  saltHex: string;
  hashHex: string;
  iterations: number;
  credentialVersion: string;
}

export const AUTH_KEY = 'lernraum.auth';
export async function derivePin(pin: string, config: PinConfig): Promise<string>;
export async function verifyPin(pin: string, config: PinConfig): Promise<boolean>;
export function isUnlocked(config: PinConfig, storage: Storage = localStorage): boolean;
export function rememberUnlock(config: PinConfig, storage: Storage = localStorage): void;
export function logout(storage: Storage = localStorage): void;
```

- [ ] **Step 4: Create the local verifier generator**

`scripts/set-pin.mjs` prompts once through `readline/promises`, requires exactly six digits, creates a 16-byte random salt, derives 32 bytes with `pbkdf2Sync(pin, salt, 310_000, 32, 'sha256')`, and writes a TypeScript object to `src/auth/pin-config.ts`. Set `credentialVersion` to the first 12 hex characters of `sha256(salt || hash)` so changing the PIN logs out remembered browsers. The generated file contains only salt, hash, iteration count, and credential version.

```js
import { createHash, pbkdf2Sync, randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';

const prompt = createInterface({ input: process.stdin, output: process.stdout });
const pin = await prompt.question('Neue sechsstellige PIN: ');
prompt.close();
if (!/^\d{6}$/.test(pin)) throw new Error('Die PIN muss genau sechs Ziffern haben.');

const salt = randomBytes(16);
const hash = pbkdf2Sync(pin, salt, 310_000, 32, 'sha256');
const credentialVersion = createHash('sha256').update(salt).update(hash).digest('hex').slice(0, 12);
const source = `export const pinConfig = ${JSON.stringify({
  saltHex: salt.toString('hex'), hashHex: hash.toString('hex'),
  iterations: 310_000, credentialVersion,
}, null, 2)} as const;\n`;
await writeFile(new URL('../src/auth/pin-config.ts', import.meta.url), source, 'utf8');
```

Run `npm run set-pin` in a PTY and enter the approved family PIN from the project context. Then run `rg -n` with that six-digit value against the workspace and verify it returns no repository matches.

- [ ] **Step 5: Write failing lock-screen interaction tests**

Use fake timers and a mocked `verifyPin`. Assert German labels, digit-only/max-length input, successful child rendering, remembered unlock, logout compatibility, generic error `Der PIN stimmt nicht. Versuch es noch einmal.`, and a 30-second lock after five failed submissions.

```tsx
it('shows the protected content after a correct pin', async () => {
  vi.mocked(verifyPin).mockResolvedValue(true);
  render(<PinGate><h1>Fächer</h1></PinGate>);
  await user.type(screen.getByLabelText('Familien-PIN'), '123456');
  await user.click(screen.getByRole('button', { name: 'Öffnen' }));
  expect(await screen.findByRole('heading', { name: 'Fächer' })).toBeInTheDocument();
});
```

- [ ] **Step 6: Implement `PinGate`**

Render a branded lock card with `Lernraum`, `Dein Platz zum Üben`, `Familien-PIN`, `Öffnen`, and the casual-security copy `Nur für unseren Lernbereich – keine sensiblen Daten speichern.`. Maintain failed-count and lock-until state in component memory. Disable the submit button while deriving and while locked; announce errors/timer through `role="status"`. On success call `rememberUnlock` and render children.

```tsx
async function handleSubmit(event: FormEvent) {
  event.preventDefault();
  if (Date.now() < lockedUntil) return;
  setChecking(true);
  const accepted = await verifyPin(pin, pinConfig);
  setChecking(false);
  if (accepted) {
    rememberUnlock(pinConfig);
    setUnlocked(true);
    setMessage('');
    return;
  }
  const nextFailures = failures + 1;
  setFailures(nextFailures);
  setMessage('Der PIN stimmt nicht. Versuch es noch einmal.');
  if (nextFailures >= 5) setLockedUntil(Date.now() + 30_000);
}
```

Wrap the existing app content with `<PinGate>` in `App.tsx`.

- [ ] **Step 7: Verify authentication without exposing the PIN**

Run: `npm test -- src/auth && npm run build`

Expected: all auth tests PASS and the build succeeds. Search the repository for the supplied digits and confirm zero matches.

- [ ] **Step 8: Commit the PIN gate**

```bash
git add scripts/set-pin.mjs src/auth src/App.tsx
git commit -m "feat: add family pin gate"
```

---

### Task 6: Subject and lesson browsing flow

**Files:**
- Create: `src/components/AppLayout.tsx`
- Create: `src/components/ErrorBoundary.tsx`
- Create: `src/components/ProgressBar.tsx`
- Create: `src/screens/HomePage.tsx`
- Create: `src/screens/SubjectPage.tsx`
- Create: `src/screens/LessonPage.tsx`
- Create: `src/screens/NotFoundPage.tsx`
- Create: `src/screens/catalog-flow.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: content catalog, `ProgressProvider`, `PinGate`, and auth logout.
- Produces: hash routes `/`, `/subjects/:subjectId`, `/subjects/:subjectId/lessons/:lessonId`, and reusable layout/progress components.

- [ ] **Step 1: Write failing catalog-flow tests**

Render routes under `MemoryRouter` and `ProgressProvider` with memory storage. Verify:

```tsx
it('navigates from subjects to the Spanish lesson modes', async () => {
  renderCatalogAt('/');
  await user.click(screen.getByRole('link', { name: /Spanisch/ }));
  expect(screen.getByRole('heading', { name: 'Spanisch' })).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: /Erste Wörter/ }));
  expect(screen.getByRole('heading', { name: 'Begrüßen und vorstellen' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Lernen/ })).toBeInTheDocument();
  expect(screen.getByText('38 Wörter und Wendungen')).toBeInTheDocument();
});
```

Add cases for an unknown subject, unknown lesson, initial `0 von 38 gelernt`, and `Abmelden` removing the auth marker.

- [ ] **Step 2: Run catalog-flow tests and verify the expected failure**

Run: `npm test -- src/screens/catalog-flow.test.tsx`

Expected: FAIL because the screens do not exist.

- [ ] **Step 3: Implement the route tree and lookups**

Export `AppRoutes` separately for memory-router tests. Production `App` composes:

```tsx
<ErrorBoundary>
  <PinGate>
    <ProgressProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </ProgressProvider>
  </PinGate>
</ErrorBoundary>
```

`AppRoutes` maps the three catalog routes and `*` to `NotFoundPage`. Mode links point to their final paths but Task 6 tests do not follow them; Tasks 7 and 8 register the exercise route elements when those components exist.

- [ ] **Step 4: Implement German catalog screens**

`HomePage` displays `Fächer`, `Was möchtest du heute üben?`, and one subject card. `SubjectPage` reads `subjectId`, shows lesson cards in catalog order, and derives known counts plus best exam percentage from progress. `LessonPage` reads both ids, verifies their relationship, shows `38 Wörter und Wendungen`, and renders mode cards:

- `Lernen` — `Karten ansehen und selbst einschätzen`
- `Multiple Choice` — `Die richtige Übersetzung auswählen`
- `Schreiben` — `Übersetzungen selbst eingeben`
- `Prüfung` — `Alle Wörter ohne direkte Hinweise testen`

Use one data-driven mode list so labels, descriptions, and paths cannot drift:

```ts
const modes = [
  { slug: 'lernen', title: 'Lernen', description: 'Karten ansehen und selbst einschätzen' },
  { slug: 'auswahl', title: 'Multiple Choice', description: 'Die richtige Übersetzung auswählen' },
  { slug: 'schreiben', title: 'Schreiben', description: 'Übersetzungen selbst eingeben' },
  { slug: 'pruefung', title: 'Prüfung', description: 'Alle Wörter ohne direkte Hinweise testen' },
] as const;
```

Unknown or mismatched ids render `Diesen Lerninhalt gibt es nicht.` with `Zurück zu den Fächern`.

- [ ] **Step 5: Finish the responsive visual system**

Expand `global.css` with a centered `min(1120px, calc(100% - 32px))` content container, paper cards, subject accent strips, pill progress, 48 px minimum touch targets, two-column cards above 720 px, and a four-card lesson-mode grid above 920 px. Use CSS gradients/shapes only; make no external font or image requests. Add success and error styles with both icon/text and color.

`ProgressBar` renders a visible label and native semantics:

```tsx
<div
  className="progress-track"
  role="progressbar"
  aria-label={label}
  aria-valuemin={0}
  aria-valuemax={total}
  aria-valuenow={value}
>
  <span style={{ width: `${total === 0 ? 0 : (value / total) * 100}%` }} />
</div>
```

- [ ] **Step 6: Verify catalog UX**

Run: `npm test -- src/screens/catalog-flow.test.tsx && npm run build`

Expected: navigation/error tests PASS and the production build succeeds.

- [ ] **Step 7: Commit the catalog experience**

```bash
git add src/App.tsx src/components src/screens src/styles/global.css
git commit -m "feat: add subject and lesson catalog"
```

---

### Task 7: Flashcards and multiple-choice practice

**Files:**
- Create: `src/components/DirectionPicker.tsx`
- Create: `src/screens/exercises/LearnMode.tsx`
- Create: `src/screens/exercises/LearnMode.test.tsx`
- Create: `src/screens/exercises/MultipleChoiceMode.tsx`
- Create: `src/screens/exercises/MultipleChoiceMode.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: lesson lookup, exercise engine, and `useProgress()` methods.
- Produces: routes ending `/lernen` and `/auswahl`; `DirectionPicker`; resumable saved sessions for modes `learn` and `multiple-choice`.

- [ ] **Step 1: Write failing flashcard tests**

Test direction selection, reveal-before-rating, `Kann ich`, `Noch üben`, keyboard reveal, progress text, and session resume. Use a two-entry lesson fixture and a memory progress store.

```tsx
it('requires reveal before the student can rate a card', async () => {
  renderLearnMode();
  expect(screen.queryByRole('button', { name: 'Kann ich' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Antwort zeigen' }));
  expect(screen.getByText('Hallo!')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Kann ich' }));
  expect(progressStore.snapshot().entries.hola?.status).toBe('known');
});
```

- [ ] **Step 2: Run flashcard tests and verify the expected failure**

Run: `npm test -- src/screens/exercises/LearnMode.test.tsx`

Expected: FAIL because `LearnMode` does not exist.

- [ ] **Step 3: Implement flashcards and resume**

Before a session begins, `DirectionPicker` offers `Spanisch → Deutsch` and `Deutsch → Spanisch`. Create/shuffle one entry-id queue, save it after every rating, and resume when a matching saved session exists. A large button/card toggles the translation. Show the attached example below the revealed answer. At the end clear the session and show known/practice totals plus `Noch einmal` and `Zur Lektion`.

Prioritize `practice` entries on a subsequent new run by placing them before a shuffled remainder; never omit entries.

```ts
const orderedIds = [
  ...shuffle(entries.filter((entry) => progress.entries[entry.id]?.status === 'practice'), random),
  ...shuffle(entries.filter((entry) => progress.entries[entry.id]?.status !== 'practice'), random),
].map((entry) => entry.id);

function rate(status: 'known' | 'practice') {
  setStudyStatus(currentEntry.id, status);
  saveSession({ ...session, index: session.index + 1, updatedAt: new Date().toISOString() });
}
```

- [ ] **Step 4: Write failing multiple-choice tests**

Assert four options, exactly one correct option, immediate `Richtig!` / `Nicht ganz.` feedback, disabled options after choice, explicit `Weiter`, entry attempt recording, completion summary, and resume at the saved index.

- [ ] **Step 5: Run multiple-choice tests and verify the expected failure**

Run: `npm test -- src/screens/exercises/MultipleChoiceMode.test.tsx`

Expected: FAIL because `MultipleChoiceMode` does not exist.

- [ ] **Step 6: Implement multiple choice**

Build one `MultipleChoiceQuestion` at the saved queue index. Do not advance on option click; reveal status and the correct translation, then advance through `Weiter`. Call `updateEntry(entryId, correct)` once per question and persist `SessionAnswer`. On final advance, clear the session and show correct count and percentage.

```ts
function choose(value: string) {
  if (selected !== null) return;
  const correct = question.answers.some((answer) => normalizeAnswer(answer) === normalizeAnswer(value));
  setSelected(value);
  updateEntry(question.entryId, correct);
  saveSession({
    ...session,
    answers: [...session.answers, { entryId: question.entryId, value, direction: question.direction, correct }],
    updatedAt: new Date().toISOString(),
  });
}
```

- [ ] **Step 7: Register practice routes and verify both modes**

Add:

```tsx
<Route path="/subjects/:subjectId/lessons/:lessonId/lernen" element={<LearnMode />} />
<Route path="/subjects/:subjectId/lessons/:lessonId/auswahl" element={<MultipleChoiceMode />} />
```

Run: `npm test -- src/screens/exercises/LearnMode.test.tsx src/screens/exercises/MultipleChoiceMode.test.tsx && npm run build`

Expected: both interaction suites PASS and strict build succeeds.

- [ ] **Step 8: Commit the first two exercise modes**

```bash
git add src/App.tsx src/components/DirectionPicker.tsx src/screens/exercises src/styles/global.css
git commit -m "feat: add flashcard and choice practice"
```

---

### Task 8: Writing practice and whole-lesson exam

**Files:**
- Create: `src/screens/exercises/WritingMode.tsx`
- Create: `src/screens/exercises/WritingMode.test.tsx`
- Create: `src/screens/exercises/ExamMode.tsx`
- Create: `src/screens/exercises/ExamMode.test.tsx`
- Create: `src/screens/exercises/ResultPanel.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `isCorrectAnswer`, `createExam`, `scoreExam`, and progress sessions/results.
- Produces: routes ending `/schreiben` and `/pruefung`, plus `ResultPanel` and missed-entry retry links.

- [ ] **Step 1: Write failing writing-mode tests**

Assert mixed directions, submit-on-form behavior, acceptance of case/spacing and stored synonyms, rejection of missing Spanish accents, visible expected answer after failure, disabled editing after submit, `Weiter`, attempt recording, completion result, and saved-session resume.

```tsx
it('keeps the answer visible until the student chooses Weiter', async () => {
  renderWritingMode();
  await user.type(screen.getByLabelText('Deine Übersetzung'), 'falsch');
  await user.click(screen.getByRole('button', { name: 'Prüfen' }));
  expect(screen.getByText(/Richtig wäre:/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Weiter' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run writing tests and verify the expected failure**

Run: `npm test -- src/screens/exercises/WritingMode.test.tsx`

Expected: FAIL because `WritingMode` does not exist.

- [ ] **Step 3: Implement writing practice**

Create a mixed-direction prompt queue with every entry once. Use an accessible `<form>` with autocomplete/spellcheck disabled, but do not intercept normal accented-character input. Store the submitted value and correctness, update entry progress once, and require `Weiter` after feedback. Clear the session on completion and render `ResultPanel`.

```ts
function submitAnswer(event: FormEvent) {
  event.preventDefault();
  if (submitted) return;
  const correct = isCorrectAnswer(value, currentEntry, currentPrompt.direction);
  updateEntry(currentEntry.id, correct);
  setSubmitted({ value, correct });
  saveSession({
    ...session,
    answers: [...session.answers, { entryId: currentEntry.id, value, direction: currentPrompt.direction, correct }],
    updatedAt: new Date().toISOString(),
  });
}
```

- [ ] **Step 4: Write failing exam tests**

Assert all entry ids appear exactly once, there is no correctness message while answering, Back/Next preserves values, empty answers are allowed but score incorrect, submission requires confirmation, exact percentage and missed list appear only after submission, the attempt is persisted, and `Fehler wiederholen` opens writing mode with only missed ids.

```tsx
it('withholds correctness until the whole exam is submitted', async () => {
  renderExamMode();
  await user.type(screen.getByLabelText('Deine Übersetzung'), 'Hallo!');
  await user.click(screen.getByRole('button', { name: 'Nächste Aufgabe' }));
  expect(screen.queryByText('Richtig!')).not.toBeInTheDocument();
  expect(screen.queryByText('Nicht ganz.')).not.toBeInTheDocument();
});
```

- [ ] **Step 5: Run exam tests and verify the expected failure**

Run: `npm test -- src/screens/exercises/ExamMode.test.tsx`

Expected: FAIL because `ExamMode` does not exist.

- [ ] **Step 6: Implement exam, result review, and missed retry**

Persist the generated ordered questions through entry ids plus direction in session answers so a reload keeps the same exam. Show `Aufgabe X von 38`, navigation, and `Prüfung abgeben`. Confirmation copy is `Wirklich abgeben? Danach siehst du alle Ergebnisse.`. After scoring, call `updateEntry` once for every scored answer, record an `ExamAttempt`, clear the exam session, and list each prompt, submitted value, and accepted value with text/icon status.

```ts
function submitExam() {
  if (!window.confirm('Wirklich abgeben? Danach siehst du alle Ergebnisse.')) return;
  const score = scoreExam(questions, values, lesson.entries);
  for (const question of questions) {
    const entry = lesson.entries.find((item) => item.id === question.entryId)!;
    updateEntry(entry.id, isCorrectAnswer(values[entry.id] ?? '', entry, question.direction));
  }
  recordExam({
    lessonId: lesson.id,
    completedAt: new Date().toISOString(),
    percentage: score.percentage,
    missedEntryIds: score.missedEntryIds,
  });
  clearSession(lesson.id, 'exam');
  setResult(score);
}
```

`Fehler wiederholen` navigates to writing mode with `?entries=id1,id2`; `WritingMode` validates these ids against the lesson and uses that subset. An invalid or empty subset falls back to all lesson entries.

- [ ] **Step 7: Register routes and verify both typed modes**

```tsx
<Route path="/subjects/:subjectId/lessons/:lessonId/schreiben" element={<WritingMode />} />
<Route path="/subjects/:subjectId/lessons/:lessonId/pruefung" element={<ExamMode />} />
```

Run: `npm test -- src/screens/exercises/WritingMode.test.tsx src/screens/exercises/ExamMode.test.tsx && npm run build`

Expected: tests PASS; build contains all four working exercise routes.

- [ ] **Step 8: Commit writing and exam flows**

```bash
git add src/App.tsx src/screens/exercises src/styles/global.css
git commit -m "feat: add writing practice and full exam"
```

---

### Task 9: Runtime recovery, accessibility, and integration coverage

**Files:**
- Modify: `src/components/ErrorBoundary.tsx`
- Modify: `src/components/StorageNotice.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: all completed app modules.
- Produces: German runtime recovery, persistent storage fallback notice, and an end-to-end component test across lock/catalog/lesson/practice.

- [ ] **Step 1: Write failing recovery and integration tests**

Add tests that force a child render error and expect `Etwas ist schiefgelaufen.` plus `Neu laden`; inject broken storage and expect the persistence warning; unlock the app, navigate to Spanish, open the lesson, complete one multiple-choice answer, navigate home, and assert the lesson progress changed.

```tsx
it('recovers from an unexpected render error in German', () => {
  const Broken = () => { throw new Error('boom'); };
  render(<ErrorBoundary><Broken /></ErrorBoundary>);
  expect(screen.getByRole('heading', { name: 'Etwas ist schiefgelaufen.' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Neu laden' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run recovery tests and verify the expected failure**

Run: `npm test -- src/App.test.tsx`

Expected: new recovery/integration assertions FAIL before final wiring.

- [ ] **Step 3: Finish recovery behavior and semantics**

Make the error boundary preserve a compact branded shell and use `window.location.reload()` only on explicit click. Put `StorageNotice` directly below the app header with `role="status"`. Audit all pages for one `h1`, logical heading order, labeled fields, button types, status announcements, and links that describe their destination.

```tsx
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="error-page">
        <p className="eyebrow">Lernraum</p>
        <h1>Etwas ist schiefgelaufen.</h1>
        <button type="button" onClick={() => window.location.reload()}>Neu laden</button>
      </main>
    );
  }
}
```

In CSS, ensure `:hover` styles are duplicated by `:focus-visible`, card animations are opacity/transform only, reduced motion disables them, and success/error backgrounds meet readable text contrast. At 320 px no horizontal scrolling is allowed.

- [ ] **Step 4: Run the full automated suite and coverage-sensitive checks**

Run: `npm test && npm run validate && npm run build`

Expected: every test PASS, validator reports 1 subject/1 lesson/38 entries, and the Vite production build completes with no TypeScript errors.

- [ ] **Step 5: Commit resilience work**

```bash
git add src
git commit -m "test: cover recovery and complete learning journey"
```

---

### Task 10: GitHub Pages workflow, documentation, and browser QA

**Files:**
- Create: `.github/workflows/deploy.yml`
- Create: `README.md`
- Modify: `index.html`
- Modify: `package.json`

**Interfaces:**
- Consumes: `npm ci`, `npm run validate`, `npm test`, and `npm run build` from prior tasks.
- Produces: automatic Pages deployment and exact owner instructions.

- [ ] **Step 1: Add the GitHub Pages workflow**

Use the current official Vite/GitHub Pages action majors and a build artifact:

```yaml
name: Deploy Lernraum to Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run validate
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v6
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v5
```

- [ ] **Step 2: Write bilingual operating documentation**

The German section documents unlock, subject selection, all four modes, local-only progress, logout, and the fact that browser-data deletion removes progress. The Russian section gives these exact owner steps:

1. create a public GitHub repository and push `main`;
2. open `Settings → Pages → Build and deployment → GitHub Actions`;
3. wait for `Deploy Lernraum to Pages` to pass and open its deployment URL;
4. send future assignment photographs for transcription into a new lesson file;
5. run `npm install`, `npm run validate`, `npm test`, and `npm run build` before pushing;
6. change the family PIN locally with `npm run set-pin`, commit only `src/auth/pin-config.ts`, and never type an account password into the script.

Include the security warning that the static site's lesson content remains publicly retrievable despite the PIN screen.

- [ ] **Step 3: Complete document metadata**

Set `<html lang="de">`, title `Lernraum – Spanisch üben`, a German description, theme color `#f6f3ea`, viewport metadata, and a small inline SVG favicon with an abstract `L` book mark. Add no analytics, trackers, remote fonts, or external images.

```html
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#f6f3ea" />
    <meta name="description" content="Spanische Wörter lernen und üben." />
    <title>Lernraum – Spanisch üben</title>
  </head>
</html>
```

- [ ] **Step 4: Run final non-browser verification**

Run: `npm ci && npm run validate && npm test && npm run build && git diff --check`

Expected: clean install, 38 validated entries, every test PASS, production output generated, and no whitespace errors.

- [ ] **Step 5: Run browser smoke tests at two viewports**

Start `npm run dev -- --host 127.0.0.1`. Using the in-app browser, verify at 390×844 and 1280×800:

1. wrong PIN shows the generic German error and correct PIN unlocks;
2. `Fächer → Spanisch → Begrüßen und vorstellen` works;
3. each of the four modes starts and can return safely;
4. a completed answer updates lesson progress after navigation;
5. reload preserves unlock and progress;
6. `Abmelden` restores the lock screen;
7. keyboard Tab order is logical and focus is always visible;
8. no layout causes horizontal scroll or clipped controls.

Inspect browser console output and require zero uncaught errors, React warnings, missing assets, and failed network requests.

- [ ] **Step 6: Fix only defects found by the smoke test and repeat verification**

For each observed defect, first add the smallest failing automated regression test, confirm it fails, implement the fix, rerun that test, then repeat Step 4 and the affected browser path.

- [ ] **Step 7: Commit deployment and documentation**

```bash
git add .github/workflows/deploy.yml README.md index.html package.json package-lock.json src
git commit -m "docs: add Pages deployment and operating guide"
```

- [ ] **Step 8: Confirm the deliverable state**

Run: `git status --short --branch && git log --oneline -10`

Expected: clean `main` worktree with the design, this plan, and implementation commits visible. Publishing itself waits only for the user's GitHub repository URL/remote, which is outside local implementation scope.
