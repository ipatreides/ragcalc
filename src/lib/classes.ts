import rawClasses from './classes.json';

export type Gender = 'male' | 'female';

// A playable class/job for the paperdoll. `id` is the sprite ClassNum sent as
// the `job` param to the ragassets gateway. `genders` lists which body sprites
// exist (some classes are gender-locked, e.g. Musa is female-only).
export interface CharClass {
  id: number;
  name: string;
  group: string;
  genders: Gender[];
}

// One record of classes.json, which is generated from ragassets by
// `node tools/sync-classes.mjs` and never edited by hand.
interface RawClass extends CharClass {
  /** Client JT constant (JT_SKY_EMPEROR). The stable key across client updates —
   *  names get retranslated, ids don't move — but nothing here reads it. */
  jt: string;
}

// Group display order + pt-BR labels for the grouped <select>.
export const CLASS_GROUPS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'novice', label: 'Inicial' },
  { key: 'first', label: 'Primeira Classe' },
  { key: 'second', label: 'Segunda Classe' },
  { key: 'trans', label: 'Transcendental' },
  { key: 'third', label: 'Terceira Classe' },
  { key: 'fourth', label: 'Quarta Classe' },
  { key: 'expanded', label: 'Classes Expandidas' },
  { key: 'doram', label: 'Doram' },
];

export const CLASSES: ReadonlyArray<CharClass> = (rawClasses.classes as RawClass[]).map(
  ({ id, name, group, genders }) => ({ id, name, group, genders }),
);

export const CLASS_BY_ID: ReadonlyMap<number, CharClass> = new Map(
  CLASSES.map((c) => [c.id, c]),
);

export const DEFAULT_CLASS_ID = 0; // Aprendiz

// Fall back to an available gender when the picked class is gender-locked.
export function resolveGender(classId: number, desired: Gender): Gender {
  const cls = CLASS_BY_ID.get(classId);
  if (!cls || cls.genders.length === 0) return desired;
  return cls.genders.includes(desired) ? desired : cls.genders[0]!;
}

// Party-emblem icon for a class (25×25). Every id in classes.json has one:
// ragassets serves the icon at the same id it renders the class at, and drops
// classes whose icon the server hasn't shipped.
export function jobIconUrl(id: number): string {
  return `https://assets.latam-tools.com.br/icons/job/${id}.png`;
}
