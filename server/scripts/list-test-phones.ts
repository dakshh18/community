#!/usr/bin/env tsx
/** Quick list of phones in the DB and a per-profession breakdown vs total. */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const personsTotal = await prisma.person.count();
  const withCat = await prisma.person.count({ where: { professionCatId: { not: null } } });
  const withRawNoCat = await prisma.person.count({
    where: { professionRaw: { not: null }, professionCatId: null },
  });
  const noProfAtAll = await prisma.person.count({
    where: { professionRaw: null, professionCatId: null },
  });

  console.log('--- counts ---');
  console.log(`Total persons:                              ${personsTotal}`);
  console.log(`With a resolved profession category:        ${withCat}`);
  console.log(`With raw profession but no category match:  ${withRawNoCat}`);
  console.log(`With NO profession (blank in Excel):        ${noProfAtAll}`);
  console.log(`  (sum check: ${withCat + withRawNoCat + noProfAtAll} = ${personsTotal}? ${withCat + withRawNoCat + noProfAtAll === personsTotal ? 'OK' : 'MISMATCH'})`);

  // Top 15 unresolved profession strings
  const unresolved = await prisma.person.findMany({
    where: { professionRaw: { not: null }, professionCatId: null },
    select: { professionRaw: true },
    take: 1000,
  });
  const tally = new Map<string, number>();
  for (const r of unresolved) {
    const k = (r.professionRaw ?? '').trim();
    tally.set(k, (tally.get(k) ?? 0) + 1);
  }
  const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
  console.log('\n--- top 25 unresolved profession strings (raw → count) ---');
  for (const [k, v] of sorted) console.log(`  ${String(v).padStart(3)} × ${k}`);

  console.log('\n--- phones that can log in (first 15) ---');
  const phones = await prisma.person.findMany({
    where: { phone: { not: null } },
    select: { fullName: true, phone: true, phoneE164: true, email: true, relation: true },
    orderBy: { fullName: 'asc' },
    take: 15,
  });
  for (const p of phones) {
    const tag = p.email ? '(email saved)' : '(needs email on first login)';
    console.log(`  ${p.phoneE164}  ${p.fullName}  [${p.relation}]  ${tag}`);
  }
  const phoneTotal = await prisma.person.count({ where: { phone: { not: null } } });
  console.log(`  ... ${phoneTotal - 15} more phones available`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
