#!/usr/bin/env tsx
/**
 * Quick dev seeder: drops one upcoming event so the mobile Events tab + Home
 * cards have something to show. Re-running is safe — replaces the previous
 * test event by name. Use `--clear` to remove it instead.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const NAME = 'Snehmilan 2026';

async function main() {
  const clear = process.argv.includes('--clear');

  const existing = await prisma.event.findFirst({ where: { name: NAME } });

  if (clear) {
    if (!existing) {
      console.log(`[seed-event] no "${NAME}" to clear`);
      return;
    }
    await prisma.$transaction([
      prisma.performance.deleteMany({ where: { registration: { eventId: existing.id } } }),
      prisma.eventRegistration.deleteMany({ where: { eventId: existing.id } }),
      prisma.payment.deleteMany({ where: { eventId: existing.id } }),
      prisma.expense.deleteMany({ where: { eventId: existing.id } }),
      prisma.event.delete({ where: { id: existing.id } }),
    ]);
    console.log(`[seed-event] cleared "${NAME}" + its registrations/payments/expenses`);
    return;
  }

  // Find any User to attribute createdBy to (the schema requires it).
  const someUser = await prisma.user.findFirst();
  if (!someUser) {
    console.error(
      '[seed-event] No User rows exist. Log in via the app at least once first.',
    );
    process.exit(1);
  }

  const dateTime = new Date();
  dateTime.setDate(dateTime.getDate() + 21); // 3 weeks from now
  dateTime.setHours(18, 0, 0, 0);

  const data = {
    name: NAME,
    dateTime,
    venue: 'Patidar Samaj Hall, Vadodara',
    description:
      'Annual community gathering. Cultural programs, kids performances, dinner.',
    contributionPerFamily: 1500,
    registrationOpen: true,
    createdBy: someUser.id,
  };

  if (existing) {
    const updated = await prisma.event.update({ where: { id: existing.id }, data });
    console.log(`[seed-event] updated "${updated.name}" (${updated.id}) → ${updated.dateTime.toISOString()}`);
  } else {
    const created = await prisma.event.create({ data });
    console.log(`[seed-event] created "${created.name}" (${created.id}) → ${created.dateTime.toISOString()}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
