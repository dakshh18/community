#!/usr/bin/env tsx
/** Set a User's role by phone. Usage: promote.ts <phone> <role>. */
import 'dotenv/config';
import { PrismaClient, type Role } from '@prisma/client';

const prisma = new PrismaClient();
const VALID: Role[] = ['ADMIN', 'COMMITTEE', 'MEMBER'];

async function main() {
  const phone = process.argv[2];
  const role = (process.argv[3] ?? '').toUpperCase() as Role;
  if (!phone || !VALID.includes(role)) {
    console.error('usage: promote.ts <phone> <ADMIN|COMMITTEE|MEMBER>');
    process.exit(1);
  }
  const u = await prisma.user.update({ where: { phone }, data: { role } });
  console.log(`promoted user ${u.id} (${u.phone}) → ${u.role}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
