#!/usr/bin/env tsx
/** One-off: rename an email everywhere it's bound (Person + User + OtpCode). */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const from = process.argv[2];
  const to = process.argv[3];
  if (!from || !to) {
    console.error('usage: swap-email.ts <fromEmail> <toEmail>');
    process.exit(1);
  }
  const p = await prisma.person.updateMany({ where: { email: from }, data: { email: to } });
  const u = await prisma.user.updateMany({ where: { email: from }, data: { email: to } });
  const o = await prisma.otpCode.deleteMany({ where: { email: from } });
  console.log(`persons rebound:  ${p.count}`);
  console.log(`users rebound:    ${u.count}`);
  console.log(`otpCodes purged:  ${o.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
