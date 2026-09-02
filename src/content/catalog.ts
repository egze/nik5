import { spanish01 } from './lessons/spanish-01';
import type { Lesson, Subject } from './types';

export const subjects: Subject[] = [{
  id: 'spanish',
  name: 'Spanisch',
  description: 'Wörter, Sätze und kleine Prüfungen',
  icon: '¡Hola!',
  accent: '#ed785f',
  lessonIds: ['spanish-01'],
}];

export const lessons: Lesson[] = [spanish01];
export const getSubject = (id: string) => subjects.find((subject) => subject.id === id);
export const getLesson = (id: string) => lessons.find((lesson) => lesson.id === id);
