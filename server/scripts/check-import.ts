#!/usr/bin/env tsx
/** Quick post-import sanity check — counts + a few samples. */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [households, persons, withPhone, withHead, withCat, withDob, withBlood, batches] =
    await Promise.all([
      prisma.household.count(),
      prisma.person.count(),
      prisma.person.count({ where: { phone: { not: null } } }),
      prisma.household.count({ where: { headPersonId: { not: null } } }),
      prisma.person.count({ where: { professionCatId: { not: null } } }),
      prisma.person.count({ where: { dob: { not: null } } }),
      prisma.person.count({ where: { bloodGroup: { not: null } } }),
      prisma.importBatch.count(),
    ]);

  console.log('--- counts ---');
  console.log(`households: ${households}`);
  console.log(`persons:    ${persons}`);
  console.log(`persons w/ own phone:       ${withPhone}`);
  console.log(`households w/ head linked:  ${withHead}/${households}`);
  console.log(`persons w/ profession cat:  ${withCat}/${persons}`);
  console.log(`persons w/ dob:             ${withDob}/${persons}`);
  console.log(`persons w/ blood group:     ${withBlood}/${persons}`);
  console.log(`import batches:             ${batches}`);

  console.log('\n--- 3 sample heads ---');
  const sampleHeads = await prisma.household.findMany({
    take: 3,
    where: { headPersonId: { not: null } },
    include: { head: true, _count: { select: { persons: true } } },
  });
  for (const h of sampleHeads) {
    console.log(
      `  ${h.nativePlace.trim()} | head: ${h.head?.fullName} | phone: ${h.head?.phone ?? '-'} | members: ${h._count.persons}`,
    );
  }

  console.log('\n--- 5 persons w/ phone (for auth smoke test) ---');
  const phones = await prisma.person.findMany({
    take: 5,
    where: { phone: { not: null } },
    select: { fullName: true, phone: true, phoneE164: true, relation: true },
  });
  for (const p of phones) {
    console.log(`  ${p.fullName} (${p.relation}) — ${p.phoneE164}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
