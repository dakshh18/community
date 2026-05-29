// Profession category seed list + alias resolver. Spec §5.
// The importer (and `prisma:seed`) inserts these as ProfessionCategory rows
// and uses resolveProfessionCategoryName(raw) to pick a category for each Person.

export interface ProfessionCategorySeed {
  name: string;        // canonical English label
  nameGu: string;      // Gujarati label
  aliases: string[];   // lowercased/trimmed forms we match against
  icon?: string;
}

export const PROFESSION_CATEGORIES: ProfessionCategorySeed[] = [
  {
    name: 'Teacher',
    nameGu: 'શિક્ષક',
    aliases: ['શિક્ષક', 'મુખ્ય શિક્ષક', 'નિવૃત શિક્ષક', 'teacher'],
    icon: 'school',
  },
  {
    name: 'Doctor',
    nameGu: 'ડૉક્ટર',
    aliases: ['ડૉક્ટર', 'doctor', 'mbbs', 'અભ્યાસ મેડિકલ', 'in mbbs'],
    icon: 'stethoscope',
  },
  {
    name: 'Nurse',
    nameGu: 'નર્સ',
    aliases: ['સ્ટાફ નર્સ', 'nurse', 'staff nurse', 'નર્સ'],
    icon: 'medical-bag',
  },
  {
    name: 'Engineer',
    nameGu: 'એન્જિનિયર',
    aliases: [
      'એન્જીનીયર',
      'એન્જિનિયર',
      'સોફ્ટવેર એન્જીનીયર',
      'મિકેનિકલ એન્જીનીયર',
      'engineer',
      'be computer',
      'software engineer',
    ],
    icon: 'engineering',
  },
  {
    name: 'Homemaker',
    nameGu: 'ગૃહિણી',
    aliases: ['હાઉસ વાઈફ', 'હોઉસ વાઈફ', 'housewife', 'home maker', 'homemaker', 'ગૃહિણી'],
    icon: 'home',
  },
  {
    name: 'Business',
    nameGu: 'વ્યવસાય',
    aliases: ['બિઝનેસ', 'business', 'વેપાર', 'વ્યવસાય'],
    icon: 'briefcase',
  },
  {
    name: 'Service/Job',
    nameGu: 'નોકરી',
    aliases: ['જોબ', 'job', 'નોકરી', 'staff', 'આસી મેનેજર', 'asst manager'],
    icon: 'work',
  },
  {
    name: 'Student',
    nameGu: 'વિદ્યાર્થી',
    aliases: [
      'અભ્યાસ',
      'study',
      'student',
      'std-10',
      '10th',
      '12th',
      'b.sc',
      'bsc',
      'in college',
      'વિદ્યાર્થી',
    ],
    icon: 'book',
  },
  {
    name: 'Retired',
    nameGu: 'નિવૃત',
    aliases: ['નિવૃત', 'retired', 'નિવૃત્ત'],
    icon: 'time',
  },
  {
    name: 'Other',
    nameGu: 'અન્ય',
    aliases: [],
    icon: 'dots-horizontal',
  },
];

function canon(s: string): string {
  return s.trim().toLowerCase();
}

// Precomputed map: alias -> canonical category name.
const ALIAS_INDEX: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const cat of PROFESSION_CATEGORIES) {
    for (const a of cat.aliases) m.set(canon(a), cat.name);
    m.set(canon(cat.name), cat.name);
    m.set(canon(cat.nameGu), cat.name);
  }
  return m;
})();

/**
 * Resolves messy raw profession text to a canonical category name.
 * Falls back to substring matching if no exact alias match. Returns null
 * when nothing matches — the importer should leave professionCatId unset.
 */
export function resolveProfessionCategoryName(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const key = canon(String(raw));
  if (!key) return null;

  const direct = ALIAS_INDEX.get(key);
  if (direct) return direct;

  // Substring fallback: e.g. "નિવૃત શિક્ષક" already aliased, but odd cases like
  // "in mbbs final year" should still hit Doctor via "mbbs".
  for (const [alias, name] of ALIAS_INDEX.entries()) {
    if (!alias) continue;
    if (key.includes(alias)) return name;
  }
  return null;
}
