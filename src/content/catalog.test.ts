import { describe, expect, it } from 'vitest';
import { getLesson, getSubject, lessons } from './catalog';
import { spanish01 } from './lessons/spanish-01';

describe('first Spanish lesson', () => {
  it('contains the 38 bold photographed entries', () => {
    expect(getSubject('spanish')?.lessonIds).toEqual(['spanish-01']);
    expect(getLesson('spanish-01')?.entries).toHaveLength(38);
    expect(lessons[0]?.entries.at(-1)?.spanish).toBe('la isla');
  });

  it('keeps the complete Spanish transcription and primary German translations in source order', () => {
    expect(spanish01.entries.map((entry) => [entry.spanish, entry.german[0]])).toEqual([
      ['el día', 'der Tag'],
      ['¡Buenos días!', 'Guten Morgen!'],
      ['¡Buenas tardes!', 'Guten Tag!'],
      ['¡Buenas noches!', 'Guten Abend!'],
      ['en alemán', 'auf Deutsch'],
      ['se dice...', 'man sagt ...'],
      ['¡Hola!', 'Hallo!'],
      ['¿Qué tal?', 'Wie geht’s?'],
      ['bien', 'gut'],
      ['Gracias.', 'Danke.'],
      ['y', 'und'],
      ['tú', 'du'],
      ['también', 'auch'],
      ['yo', 'ich'],
      ['(Yo) soy...', 'Ich bin ...'],
      ['¿Cómo te llamas?', 'Wie heißt du?'],
      ['¿Cómo...?', 'Wie ...?'],
      ['Me llamo...', 'Ich heiße ...'],
      ['Perdón.', 'Entschuldigung.'],
      ['¿De dónde eres?', 'Woher kommst du?'],
      ['¿De dónde...?', 'Woher ...?'],
      ['Soy de...', 'Ich komme aus ...'],
      ['de', 'von'],
      ['Alemania', 'Deutschland'],
      ['¡Adiós!', 'Auf Wiedersehen!'],
      ['¡Hasta luego!', 'Bis später!'],
      ['muy', 'sehr'],
      ['así, así', 'so einigermaßen'],
      ['mal', 'schlecht'],
      ['fatal', '(sehr) schlecht'],
      ['el barco', 'das Schiff'],
      ['el caballo', 'das Pferd'],
      ['el dado', 'der Würfel'],
      ['el elefante', 'der Elefant'],
      ['la foca', 'die Robbe'],
      ['el gato', 'die Katze'],
      ['el hueso', 'der Knochen'],
      ['la isla', 'die Insel'],
    ]);
  });

  it('keeps each photographed example and required answer variant', () => {
    expect(spanish01.entries
      .filter((entry) => entry.example)
      .map(({ id, example }) => ({ id, example })))
      .toEqual([
        {
          id: 'se-dice',
          example: {
            spanish: 'En alemán “buenos días” se dice “Guten Tag”.',
            german: '„Buenos días“ heißt „Guten Tag“ auf Deutsch.',
          },
        },
        {
          id: 'soy',
          example: { spanish: '—Soy Ali.\n—Yo soy Natalia.', german: '— Ich bin Ali.\n— Ich bin Natalia.' },
        },
        {
          id: 'me-llamo',
          example: { spanish: 'Me llamo Thomas.', german: 'Ich heiße Thomas.' },
        },
        {
          id: 'soy-de',
          example: { spanish: 'Soy de Alemania.', german: 'Ich komme aus Deutschland.' },
        },
        {
          id: 'fatal',
          example: { spanish: '—¿Qué tal?\n—Fatal.', german: '– Wie geht’s?\n– Gar nicht gut.' },
        },
      ]);
    expect(spanish01.entries
      .filter((entry) => entry.acceptedSpanish || entry.acceptedGerman)
      .map(({ id, acceptedSpanish, acceptedGerman }) => ({ id, acceptedSpanish, acceptedGerman })))
      .toEqual([
        { id: 'se-dice', acceptedSpanish: undefined, acceptedGerman: ['heißt ...'] },
        { id: 'soy', acceptedSpanish: ['soy...'], acceptedGerman: undefined },
        { id: 'fatal', acceptedSpanish: undefined, acceptedGerman: ['schlecht'] },
      ]);
  });
});
