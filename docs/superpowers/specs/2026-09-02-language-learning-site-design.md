# Design: private-feeling language practice site on GitHub Pages

## Purpose

Build a German-language learning site for a fifth-grade student. The site turns photographed school vocabulary assignments into focused lessons and exercises. A parent will send new assignments to the maintainer, who will add each one as a new content file. The first release contains Spanish; the structure must support additional school subjects later.

The application is deliberately static so that it can be hosted at no cost on GitHub Pages. It has no accounts, server, database, cloud synchronization, or in-browser content editor.

## Success criteria

- A student can open the site on a phone, tablet, or desktop, unlock it with the family PIN, choose `Spanisch`, choose a lesson, and practise every vocabulary item from that lesson.
- The first lesson contains every legible bold vocabulary entry in the supplied textbook photograph. Blue sample sentences are attached as examples rather than counted as additional required vocabulary.
- The student can learn with flashcards, answer multiple-choice questions, type translations, and complete an exam covering the whole lesson.
- Progress, known/difficult words, unfinished sessions, and exam results survive a browser restart on the same device.
- Adding a lesson requires a new lesson data file and a catalog entry, not changes to exercise components.
- A push to the main branch runs validation and tests, builds the site, and deploys it to GitHub Pages.

## Language and tone

All student-facing copy is German. Labels are short and appropriate for a ten- or eleven-year-old, without making the interface feel childish. The visual language is warm, calm, and modern: generous spacing, rounded cards, clear typography, strong focus states, and restrained subject colors.

The repository contains:

- a German README section explaining how to use the site;
- a Russian README section explaining how the parent can publish updates and request new lessons.

## Information architecture

The application uses hash-based client-side routes so direct links and browser refreshes work reliably under a GitHub Pages project path.

1. **Lock screen** — PIN entry before the learning interface is shown.
2. **Fächer** — homepage with subject cards. `Spanisch` is active in the first release; future subjects use the same card and catalog model.
3. **Spanisch** — lesson list showing title, short description, vocabulary count, and local completion progress.
4. **Lesson overview** — lesson summary and four exercise choices: `Lernen`, `Multiple Choice`, `Schreiben`, and `Prüfung`.
5. **Exercise session** — one focused task at a time, a clear progress indicator, and an exit action that preserves the unfinished session.
6. **Result view** — score, correct/incorrect counts, missed items, and `Fehler wiederholen`.

A persistent compact header contains a home link, the current location, and `Abmelden`. Mobile navigation remains single-column and touch-friendly.

## Technical architecture

Use React, TypeScript, and Vite. The application is split into independent modules:

- **catalog** — subject and lesson metadata;
- **content** — typed lesson files containing vocabulary and examples;
- **exercise engine** — pure functions that generate directions, distractors, answer checks, and exam questions;
- **progress store** — versioned local persistence with a session fallback;
- **authentication gate** — client-side PIN verification and remembered unlock state;
- **screens/components** — routing, layout, lesson browsing, exercise interactions, and results.

UI components consume typed catalog and exercise interfaces rather than importing lesson files directly. Exercise-generation logic stays independent of React so it is deterministic and easy to test.

## Content model

Each subject defines:

- stable identifier;
- German display name and description;
- icon and visual accent;
- ordered lesson references.

Each lesson defines:

- stable identifier and subject identifier;
- German title, subtitle, and source date;
- one or more thematic groups;
- an ordered set of vocabulary entries.

Each vocabulary entry defines:

- stable identifier;
- Spanish text;
- one or more accepted German translations;
- type: `word` or `phrase`;
- optional Spanish/German example pair;
- optional accepted answer variants when the textbook gives synonyms.

Source photographs are not published in the site or repository. Only the transcribed vocabulary and short examples required for study are stored.

A schema validator runs before tests and production builds. It rejects missing translations, empty groups, duplicate identifiers, invalid subject references, and malformed examples. Invalid content fails the build with the lesson and entry identifier in the error message.

## Exercise behavior

### Lernen

- Shows one side of a vocabulary card and reveals the translation on tap or keyboard action.
- Allows `Kann ich` and `Noch üben` after the answer is revealed.
- Supports Spanish-to-German and German-to-Spanish direction; the student may switch direction before starting.
- Prioritizes `Noch üben` items on later passes without hiding any lesson entries.

### Multiple Choice

- Presents four distinct options where the lesson has enough entries.
- Draws plausible distractors from the same lesson and avoids duplicate equivalent translations.
- Gives immediate correct/incorrect feedback before advancing.
- Records results for each vocabulary entry.

### Schreiben

- Randomizes Spanish-to-German and German-to-Spanish prompts.
- Ignores capitalization, repeated whitespace, and optional outer Spanish `¿…?` / `¡…!` punctuation.
- Requires meaningful spelling, including Spanish accented letters and `ñ`.
- Accepts every explicit translation or answer variant stored on the vocabulary entry.
- After a wrong answer, shows the expected answer and requires an explicit `Weiter` action.

### Prüfung

- Includes every vocabulary entry in the selected lesson exactly once.
- Randomizes direction and order, and gives no correctness feedback until submission.
- Shows the exact percentage and item-level review rather than an invented school grade.
- Offers a new practice session containing only missed entries.

## Progress and persistence

Progress is saved in `localStorage` under a namespaced key and contains a schema version. It tracks:

- per-entry attempts, correct answers, and `Kann ich` / `Noch üben` status;
- completed and unfinished exercise sessions;
- exam attempts and latest/best percentages;
- the current authentication-unlock marker.

The store validates loaded data and migrates known older versions. If stored data is corrupt, it preserves the bad payload under a diagnostic key, starts cleanly, and shows a German notice. If persistent browser storage is unavailable, the site remains usable with in-memory progress for the current tab and explains that results will not be saved.

## PIN gate and security boundary

The initial six-digit family PIN has been supplied separately. The repository never contains the PIN in plain text. A local setup command derives and writes a salted, deliberately slow verification value; the client uses the Web Crypto API to verify entered digits. Successful authentication is remembered on that browser until `Abmelden`, site-data deletion, or a credential-version change.

The lock screen rate-limits repeated attempts in the current browser and never reveals whether a partial PIN is correct.

This is explicitly a casual-access barrier, not secure authorization. GitHub Pages serves static assets publicly, including compiled lesson content and the client-side verifier. The UI and documentation must not imply that sensitive or personal information can be safely stored behind this gate.

## Error handling and accessibility

- Unknown routes show a German recovery page with a link to `Fächer`.
- Missing subjects or lessons show a non-technical German message and a safe navigation path.
- Content validation catches authoring failures before deployment; an application error boundary handles unexpected runtime failures.
- All exercises work with touch and keyboard.
- Buttons, inputs, feedback, and progress indicators have accessible names and visible focus.
- Correctness never relies on color alone; icons and text accompany success/error colors.
- Motion respects `prefers-reduced-motion`.
- Layout targets small phones first and scales cleanly to tablet and desktop widths.

## Deployment

The repository includes a GitHub Actions workflow for GitHub Pages. On a push to the main branch it:

1. installs locked dependencies;
2. validates lesson data;
3. runs automated tests;
4. creates a production build;
5. uploads and deploys the Pages artifact.

The Vite asset base and hash routing are configured to work both on a user site and under a repository subpath. No custom domain is required.

## Verification strategy

Automated unit tests cover:

- content validation;
- answer normalization, accents, punctuation, and accepted variants;
- multiple-choice distractor uniqueness;
- whole-lesson exam coverage and scoring;
- progress serialization, migration, corruption recovery, and storage fallback;
- PIN verification and remembered/logout behavior.

Component-level tests cover the lock screen, catalog navigation, each exercise flow, result review, and German error states. A production build and a browser smoke test verify the complete flow at mobile and desktop widths before delivery.

## First-release content

The supplied Spanish vocabulary page becomes one lesson, organized into greeting/introduction phrases, conversational modifiers, and nouns. Bold headwords and phrases are required study entries; blue lines are examples attached to the related entry. German alternatives separated by punctuation in the textbook are stored as accepted translations. Before release, the transcription is checked visually against the source photograph a second time.

## Out of scope for the first release

- user accounts or cloud synchronization;
- a secure private-data boundary;
- automatic photo upload or OCR in the browser;
- an administrative content editor;
- speech recording, pronunciation grading, or generated audio;
- leaderboards, multiplayer features, or notifications;
- additional school subjects before Spanish is proven with real use.
