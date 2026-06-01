#!/usr/bin/env tsx
/**
 * One-shot: populate Person.fullNameLatin for every existing row by running
 * fullName through the transliteration index builder. Safe to re-run — it
 * always overwrites the field.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

import { buildLatinIndex } from '../src/utils/translit';

const prisma = new PrismaClient();

async function main() {
  const persons = await prisma.person.findMany({ select: { id: true, fullName: true } });
  console.log(`[backfill] ${persons.length} persons to process`);

  let updated = 0;
  for (const p of persons) {
    const idx = buildLatinIndex(p.fullName);
    await prisma.person.update({
      where: { id: p.id },
      data: { fullNameLatin: idx },
    });
    updated++;
    if (updated % 50 === 0) console.log(`  ${updated}/${persons.length}`);
  }

  console.log(`[backfill] done — ${updated} rows updated`);

  // Spot-check 5
  const sample = await prisma.person.findMany({
    take: 5,
    select: { fullName: true, fullNameLatin: true },
  });
  console.log('\nSample:');
  for (const p of sample) console.log(`  ${p.fullName}  →  ${p.fullNameLatin}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
