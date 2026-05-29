#!/usr/bin/env tsx
/**
 * DANGEROUS: wipes all roster + import data so the importer can rebuild from
 * the Excel cleanly. Used after a failed import left phantom rows, or when
 * you've fixed the source data and want a fresh slate.
 *
 * Does NOT touch User, OtpCode, AuditLog so existing logins/test sessions
 * survive (though linked personId on a User may become stale — re-login fixes).
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[reset] clearing roster data...');
  // Order matters because of relations.
  const r1 = await prisma.person.updateMany({ data: { professionCatId: null } });
  console.log(`  persons.professionCatId nulled: ${r1.count}`);
  const r2 = await prisma.household.updateMany({ data: { headPersonId: null } });
  console.log(`  household.headPersonId nulled: ${r2.count}`);
  const r3 = await prisma.person.deleteMany({});
  console.log(`  persons deleted: ${r3.count}`);
  const r4 = await prisma.household.deleteMany({});
  console.log(`  households deleted: ${r4.count}`);
  const r5 = await prisma.professionCategory.deleteMany({});
  console.log(`  profession categories deleted: ${r5.count}`);
  const r6 = await prisma.importBatch.deleteMany({});
  console.log(`  import batches deleted: ${r6.count}`);
  console.log('[reset] done');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
