import type { VocabularyEntry } from '../content/types';

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
