export type EntryKind = 'word' | 'phrase';

export interface ExamplePair {
  spanish: string;
  german: string;
}

export interface VocabularyEntry {
  id: string;
  groupId: string;
  spanish: string;
  german: string[];
  kind: EntryKind;
  note?: string;
  acceptedSpanish?: string[];
  acceptedGerman?: string[];
  example?: ExamplePair;
}

export interface LessonGroup {
  id: string;
  title: string;
}

export interface Lesson {
  id: string;
  subjectId: string;
  title: string;
  subtitle: string;
  sourceDate: string;
  groups: LessonGroup[];
  entries: VocabularyEntry[];
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  icon: string;
  accent: string;
  lessonIds: string[];
}
