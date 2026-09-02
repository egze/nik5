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

  it('accepts explicitly listed alternate answers', () => {
    const withAlternates = { ...entry, acceptedGerman: ['Morgen!'], acceptedSpanish: ['Buenos dias!'] };
    expect(isCorrectAnswer('morgen', withAlternates, 'es-de')).toBe(true);
    expect(isCorrectAnswer('Buenos dias!', withAlternates, 'de-es')).toBe(true);
  });
});
