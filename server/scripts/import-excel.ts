#!/usr/bin/env tsx
/**
 * Samaj Connect — Excel roster importer.
 *
 * Spec: server/SAMAJ_CONNECT_SPEC.md §1, §5, §7.
 *
 * Run: `npm run import -- ./data/community.xlsx`
 * Idempotent: rerun is safe — households dedupe on (nativePlace, householdPhone)
 * or (nativePlace, headName); persons dedupe on canonical phone or
 * (householdId, fullName).
 */

import 'dotenv/config';
import path from 'path';
import * as XLSX from 'xlsx';
import { PrismaClient, type Prisma } from '@prisma/client';

import { normalizePhone, toE164India } from '../src/utils/phone';
import { normalizeRelation, type RelationEnum } from '../src/utils/aliases/relation';
import {
  PROFESSION_CATEGORIES,
  resolveProfessionCategoryName,
} from '../src/utils/aliases/profession';

const HEADER_MARKER_A = 'અ.નં.';
const BLOOD_GROUP_RE = /^(A|B|AB|O)[+-]$/;

const prisma = new PrismaClient();

// ---------- Types ----------

interface RawPerson {
  fullName: string;
  relationRaw: string | null;
  dobRaw: unknown;
  professionRaw: string | null;
  phoneRaw: unknown;
  bloodGroup: string | null;
  sourceRow: number;
}

interface RawHousehold {
  nativePlace: string;
  headName: string;
  householdPhoneRaw: unknown;
  nativeAddress: string | null;
  vadodaraAddress: string | null;
  persons: RawPerson[];
  sourceRow: number;
}

interface ImportStats {
  sheets: number;
  households: number;
  persons: number;
  skippedRows: number;
  duplicatePhones: number;
  unresolvedProfessions: Set<string>;
  emptySheets: string[];
}

// ---------- Cell helpers ----------

function cellToStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return String(v);
  const s = String(v).trim();
  return s.length ? s : null;
}

function rowIsBlank(row: unknown[]): boolean {
  if (!row || row.length === 0) return true;
  return row.every((c) => c === null || c === undefined || String(c).trim() === '');
}

function parseDob(raw: unknown): Date | null {
  if (raw === null || raw === undefined) return null;
  if (raw instanceof Date) return isFinite(raw.getTime()) ? raw : null;

  if (typeof raw === 'number' && raw > 1 && raw < 100000) {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed && parsed.y > 1900 && parsed.y < 2100) {
      return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
    }
    return null;
  }

  const s = String(raw).trim();
  const m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  let year = parseInt(m[3], 10);
  if (year < 100) year += year >= 30 ? 1900 : 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function parseBloodGroup(raw: unknown): string | null {
  const s = cellToStr(raw);
  if (!s) return null;
  const up = s.toUpperCase().replace(/\s+/g, '');
  return BLOOD_GROUP_RE.test(up) ? up : null;
}

// ---------- Parsing ----------

function parseSheet(
  ws: XLSX.WorkSheet,
  sheetName: string,
  stats: ImportStats,
): RawHousehold[] {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: true,
  });

  const households: RawHousehold[] = [];

  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const a = rows[i]?.[0];
    if (a != null && String(a).trim() === HEADER_MARKER_A) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    stats.emptySheets.push(sheetName);
    return [];
  }

  let current: RawHousehold | null = null;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];

    if (rowIsBlank(row)) {
      if (current) {
        households.push(current);
        current = null;
      }
      continue;
    }

    const colA = row[0];
    const colB = cellToStr(row[1]);
    const colC = row[2];
    const colD = cellToStr(row[3]);
    const colE = cellToStr(row[4]);
    const colF = cellToStr(row[5]);
    const colG = cellToStr(row[6]);
    const colH = row[7];
    const colI = cellToStr(row[8]);
    const colJ = row[9];
    const colK = row[10];

    const aStr = colA === null || colA === undefined ? '' : String(colA).trim();
    const aIsNumber = aStr.length > 0 && /^\d+$/.test(aStr);

    // Numbered placeholder row with no head name and no person name: skip per §1.4.6.
    if (aIsNumber && !colB && !colF) {
      stats.skippedRows++;
      continue;
    }

    // New household block: number in col A AND head name in col B.
    if (aIsNumber && colB) {
      if (current) households.push(current);
      current = {
        nativePlace: sheetName,
        headName: colB,
        householdPhoneRaw: colC,
        nativeAddress: colD,
        vadodaraAddress: colE,
        persons: [],
        sourceRow: i + 1,
      };
    }

    if (current && colF) {
      current.persons.push({
        fullName: colF,
        relationRaw: colG,
        dobRaw: colH,
        professionRaw: colI,
        phoneRaw: colJ,
        bloodGroup: parseBloodGroup(colK),
        sourceRow: i + 1,
      });
    } else if (!current) {
      stats.skippedRows++;
    }
  }

  if (current) households.push(current);
  return households;
}

// ---------- DB ops ----------

async function seedProfessionCategories(): Promise<Map<string, string>> {
  const idByName = new Map<string, string>();
  for (const cat of PROFESSION_CATEGORIES) {
    const c = await prisma.professionCategory.upsert({
      where: { name: cat.name },
      create: {
        name: cat.name,
        nameGu: cat.nameGu,
        aliases: cat.aliases,
        icon: cat.icon,
      },
      update: {
        nameGu: cat.nameGu,
        aliases: cat.aliases,
        icon: cat.icon,
      },
    });
    idByName.set(cat.name, c.id);
  }
  return idByName;
}

async function findOrCreateHousehold(
  rh: RawHousehold,
  importBatchId: string,
): Promise<string> {
  const householdPhone = normalizePhone(rh.householdPhoneRaw);

  if (householdPhone) {
    const existing = await prisma.household.findFirst({
      where: { householdPhone, nativePlace: rh.nativePlace },
    });
    if (existing) {
      await prisma.household.update({
        where: { id: existing.id },
        data: {
          nativeAddress: rh.nativeAddress ?? existing.nativeAddress,
          vadodaraAddress: rh.vadodaraAddress ?? existing.vadodaraAddress,
        },
      });
      return existing.id;
    }
  }

  // Fallback: match an existing household by head name (only useful on re-run).
  const headByName = await prisma.person.findFirst({
    where: {
      fullName: rh.headName,
      household: { nativePlace: rh.nativePlace },
    },
    include: { household: true },
  });
  if (headByName?.household) return headByName.household.id;

  const created = await prisma.household.create({
    data: {
      nativePlace: rh.nativePlace,
      nativeAddress: rh.nativeAddress,
      vadodaraAddress: rh.vadodaraAddress,
      householdPhone: householdPhone ?? undefined,
      importBatchId,
    },
  });
  return created.id;
}

async function upsertPerson(
  raw: RawPerson,
  householdId: string,
  professionIdByName: Map<string, string>,
  stats: ImportStats,
): Promise<{ id: string; relation: RelationEnum }> {
  const phone = normalizePhone(raw.phoneRaw);
  const relation = normalizeRelation(raw.relationRaw);
  const dob = parseDob(raw.dobRaw);
  const profCatName = resolveProfessionCategoryName(raw.professionRaw);
  const profCatId = profCatName ? professionIdByName.get(profCatName) ?? null : null;

  if (raw.professionRaw && !profCatName) {
    stats.unresolvedProfessions.add(String(raw.professionRaw).trim());
  }

  // Lookup existing.
  let existing = null;
  if (phone) {
    existing = await prisma.person.findUnique({ where: { phone } });
    if (existing && existing.householdId !== householdId) {
      // Same phone, different household → most likely a person who appears
      // twice in the workbook (e.g. listed in two villages). Don't move them;
      // just count it and skip.
      stats.duplicatePhones++;
      return { id: existing.id, relation };
    }
  }
  if (!existing) {
    existing = await prisma.person.findFirst({
      where: { householdId, fullName: raw.fullName },
    });
  }

  if (existing) {
    const updateData: Prisma.PersonUpdateInput = {
      fullName: raw.fullName,
      relation,
      bloodGroup: raw.bloodGroup ?? existing.bloodGroup,
      professionRaw: raw.professionRaw ?? existing.professionRaw,
      ...(phone ? { phone, phoneE164: toE164India(phone) } : {}),
      ...(dob ? { dob } : {}),
      ...(profCatId
        ? { professionCat: { connect: { id: profCatId } } }
        : {}),
    };
    const updated = await prisma.person.update({
      where: { id: existing.id },
      data: updateData,
    });
    return { id: updated.id, relation };
  }

  const createData: Prisma.PersonCreateInput = {
    household: { connect: { id: householdId } },
    fullName: raw.fullName,
    relation,
    bloodGroup: raw.bloodGroup ?? undefined,
    professionRaw: raw.professionRaw ?? undefined,
    ...(phone ? { phone, phoneE164: toE164India(phone) ?? undefined } : {}),
    ...(dob ? { dob } : {}),
    ...(profCatId ? { professionCat: { connect: { id: profCatId } } } : {}),
  };
  const created = await prisma.person.create({ data: createData });
  return { id: created.id, relation };
}

async function linkHead(
  householdId: string,
  headName: string,
  persons: Array<{ id: string; relation: RelationEnum }>,
): Promise<void> {
  let headId = persons.find((p) => p.relation === 'SELF')?.id ?? null;

  if (!headId) {
    // Fall back to first person whose fullName matches the head name in col B.
    const byName = await prisma.person.findFirst({
      where: { householdId, fullName: headName },
    });
    headId = byName?.id ?? persons[0]?.id ?? null;
  }
  if (!headId) return;

  try {
    await prisma.household.update({
      where: { id: householdId },
      data: { headPersonId: headId },
    });
  } catch (e) {
    // headPersonId is @unique; conflict means another household already claims
    // this person as head (rare — usually phone-dedup collision). Log and move on.
    console.warn(
      `[head] skipped head link for household ${householdId}: ${(e as Error).message}`,
    );
  }
}

// ---------- Main ----------

async function main() {
  const fileArg = process.argv[2] ?? path.join('data', 'community.xlsx');
  const abs = path.resolve(fileArg);
  console.log(`[import] reading workbook: ${abs}`);

  const wb = XLSX.readFile(abs, { cellDates: true });
  console.log(`[import] sheets: ${wb.SheetNames.length}`);

  const stats: ImportStats = {
    sheets: wb.SheetNames.length,
    households: 0,
    persons: 0,
    skippedRows: 0,
    duplicatePhones: 0,
    unresolvedProfessions: new Set<string>(),
    emptySheets: [],
  };

  const batch = await prisma.importBatch.create({
    data: {
      fileName: path.basename(abs),
      totalSheets: wb.SheetNames.length,
      households: 0,
      persons: 0,
      skippedRows: 0,
    },
  });

  console.log('[import] seeding profession categories...');
  const profIdByName = await seedProfessionCategories();
  console.log(`[import] categories seeded: ${profIdByName.size}`);

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const blocks = parseSheet(ws, sheetName, stats);
    if (blocks.length === 0) {
      console.log(`[parse] "${sheetName}": empty / no header`);
      continue;
    }
    // Recover blocks where col F was left blank but col B has the head's name
    // and the row has a phone or Vadodara address — those are real households.
    let recovered = 0;
    let skipped = 0;
    for (const b of blocks) {
      if (b.persons.length > 0) continue;
      const hasPhone = normalizePhone(b.householdPhoneRaw) !== null;
      const hasAddr = !!(b.vadodaraAddress && b.vadodaraAddress.length > 2);
      if (b.headName && (hasPhone || hasAddr)) {
        b.persons.push({
          fullName: b.headName,
          relationRaw: 'પોતે',
          dobRaw: null,
          professionRaw: null,
          phoneRaw: b.householdPhoneRaw,
          bloodGroup: null,
          sourceRow: b.sourceRow,
        });
        recovered++;
      } else {
        skipped++;
      }
    }
    const nonEmpty = blocks.filter((b) => b.persons.length > 0);
    const tag =
      recovered || skipped
        ? ` (recovered ${recovered}, skipped ${skipped})`
        : '';
    console.log(`[parse] "${sheetName}": ${nonEmpty.length} households${tag}`);

    for (const rh of nonEmpty) {
      const householdId = await findOrCreateHousehold(rh, batch.id);
      stats.households++;

      const personRefs: Array<{ id: string; relation: RelationEnum }> = [];
      for (const rp of rh.persons) {
        const ref = await upsertPerson(rp, householdId, profIdByName, stats);
        personRefs.push(ref);
        stats.persons++;
      }

      await linkHead(householdId, rh.headName, personRefs);
    }
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      households: stats.households,
      persons: stats.persons,
      skippedRows: stats.skippedRows,
    },
  });

  console.log('\n========== Import Summary ==========');
  console.log(`Sheets read:               ${stats.sheets}`);
  console.log(`Households imported:       ${stats.households}`);
  console.log(`Persons imported:          ${stats.persons}`);
  console.log(`Rows skipped:              ${stats.skippedRows}`);
  console.log(`Duplicate phones detected: ${stats.duplicatePhones}`);
  console.log(`Sheets with no header:     ${stats.emptySheets.length}`);
  if (stats.emptySheets.length) {
    console.log(`  ${stats.emptySheets.join(', ')}`);
  }
  console.log(`Unresolved professions:    ${stats.unresolvedProfessions.size}`);
  if (stats.unresolvedProfessions.size > 0) {
    const list = [...stats.unresolvedProfessions];
    list.slice(0, 30).forEach((p) => console.log(`  - ${p}`));
    if (list.length > 30) console.log(`  ... and ${list.length - 30} more`);
  }
  console.log('====================================\n');
}

main()
  .catch((e) => {
    console.error('[import] FAILED:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
