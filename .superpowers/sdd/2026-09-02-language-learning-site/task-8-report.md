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

## Fix Round 1 — reject mismatched subject/lesson persistence

### Finding and root cause

A URL could name a valid lesson under a subject that did not own it. Both exercise components computed the invalid ownership state, but their state initializers still read or created lesson sessions and their effects persisted those sessions before the later `MissingContent` render guard. Writing could overwrite a saved queue with query-selected IDs, while Exam could normalize and overwrite an existing saved answer order.

### RED

The regression tests seed valid sessions, capture the complete progress snapshot, render a mismatched subject with the valid `spanish-01` lesson, assert the German missing-content heading, and require the full snapshot to remain unchanged.

```text
npm test -- src/screens/exercises/WritingMode.test.tsx src/screens/exercises/ExamMode.test.tsx
Test Files  2 failed (2)
Tests       2 failed | 16 passed (18)

WritingMode changed spanish-01:writing from the saved hola queue to the
query-selected el-dia queue.

ExamMode reordered the saved spanish-01:exam answer descriptors to match
entryIds.
```

### GREEN implementation

- Converted each ownership expression to an explicit boolean.
- Each lazy initializer now returns an inert `{ needsSave: false }` state before reading or creating a session unless the lesson belongs to the route subject.
- Each initial persistence effect repeats the ownership check defensively before calling `saveSession`.
- Hook declaration order remains unchanged and every hook still runs before the missing-content return.

```text
npm test -- src/screens/exercises/WritingMode.test.tsx src/screens/exercises/ExamMode.test.tsx
Test Files  2 passed (2)
Tests       18 passed (18)
```

### Fix Round 1 verification

```text
npm test -- src/App.test.tsx
Test Files  1 passed (1)
Tests       3 passed (3)

npm test
Test Files  15 passed (15)
Tests       86 passed (86)

npm run build
Inhalte geprüft: 1 Fach, 1 Lektion, 38 Einträge.
TypeScript project build passed.
vite: 47 modules transformed; production bundle built successfully.
```

### Fix Round 1 files

- `src/screens/exercises/WritingMode.tsx`
- `src/screens/exercises/WritingMode.test.tsx`
- `src/screens/exercises/ExamMode.tsx`
- `src/screens/exercises/ExamMode.test.tsx`
- `.superpowers/sdd/2026-09-02-language-learning-site/task-8-report.md`

### Fix Round 1 review

- Mismatched subject/lesson routes still render `Diesen Lerninhalt gibt es nicht.` through the existing accessible `MissingContent` region.
- Such routes no longer read, generate, hydrate, save, clear, or otherwise mutate an exercise session.
- Existing session data and the complete progress snapshot remain byte-for-byte equivalent at the value level after rendering either invalid route.
- Valid owned routes retain their existing queue creation, resume, scoring, retry, feedback, and accessibility behavior, as shown by the complete focused and full-suite runs.

### Fix Round 1 concerns

No new concerns. The original Node version caveat above remains applicable.

## Fix Round 2 — key stateful sessions to route identity

### Finding and root cause

Fix Round 1 prevented persistence while ownership was invalid, but the route-aware ownership value and the stateful session initializer still lived in the same mounted component. React Router can reuse that component across same-pattern parameter changes. Because a lazy `useState` initializer runs only once while the save effect reran when ownership changed:

- invalid→valid retained an undefined initial session and kept rendering missing content;
- valid→invalid→valid retained stale local/initializer state and could replay the initial save over newer store progress;
- an in-place Writing retry-query change retained the previous retry queue.

### Fix Round 2 RED

Both test harnesses now use a real imperative memory router so each regression changes route parameters/query on the same mounted route tree. The new cases cover invalid→valid and valid→invalid→valid for both modes; Writing also covers a valid retry-query identity change.

```text
npm test -- src/screens/exercises/WritingMode.test.tsx src/screens/exercises/ExamMode.test.tsx
Test Files  2 failed (2)
Tests       5 failed | 18 passed (23)

WritingMode:
- invalid→valid remained on missing content;
- valid→invalid→valid displayed the stale empty value instead of `aktuell`;
- entries=hola→entries=el-dia retained the hola queue.

ExamMode:
- invalid→valid remained on missing content;
- valid→invalid→valid returned to Aufgabe 1 instead of current Aufgabe 2.
```

### Fix Round 2 GREEN implementation

- `WritingMode` and `ExamMode` are now stateless route/ownership guards. Invalid ownership renders `MissingContent` without mounting any session logic.
- Each valid route renders a dedicated stateful inner component keyed by the validated subject/lesson identity.
- Writing’s key additionally includes a semantic retry identity: `default`, the unique validated retry IDs, or the full-lesson invalid-query fallback. Semantically equivalent duplicate/invalid query spellings do not force unnecessary remounts.
- Leaving a valid route unmounts the inner session. Returning creates a fresh lifecycle that reads current progress, so stale local/initializer values cannot overwrite newer store state.
- The initial save effect no longer depends on route ownership. It belongs to one keyed inner mount and only persists when that mount actually created or hydrated a session.

```text
npm test -- src/screens/exercises/WritingMode.test.tsx src/screens/exercises/ExamMode.test.tsx
Test Files  2 passed (2)
Tests       23 passed (23)
```

### Fix Round 2 verification

```text
npm test -- src/App.test.tsx
Test Files  1 passed (1)
Tests       3 passed (3)

npm test
Test Files  15 passed (15)
Tests       91 passed (91)

npm run build
Inhalte geprüft: 1 Fach, 1 Lektion, 38 Einträge.
TypeScript project build passed.
vite: 47 modules transformed; production bundle built successfully.
```

### Fix Round 2 files

- `src/screens/exercises/WritingMode.tsx`
- `src/screens/exercises/WritingMode.test.tsx`
- `src/screens/exercises/ExamMode.tsx`
- `src/screens/exercises/ExamMode.test.tsx`
- `.superpowers/sdd/2026-09-02-language-learning-site/task-8-report.md`

### Fix Round 2 review

- Ownership is validated before a stateful session component exists, so invalid routes cannot read, create, hydrate, persist, or retain lesson session state.
- Valid route identity changes and writing retry identity changes explicitly remount the state owner. The new mount initializes from the latest immutable progress snapshot.
- The initial save cannot replay on invalid/valid transitions because the component that owns that effect is unmounted while invalid.
- In-place transition tests prove saved values, current exam index, updated external progress, and retry subsets all survive or change exactly as intended.
- Existing German missing-content output, labelled controls, feedback, scoring, and accessibility behavior are unchanged.

### Fix Round 2 concerns

No new concerns. The original Node version caveat remains applicable.
