// Relation alias map. Spec §1.5.
// Importer feeds the messy bilingual values (with whitespace) into normalizeRelation.

export type RelationEnum =
  | 'SELF'
  | 'SPOUSE'
  | 'SON'
  | 'DAUGHTER'
  | 'DAUGHTER_IN_LAW'
  | 'MOTHER'
  | 'FATHER'
  | 'GRANDSON'
  | 'GRANDDAUGHTER'
  | 'OTHER';

const RELATION_ALIASES: Record<string, RelationEnum> = {
  // SELF
  'પોતે': 'SELF',
  'self': 'SELF',

  // SPOUSE
  'પત્ની': 'SPOUSE',
  'wife': 'SPOUSE',
  'પતિ': 'SPOUSE',
  'husband': 'SPOUSE',

  // SON
  'પુત્ર': 'SON',
  'son': 'SON',
  'put': 'SON', // typo seen in source

  // DAUGHTER
  'પુત્રી': 'DAUGHTER',
  'daughter': 'DAUGHTER',

  // DAUGHTER_IN_LAW
  'પુત્રવધુ': 'DAUGHTER_IN_LAW',
  'પુત્રવધૂ': 'DAUGHTER_IN_LAW',
  'daughter in law': 'DAUGHTER_IN_LAW',
  'daughter-in-law': 'DAUGHTER_IN_LAW',

  // MOTHER
  'માતા': 'MOTHER',
  'mother': 'MOTHER',
  'mom': 'MOTHER',

  // FATHER
  'પિતા': 'FATHER',
  'father': 'FATHER',
  'dad': 'FATHER',

  // GRANDSON
  'પૌત્ર': 'GRANDSON',
  'grandson': 'GRANDSON',

  // GRANDDAUGHTER
  'પૌત્રી': 'GRANDDAUGHTER',
  'granddaughter': 'GRANDDAUGHTER',
};

export function normalizeRelation(raw: unknown): RelationEnum {
  if (raw === null || raw === undefined) return 'OTHER';
  const key = String(raw).trim().toLowerCase();
  if (!key) return 'OTHER';
  return RELATION_ALIASES[key] ?? 'OTHER';
}

export function isSelfRelation(raw: unknown): boolean {
  return normalizeRelation(raw) === 'SELF';
}
