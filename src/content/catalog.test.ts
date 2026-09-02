import { describe, expect, it } from 'vitest';
import { getLesson, getSubject, lessons } from './catalog';

describe('first Spanish lesson', () => {
  it('contains the 38 bold photographed entries', () => {
    expect(getSubject('spanish')?.lessonIds).toEqual(['spanish-01']);
    expect(getLesson('spanish-01')?.entries).toHaveLength(38);
    expect(lessons[0]?.entries.at(-1)?.spanish).toBe('la isla');
  });
});
