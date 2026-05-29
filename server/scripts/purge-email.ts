#!/usr/bin/env tsx
/** One-off: remove a specific email from the roster. */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('usage: purge-email.ts <email>');
    process.exit(1);
  }
  const r1 = await prisma.person.updateMany({
    where: { email },
    data: { email: null },
  });
  const r2 = await prisma.user.deleteMany({ where: { email } });
  const r3 = await prisma.otpCode.deleteMany({ where: { email } });
  console.log(`persons unbound:  ${r1.count}`);
  console.log(`users deleted:    ${r2.count}`);
  console.log(`otpCodes deleted: ${r3.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
