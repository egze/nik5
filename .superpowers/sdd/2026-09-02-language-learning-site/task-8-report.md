# Task 8 report — writing practice and whole-lesson exam

## Implementation

- Added `/schreiben` with one mixed-direction prompt per selected entry, a labelled native form, persisted in-progress input, answer normalization through `isCorrectAnswer`, locked post-submit feedback, explicit `Weiter`, exactly one recorded attempt per submitted prompt, saved-session resume, and a shared completion result.
- Added `/pruefung` with one `createExam` question per lesson entry, persistent order/direction/value state, unrestricted Back/Next navigation including empty answers, no correctness feedback before confirmed final submission, `scoreExam` scoring, one progress update per entry, one stored `ExamAttempt`, session clearing, and a complete accessible review.
- Added shared `ResultPanel` presentation for count/percentage, lesson navigation, missed-entry retry, and exam review rows.
- Added validated `?entries=id1,id2` writing retries. Unique current-lesson IDs select only that subset; any empty segment, empty query, or unknown ID falls back to all lesson entries.
- Registered `/schreiben` and `/pruefung` and added responsive styles for forms, feedback, exam navigation, and result review.

## RED / GREEN record

### Writing mode

RED command and expected result:

```text
npm test -- src/screens/exercises/WritingMode.test.tsx
Test Files  1 failed (1)
Tests       no tests
Failed to resolve import "./WritingMode" because the component did not exist.
```

Initial GREEN command and result:

```text
npm test -- src/screens/exercises/WritingMode.test.tsx
Test Files  1 passed (1)
Tests       10 passed (10)
```

Retry-parser regression RED:

```text
npm test -- src/screens/exercises/WritingMode.test.tsx
Test Files  1 failed (1)
Tests       1 failed | 10 passed (11)
Expected malformed entries=hola, to fall back to 38 entries; received 1.
```

Final writing GREEN:

```text
npm test -- src/screens/exercises/WritingMode.test.tsx
Test Files  1 passed (1)
Tests       11 passed (11)
```

### Exam mode

RED command and expected result:

```text
npm test -- src/screens/exercises/ExamMode.test.tsx
Test Files  1 failed (1)
Tests       no tests
Failed to resolve import "./ExamMode" because the component did not exist.
```

GREEN command and result:

```text
npm test -- src/screens/exercises/ExamMode.test.tsx
Test Files  1 passed (1)
Tests       5 passed (5)
```

The first post-implementation run had one ambiguous test query because `der Tag` correctly appeared as both the submitted and accepted answer. Scoping was already correct; changing the assertion to require both visible instances produced the GREEN result above.

### Routes

RED command and expected result:

```text
npm test -- src/App.test.tsx
Test Files  1 failed (1)
Tests       2 failed | 1 passed (3)
Both new URLs rendered the Not Found page before route registration.
```

GREEN integration command and result:

```text
npm test -- src/App.test.tsx src/screens/exercises/WritingMode.test.tsx src/screens/exercises/ExamMode.test.tsx
Test Files  3 passed (3)
Tests       18 passed (18)
```

## Verification

Baseline before Task 8:

```text
npm test
Test Files  13 passed (13)
Tests       66 passed (66)
```

Final focused modes:

```text
npm test -- src/screens/exercises/WritingMode.test.tsx src/screens/exercises/ExamMode.test.tsx
Test Files  2 passed (2)
Tests       16 passed (16)
```

Final full suite:

```text
npm test
Test Files  15 passed (15)
Tests       84 passed (84)
```

Final production build:

```text
npm run build
Inhalte geprüft: 1 Fach, 1 Lektion, 38 Einträge.
TypeScript project build passed.
vite: 47 modules transformed; production bundle built successfully.
```

The first sandboxed build could not create the `tsx` IPC socket (`listen EPERM`). The permitted rerun reached TypeScript and identified two narrowing errors. A typed local direction in `ExamMode` and a stable narrowed direction in `WritingMode` resolved them; `npx tsc -b --pretty false` and the final build then exited successfully.

## Files

- `src/screens/exercises/WritingMode.tsx`
- `src/screens/exercises/WritingMode.test.tsx`
- `src/screens/exercises/ExamMode.tsx`
- `src/screens/exercises/ExamMode.test.tsx`
- `src/screens/exercises/ResultPanel.tsx`
- `src/App.tsx`
- `src/App.test.tsx`
- `src/styles/global.css`
- `.superpowers/sdd/2026-09-02-language-learning-site/task-8-report.md`

## Self-review

### Resume and persistence

- New writing and exam sessions store the complete randomized entry order and one answer record per entry before interaction. Every record stores its exact direction and current value, so remounts do not regenerate questions or discard typed text.
- Writing additionally stores correctness after submission. Reloading submitted feedback never calls `updateEntry` again; only a fresh form submission records an attempt.
- An ordinary writing visit resumes any valid unfinished current-lesson queue. An explicit retry query resumes only a session matching that exact validated subset; otherwise it starts the requested retry or the full-lesson fallback.
- Exam sessions resume only when all current lesson IDs occur exactly once, the index is in range, and the mode/lesson/direction metadata matches. Legacy incomplete answer descriptors are hydrated once and immediately persisted.

### Scoring and mutation safety

- Writing delegates normalization, punctuation, synonyms, and accent-sensitive comparison to `isCorrectAnswer`, and guards already-submitted answers before recording progress.
- Exam generation delegates to `createExam`; final scoring delegates to `scoreExam`. The same persisted direction/value pairs create review rows and per-entry correctness values.
- A synchronous submission ref is set immediately after confirmation. It prevents repeat clicks from running the 38-entry mutation loop twice before React renders the result.
- Confirm cancellation leaves values, entry progress, exam history, and session intact. Confirmed submission updates every unique question exactly once, records one attempt with the exact score/missed IDs, then clears the session.
- Retry links are derived only from `scoreExam().missedEntryIds`; Writing Mode independently validates them against the current lesson before use.

### Accessibility and German copy

- Both answer inputs have explicit visible labels, preserve native accented-character input, disable autocomplete/spellcheck, and retain visible focus styles.
- Writing uses a native submit form and keeps the submitted value visible in a disabled input until `Weiter`. Feedback has German live text plus a visible icon hidden from assistive technology, so color is not the only status cue.
- Exam navigation consists of labelled native buttons with unavailable directions disabled. No correct/incorrect status or accepted answer appears before confirmed submission.
- Result score and progress updates use live/status semantics. Every review row includes German textual status, a complementary icon, prompt, submitted value (or `Keine Antwort`), and accepted value.
- All new headings, actions, confirmation text, statuses, and review labels are German.

## Concerns

- The verification host reports Node.js 26.5.0 while `package.json` declares `>=22 <23`. All tests, validation, TypeScript compilation, and bundling pass, but CI should continue to verify under the declared Node 22 range.
