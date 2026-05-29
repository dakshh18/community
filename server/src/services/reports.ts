/**
 * CSV reports. Spec §8 module 9 + §10 (GET /reports/:type.csv).
 *
 * Every report returns a complete CSV string. Each is gated to ADMIN+COMMITTEE.
 * The route layer handles Content-Type + filename.
 */

import { prisma } from '../db/prisma';
import { HttpError } from '../middleware/errorHandler';
import { csv } from '../utils/csv';
import type { ViewerCtx } from './privacy';

const OBJECT_ID = /^[a-f0-9]{24}$/i;

function requirePrivileged(viewer: ViewerCtx) {
  if (viewer.role !== 'ADMIN' && viewer.role !== 'COMMITTEE') {
    throw new HttpError(403, 'forbidden', 'Admin or committee role required');
  }
}

function fmtDateOnly(d: Date | null | undefined): string {
  if (!d) return '';
  return d.toISOString().slice(0, 10);
}

// ---------- Members ----------

export async function reportMembersCsv(viewer: ViewerCtx): Promise<string> {
  requirePrivileged(viewer);

  const persons = await prisma.person.findMany({
    include: {
      professionCat: { select: { name: true, nameGu: true } },
      household: { select: { nativePlace: true, city: true, vadodaraAddress: true, householdPhone: true } },
    },
    orderBy: [{ household: { nativePlace: 'asc' } }, { fullName: 'asc' }],
  });

  const header = [
    'nativePlace',
    'city',
    'fullName',
    'relation',
    'gender',
    'dob',
    'phone',
    'phoneE164',
    'email',
    'professionRaw',
    'professionCategory',
    'professionCategoryGu',
    'bloodGroup',
    'vadodaraAddress',
    'householdPhone',
  ];

  const rows = persons.map((p) => [
    p.household.nativePlace.trim(),
    p.household.city,
    p.fullName,
    p.relation,
    p.gender ?? '',
    fmtDateOnly(p.dob),
    p.phone ?? '',
    p.phoneE164 ?? '',
    p.email ?? '',
    p.professionRaw ?? '',
    p.professionCat?.name ?? '',
    p.professionCat?.nameGu ?? '',
    p.bloodGroup ?? '',
    p.household.vadodaraAddress ?? '',
    p.household.householdPhone ?? '',
  ]);

  return csv(header, rows);
}

// ---------- Event registrations ----------

export async function reportRegistrationsCsv(viewer: ViewerCtx, eventId: string): Promise<string> {
  requirePrivileged(viewer);
  if (!OBJECT_ID.test(eventId)) throw new HttpError(400, 'invalid_id', 'Invalid event id');

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new HttpError(404, 'not_found', 'Event not found');

  const regs = await prisma.eventRegistration.findMany({
    where: { eventId },
    include: { performances: true },
    orderBy: { createdAt: 'asc' },
  });

  const households = await prisma.household.findMany({
    where: { id: { in: [...new Set(regs.map((r) => r.householdId))] } },
    include: { head: { select: { fullName: true, phone: true } } },
  });
  const hById = new Map(households.map((h) => [h.id, h]));

  const header = [
    'nativePlace',
    'headName',
    'headPhone',
    'attendeesCount',
    'performanceCount',
    'performances',
    'registeredAt',
  ];

  const rows = regs.map((r) => {
    const h = hById.get(r.householdId);
    const perfs = r.performances
      .map((p) => `${p.childName} (${p.type}${p.title ? ': ' + p.title : ''})`)
      .join('; ');
    return [
      h?.nativePlace.trim() ?? '',
      h?.head?.fullName ?? '',
      h?.head?.phone ?? '',
      r.attendeesCount,
      r.performances.length,
      perfs,
      r.createdAt.toISOString(),
    ];
  });

  return csv(header, rows);
}

// ---------- Event payments ----------

export async function reportPaymentsCsv(viewer: ViewerCtx, eventId: string): Promise<string> {
  requirePrivileged(viewer);
  if (!OBJECT_ID.test(eventId)) throw new HttpError(400, 'invalid_id', 'Invalid event id');

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new HttpError(404, 'not_found', 'Event not found');

  const payments = await prisma.payment.findMany({
    where: { eventId },
    orderBy: [{ status: 'asc' }, { householdId: 'asc' }],
  });

  const households = await prisma.household.findMany({
    where: { id: { in: [...new Set(payments.map((p) => p.householdId))] } },
    include: { head: { select: { fullName: true, phone: true } } },
  });
  const hById = new Map(households.map((h) => [h.id, h]));

  const header = [
    'nativePlace',
    'headName',
    'headPhone',
    'amountDue',
    'amountPaid',
    'status',
    'mode',
    'reference',
    'paidAt',
    'notes',
  ];

  const rows = payments.map((p) => {
    const h = hById.get(p.householdId);
    return [
      h?.nativePlace.trim() ?? '',
      h?.head?.fullName ?? '',
      h?.head?.phone ?? '',
      p.amountDue,
      p.amountPaid,
      p.status,
      p.mode ?? '',
      p.reference ?? '',
      p.paidAt ? p.paidAt.toISOString() : '',
      p.notes ?? '',
    ];
  });

  return csv(header, rows);
}

// ---------- Pending payments across all events ----------

export async function reportPendingPaymentsCsv(viewer: ViewerCtx): Promise<string> {
  requirePrivileged(viewer);

  const payments = await prisma.payment.findMany({
    where: { status: { in: ['PENDING', 'PARTIAL'] } },
    orderBy: [{ eventId: 'asc' }, { status: 'asc' }],
  });

  const [households, events] = await Promise.all([
    prisma.household.findMany({
      where: { id: { in: [...new Set(payments.map((p) => p.householdId))] } },
      include: { head: { select: { fullName: true, phone: true } } },
    }),
    prisma.event.findMany({
      where: { id: { in: [...new Set(payments.map((p) => p.eventId))] } },
      select: { id: true, name: true, dateTime: true },
    }),
  ]);
  const hById = new Map(households.map((h) => [h.id, h]));
  const eById = new Map(events.map((e) => [e.id, e]));

  const header = [
    'eventName',
    'eventDate',
    'nativePlace',
    'headName',
    'headPhone',
    'amountDue',
    'amountPaid',
    'amountOutstanding',
    'status',
  ];

  const rows = payments.map((p) => {
    const h = hById.get(p.householdId);
    const e = eById.get(p.eventId);
    return [
      e?.name ?? '',
      e ? fmtDateOnly(e.dateTime) : '',
      h?.nativePlace.trim() ?? '',
      h?.head?.fullName ?? '',
      h?.head?.phone ?? '',
      p.amountDue,
      p.amountPaid,
      Math.max(0, p.amountDue - p.amountPaid),
      p.status,
    ];
  });

  return csv(header, rows);
}

// ---------- Event expenses ----------

export async function reportExpensesCsv(viewer: ViewerCtx, eventId: string): Promise<string> {
  requirePrivileged(viewer);
  if (!OBJECT_ID.test(eventId)) throw new HttpError(400, 'invalid_id', 'Invalid event id');

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new HttpError(404, 'not_found', 'Event not found');

  const expenses = await prisma.expense.findMany({
    where: { eventId },
    orderBy: { date: 'desc' },
  });

  const header = ['category', 'amount', 'paidTo', 'paidBy', 'date', 'notes'];
  const rows = expenses.map((x) => [
    x.category,
    x.amount,
    x.paidTo ?? '',
    x.paidBy ?? '',
    x.date.toISOString(),
    x.notes ?? '',
  ]);

  return csv(header, rows);
}
