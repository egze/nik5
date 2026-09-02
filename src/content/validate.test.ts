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
