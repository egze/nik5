import { describe, expect, it } from 'vitest';
import { catalogSummary, validateCatalog } from './validate';
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

  it('rejects a lesson without groups or entries', () => {
    const invalid = { ...lesson, groups: [], entries: [] };

    expect(validateCatalog([subject], [invalid])).toEqual(expect.arrayContaining([
      'Lektion one: Gruppen fehlen',
      'Lektion one: Einträge fehlen',
    ]));
  });

  it('rejects a group that has no vocabulary entries', () => {
    const invalid = {
      ...lesson,
      groups: [...lesson.groups, { id: 'unused', title: 'Leer' }],
    };

    expect(validateCatalog([subject], [invalid])).toContain('Lektion one, Gruppe unused: enthält keine Einträge');
  });

  it('rejects duplicate entry ids across lessons', () => {
    const secondLesson: Lesson = {
      ...lesson,
      id: 'two',
      entries: [{ ...lesson.entries[0]! }],
    };
    const multiLessonSubject = { ...subject, lessonIds: ['one', 'two'] };

    expect(validateCatalog([multiLessonSubject], [lesson, secondLesson])).toContain(
      'Lektion two: Eintrag-ID hola ist bereits in Lektion one vergeben',
    );
  });

  it('derives the validation summary from every subject, lesson, and entry', () => {
    const frenchSubject: Subject = {
      ...subject,
      id: 'french',
      name: 'Französisch',
      lessonIds: ['two'],
    };
    const frenchLesson: Lesson = {
      ...lesson,
      id: 'two',
      subjectId: 'french',
      entries: [{ ...lesson.entries[0]!, id: 'bonjour', spanish: 'Bonjour!' }],
    };

    expect(catalogSummary([subject, frenchSubject], [lesson, frenchLesson])).toBe(
      'Inhalte geprüft: 2 Fächer, 2 Lektionen, 2 Einträge.',
    );
  });
});
