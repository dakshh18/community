#!/usr/bin/env tsx
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.household.count();
  const linkedA = await prisma.household.count({ where: { headPersonId: { not: null } } });
  const linkedB = await prisma.household.count({
    where: { headPersonId: { not: { equals: null } } },
  });
  const linkedC = await prisma.household.findMany({
    select: { id: true, headPersonId: true },
  });
  const linkedCountManual = linkedC.filter((h) => h.headPersonId != null).length;

  console.log(`total households: ${total}`);
  console.log(`count({ headPersonId: { not: null } }):           ${linkedA}`);
  console.log(`count({ headPersonId: { not: { equals: null } } }): ${linkedB}`);
  console.log(`manual filter (findMany then count):              ${linkedCountManual}`);

  const noHeadIds = linkedC.filter((h) => h.headPersonId == null);
  console.log(`households with null headPersonId: ${noHeadIds.length}`);
  if (noHeadIds.length > 0) {
    const sampleIds = noHeadIds.slice(0, 5).map((h) => h.id);
    const samples = await prisma.household.findMany({
      where: { id: { in: sampleIds } },
      include: {
        _count: { select: { persons: true } },
        persons: { take: 4, select: { fullName: true, relation: true, phone: true } },
      },
    });
    for (const h of samples) {
      console.log(
        `  [${h.nativePlace.trim()}] members=${h._count.persons} :: ` +
          h.persons.map((x) => `${x.fullName}/${x.relation}`).join(' | '),
      );
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
