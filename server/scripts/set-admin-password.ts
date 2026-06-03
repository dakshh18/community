#!/usr/bin/env tsx
/**
 * Set (or reset) a web-panel password for an existing User, looked up by phone.
 * Optionally promotes the user to ADMIN/COMMITTEE in the same step so they can
 * actually use the admin panel.
 *
 * Usage:
 *   npm run set-admin-password -- <phone> <password> [ADMIN|COMMITTEE]
 *
 * The User must already exist (they appear after their first OTP login, or you
 * can create one with the seed/import flow). Phone is the canonical 10-digit
 * roster number.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, type Role } from '@prisma/client';

import { normalizePhone } from '../src/utils/phone';

const prisma = new PrismaClient();
const PROMOTABLE: Role[] = ['ADMIN', 'COMMITTEE'];

async function main() {
  const rawPhone = process.argv[2];
  const password = process.argv[3];
  const roleArg = process.argv[4]?.toUpperCase() as Role | undefined;

  if (!rawPhone || !password) {
    console.error(
      'usage: set-admin-password.ts <phone> <password> [ADMIN|COMMITTEE]',
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('password must be at least 8 characters');
    process.exit(1);
  }
  if (roleArg && !PROMOTABLE.includes(roleArg)) {
    console.error('role must be ADMIN or COMMITTEE');
    process.exit(1);
  }

  const phone = normalizePhone(rawPhone);
  if (!phone) {
    console.error(`could not normalize phone: ${rawPhone}`);
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    console.error(
      `no User with phone ${phone}. They must log in once (OTP) first, ` +
        `or be promoted from a Person record.`,
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const updated = await prisma.user.update({
    where: { phone },
    data: {
      passwordHash,
      ...(roleArg ? { role: roleArg } : {}),
    },
  });

  console.log(
    `set password for user ${updated.id} (${updated.phone}) → role ${updated.role}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
