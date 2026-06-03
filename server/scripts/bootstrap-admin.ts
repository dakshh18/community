#!/usr/bin/env tsx
/**
 * One-shot bootstrap for the FIRST admin who logs into the web panel with
 * email + password (no OTP). It guarantees there is a `User` with the given
 * email, role ADMIN, a password hash, and a linked Person/Household (the JWT
 * needs personId + householdId).
 *
 * Usage:
 *   npm run bootstrap-admin -- <email> <password> [phone]
 *
 * Resolution order for the admin's member identity:
 *   1. a Person who already has this email
 *   2. the Person matching [phone] (created if a phone is given but not found)
 *   3. the first roster Person that has a phone
 *   4. a brand-new "Admin" household + person (requires a [phone] to use as the
 *      unique User key)
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

import { normalizePhone, toE164India } from '../src/utils/phone';

const prisma = new PrismaClient();

async function main() {
  const email = (process.argv[2] ?? '').trim().toLowerCase();
  const password = process.argv[3] ?? '';
  const phoneArg = process.argv[4];

  if (!email || !password) {
    console.error('usage: bootstrap-admin.ts <email> <password> [phone]');
    process.exit(1);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error(`invalid email: ${email}`);
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('password must be at least 8 characters');
    process.exit(1);
  }
  const phone = phoneArg ? normalizePhone(phoneArg) : null;
  if (phoneArg && !phone) {
    console.error(`could not normalize phone: ${phoneArg}`);
    process.exit(1);
  }

  // --- 1. Resolve the Person that will be this admin's identity ---
  let person =
    (await prisma.person.findUnique({ where: { email } })) ??
    (phone ? await prisma.person.findUnique({ where: { phone } }) : null) ??
    (await prisma.person.findFirst({ where: { phone: { not: null } }, orderBy: { createdAt: 'asc' } }));

  if (!person) {
    // Empty/phoneless roster — create a dedicated admin member. We need a phone
    // to use as the unique User key.
    if (!phone) {
      console.error(
        'No member with a phone exists yet. Pass a phone so the admin account ' +
          'has a login key:\n  npm run bootstrap-admin -- <email> <password> <phone>',
      );
      process.exit(1);
    }
    const household = await prisma.household.create({
      data: { nativePlace: 'Admin', city: 'Vadodara', householdPhone: phone },
    });
    person = await prisma.person.create({
      data: {
        householdId: household.id,
        fullName: 'Administrator',
        relation: 'SELF',
        phone,
        phoneE164: toE164India(phone),
        email,
      },
    });
    await prisma.household.update({
      where: { id: household.id },
      data: { headPersonId: person.id },
    });
    console.log(`created admin member + household (${household.nativePlace}).`);
  }

  // --- 2. Make sure that Person has a phone (User.phone is required + unique) ---
  let userPhone = person.phone;
  if (!userPhone) {
    if (!phone) {
      console.error(
        `The selected member "${person.fullName}" has no phone. Re-run with a phone:\n` +
          '  npm run bootstrap-admin -- <email> <password> <phone>',
      );
      process.exit(1);
    }
    userPhone = phone;
    await prisma.person.update({
      where: { id: person.id },
      data: { phone, phoneE164: toE164India(phone) },
    });
  }

  // --- 3. Set the email on the Person (clear it off any other holder first) ---
  if (person.email !== email) {
    const holder = await prisma.person.findUnique({ where: { email } });
    if (holder && holder.id !== person.id) {
      await prisma.person.update({ where: { id: holder.id }, data: { email: null } });
    }
    await prisma.person.update({ where: { id: person.id }, data: { email } });
  }

  // --- 4. Upsert the admin User ---
  const passwordHash = await bcrypt.hash(password, 12);
  const existing =
    (await prisma.user.findUnique({ where: { email } })) ??
    (await prisma.user.findUnique({ where: { phone: userPhone } }));

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { email, phone: userPhone, passwordHash, role: 'ADMIN', personId: person.id, isActive: true },
      })
    : await prisma.user.create({
        data: { email, phone: userPhone, passwordHash, role: 'ADMIN', personId: person.id, isActive: true },
      });

  console.log('\n✅ Admin ready. Sign in to the panel with:');
  console.log(`   email:    ${user.email}`);
  console.log(`   password: (the one you just set)`);
  console.log(`   role:     ${user.role}`);
  console.log(`   linked member: ${person.fullName} (${toE164India(userPhone)})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
