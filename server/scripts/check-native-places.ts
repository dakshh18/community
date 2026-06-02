#!/usr/bin/env tsx
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Group households by nativePlace
  const grouped = await prisma.household.groupBy({
    by: ['nativePlace'],
    _count: { _all: true },
  });

  // Also count persons per native place
  const persons = await prisma.person.findMany({
    select: { household: { select: { nativePlace: true } } },
  });

  const personByPlace = new Map<string, number>();
  for (const p of persons) {
    const np = p.household.nativePlace.trim();
    personByPlace.set(np, (personByPlace.get(np) ?? 0) + 1);
  }

  console.log(`Total distinct nativePlace values: ${grouped.length}`);
  console.log('---');

  const rows = grouped
    .map((g) => ({
      nativePlace: g.nativePlace.trim(),
      households: g._count._all,
      persons: personByPlace.get(g.nativePlace.trim()) ?? 0,
    }))
    .sort((a, b) => b.persons - a.persons);

  for (const r of rows) {
    console.log(`  ${r.nativePlace.padEnd(40)}  ${String(r.persons).padStart(4)} persons   ${String(r.households).padStart(4)} households`);
  }

  console.log('---');
  console.log(`Totals: ${rows.reduce((s, r) => s + r.persons, 0)} persons across ${rows.length} places`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
