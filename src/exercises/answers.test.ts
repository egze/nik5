import { describe, expect, it } from 'vitest';
import { isCorrectAnswer, normalizeAnswer } from './answers';
import type { VocabularyEntry } from '../content/types';

const entry: VocabularyEntry = {
  id: 'morning', groupId: 'g', spanish: '¡Buenos días!',
  german: ['Guten Morgen!', 'Guten Tag!'], kind: 'phrase',
};

describe('answers', () => {
  it('ignores case, repeated space, and optional outer punctuation', () => {
    expect(normalizeAnswer('  ¿QUÉ   TAL? ')).toBe('que tal');
    expect(isCorrectAnswer('guten   morgen', entry, 'es-de')).toBe(true);
  });

  it('accepts missing accents', () => {
    expect(isCorrectAnswer('Buenos dias', entry, 'de-es')).toBe(true);
  });

  it.each([
    ['el pingüino', 'el pinguino'],
    ['España', 'Espana'],
    ['marrón', 'marron'],
    ['sí', 'si'],
    ['el delfín', 'el delfi\u0301n'],
  ])('accepts diacritic variants of %s', (spanish, answer) => {
    expect(isCorrectAnswer(answer, { ...entry, spanish }, 'de-es')).toBe(true);
  });

  it.each(['(Buenos días)', 'Buenos ¿días', '¡Buenos, días!', '[Buenos] {días}', 'Bue!nos días'])('accepts misplaced or extra punctuation in %s', (answer) => {
    expect(isCorrectAnswer(answer, entry, 'de-es')).toBe(true);
  });

  it('accepts missing brackets and punctuation from the expected answer', () => {
    const bracketed = { ...entry, spanish: '(Yo) soy...', german: ['die (kleine) Sache'] };
    expect(isCorrectAnswer('Yo soy', bracketed, 'de-es')).toBe(true);
    expect(isCorrectAnswer('die kleine Sache', bracketed, 'es-de')).toBe(true);
  });

  it('ignores apostrophe and hyphen differences', () => {
    const punctuation = { ...entry, german: ['Wie geht’s?', 'das W-Lan'] };
    expect(isCorrectAnswer("Wie geht's", punctuation, 'es-de')).toBe(true);
    expect(isCorrectAnswer('Wie gehts', punctuation, 'es-de')).toBe(true);
    expect(isCorrectAnswer('das WLAN', punctuation, 'es-de')).toBe(true);
  });

  it('still rejects missing words, wrong words, and punctuation-only answers', () => {
    for (const answer of ['Buenos', 'Buenas noches', '¿!().', '']) {
      expect(isCorrectAnswer(answer, entry, 'de-es')).toBe(false);
    }
  });

  it('accepts explicitly listed alternate answers', () => {
    const withAlternates = { ...entry, acceptedGerman: ['Morgen!'], acceptedSpanish: ['Buenos dias!'] };
    expect(isCorrectAnswer('morgen', withAlternates, 'es-de')).toBe(true);
    expect(isCorrectAnswer('Buenos dias!', withAlternates, 'de-es')).toBe(true);
  });
});
