import type { Lesson, Subject, VocabularyEntry } from './types';

const hasDisplayValue = (value: string) => value.trim().length > 0;

const labelForCount = (count: number, singular: string, plural: string) => (
  `${count} ${count === 1 ? singular : plural}`
);

export const catalogSummary = (subjects: Subject[], lessons: Lesson[]) => {
  const entryCount = lessons.reduce((total, lesson) => total + lesson.entries.length, 0);
  return `Inhalte geprüft: ${labelForCount(subjects.length, 'Fach', 'Fächer')}, ${labelForCount(lessons.length, 'Lektion', 'Lektionen')}, ${labelForCount(entryCount, 'Eintrag', 'Einträge')}.`;
};

const collectDuplicateIds = (ids: string[], label: string, errors: string[]) => {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`doppelter ${label} ${id}`);
    seen.add(id);
  }
};

const validateEntry = (lesson: Lesson, entry: VocabularyEntry, groupIds: Set<string>, errors: string[]) => {
  const context = `Lektion ${lesson.id}, Eintrag ${entry.id}`;
  if (!hasDisplayValue(entry.id)) errors.push(`Lektion ${lesson.id}: Eintrag-ID fehlt`);
  if (!hasDisplayValue(entry.spanish)) errors.push(`${context}: spanische Anzeige fehlt`);
  if (entry.german.length === 0 || entry.german.some((translation) => !hasDisplayValue(translation))) {
    errors.push(`${context}: deutsche Übersetzung fehlt`);
  }
  if (!groupIds.has(entry.groupId)) errors.push(`${context}: unbekannte Gruppe ${entry.groupId}`);
  if (entry.example && (!hasDisplayValue(entry.example.spanish) || !hasDisplayValue(entry.example.german))) {
    errors.push(`${context}: unvollständiges Beispiel`);
  }
};

export const validateCatalog = (subjects: Subject[], lessons: Lesson[]): string[] => {
  const errors: string[] = [];
  collectDuplicateIds(subjects.map((subject) => subject.id), 'Fach', errors);
  collectDuplicateIds(lessons.map((lesson) => lesson.id), 'Lektion', errors);

  const subjectIds = new Set(subjects.map((subject) => subject.id));
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const lessonByEntryId = new Map<string, string>();

  for (const subject of subjects) {
    if (!hasDisplayValue(subject.id)) errors.push('Fach-ID fehlt');
    if (!hasDisplayValue(subject.name)) errors.push(`Fach ${subject.id}: Name fehlt`);
    if (!hasDisplayValue(subject.description)) errors.push(`Fach ${subject.id}: Beschreibung fehlt`);
    if (!hasDisplayValue(subject.icon)) errors.push(`Fach ${subject.id}: Icon fehlt`);
    if (!hasDisplayValue(subject.accent)) errors.push(`Fach ${subject.id}: Akzentfarbe fehlt`);
    collectDuplicateIds(subject.lessonIds, `Lektion in Fach ${subject.id}`, errors);
    for (const lessonId of subject.lessonIds) {
      const lesson = lessonById.get(lessonId);
      if (!lesson) errors.push(`Fach ${subject.id}: unbekannte Lektion ${lessonId}`);
      else if (lesson.subjectId !== subject.id) errors.push(`Fach ${subject.id}: Lektion ${lessonId} gehört zu ${lesson.subjectId}`);
    }
  }

  for (const lesson of lessons) {
    if (!hasDisplayValue(lesson.id)) errors.push('Lektions-ID fehlt');
    if (!hasDisplayValue(lesson.subjectId)) errors.push(`Lektion ${lesson.id}: Fach-ID fehlt`);
    if (!hasDisplayValue(lesson.title)) errors.push(`Lektion ${lesson.id}: Titel fehlt`);
    if (!hasDisplayValue(lesson.subtitle)) errors.push(`Lektion ${lesson.id}: Untertitel fehlt`);
    if (!hasDisplayValue(lesson.sourceDate)) errors.push(`Lektion ${lesson.id}: Quelldatum fehlt`);
    if (!subjectIds.has(lesson.subjectId)) errors.push(`Lektion ${lesson.id}: unbekanntes Fach ${lesson.subjectId}`);
    else if (!subjects.find((subject) => subject.id === lesson.subjectId)?.lessonIds.includes(lesson.id)) {
      errors.push(`Lektion ${lesson.id}: fehlt in Fach ${lesson.subjectId}`);
    }

    if (lesson.groups.length === 0) errors.push(`Lektion ${lesson.id}: Gruppen fehlen`);
    if (lesson.entries.length === 0) errors.push(`Lektion ${lesson.id}: Einträge fehlen`);

    collectDuplicateIds(lesson.groups.map((group) => group.id), `Gruppe in Lektion ${lesson.id}`, errors);
    const groupIds = new Set(lesson.groups.map((group) => group.id));
    const usedGroupIds = new Set(lesson.entries.map((entry) => entry.groupId));
    for (const group of lesson.groups) {
      if (!hasDisplayValue(group.id)) errors.push(`Lektion ${lesson.id}: Gruppen-ID fehlt`);
      if (!hasDisplayValue(group.title)) errors.push(`Lektion ${lesson.id}, Gruppe ${group.id}: Titel fehlt`);
      if (!usedGroupIds.has(group.id)) errors.push(`Lektion ${lesson.id}, Gruppe ${group.id}: enthält keine Einträge`);
    }

    const entryIds = new Set<string>();
    for (const entry of lesson.entries) {
      if (entryIds.has(entry.id)) errors.push(`Lektion ${lesson.id}: doppelter Eintrag ${entry.id}`);
      entryIds.add(entry.id);
      if (hasDisplayValue(entry.id)) {
        const firstLessonId = lessonByEntryId.get(entry.id);
        if (firstLessonId && firstLessonId !== lesson.id) {
          errors.push(`Lektion ${lesson.id}: Eintrag-ID ${entry.id} ist bereits in Lektion ${firstLessonId} vergeben`);
        } else {
          lessonByEntryId.set(entry.id, lesson.id);
        }
      }
      validateEntry(lesson, entry, groupIds, errors);
    }
  }

  return errors;
};
