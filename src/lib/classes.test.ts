import { describe, expect, it } from 'vitest';
import { CLASSES, CLASS_BY_ID, CLASS_GROUPS, jobIconUrl, resolveGender } from './classes';

describe('CLASSES', () => {
  // Pins the shape the picker consumes against classes.json, which is generated
  // from ragassets by `node tools/sync-classes.mjs`. If a sync changes any of
  // these, it is a user-visible change and belongs in the changelog.
  it.each([
    { id: 0, name: 'Aprendiz', group: 'novice', genders: ['male', 'female'] },
    { id: 4069, name: 'Musa', group: 'third', genders: ['female'] }, // female-locked
    { id: 4263, name: 'Poeta', group: 'fourth', genders: ['male'] }, // male-locked
    { id: 4302, name: 'Mestre Celestial', group: 'expanded', genders: ['male', 'female'] }, // renderId 4302, client id 4309
    { id: 4218, name: 'Invocador', group: 'doram', genders: ['male', 'female'] },
    { id: 4308, name: 'Druida', group: 'doram', genders: ['male', 'female'] }, // doram 4th, renderId 4308, client id 4315
  ])('exposes $name as $id', (expected) => {
    expect(CLASS_BY_ID.get(expected.id)).toEqual(expected);
  });

  it('has no id collisions and no class outside CLASS_GROUPS', () => {
    expect(CLASS_BY_ID.size).toBe(CLASSES.length);
    const keys = new Set(CLASS_GROUPS.map((g) => g.key));
    expect(CLASSES.filter((c) => !keys.has(c.group))).toEqual([]);
  });
});

describe('resolveGender', () => {
  it('keeps the desired gender when the class has it', () => {
    expect(resolveGender(0, 'female')).toBe('female');
  });

  it('falls back to the only gender a locked class has', () => {
    expect(resolveGender(4069, 'male')).toBe('female'); // Musa
    expect(resolveGender(4263, 'female')).toBe('male'); // Poeta
  });

  it('leaves an unknown class alone', () => {
    expect(resolveGender(-1, 'female')).toBe('female');
  });
});

describe('jobIconUrl', () => {
  it('points at the party emblem for the class id', () => {
    expect(jobIconUrl(4302)).toBe('https://assets.latam-tools.com.br/icons/job/4302.png');
  });
});
