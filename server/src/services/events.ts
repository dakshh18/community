/**
 * Events service. Spec §8 module 4 + §10.
 *
 * Members can list/read events. ADMIN creates/updates/deletes them. Committee
 * gets the dashboard aggregates (registrations / collection / expenses / balance).
 */

import type { Prisma } from '@prisma/client';

import { prisma } from '../db/prisma';
import { HttpError } from '../middleware/errorHandler';
import { audit } from '../utils/audit';
import type { ViewerCtx } from './privacy';

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export interface EventInput {
  name: string;
  dateTime: string;
  venue?: string | null;
  description?: string | null;
  contributionPerFamily?: number;
  registrationOpen?: boolean;
}

export interface EventListQuery {
  upcoming?: boolean;
  page?: number;
  pageSize?: number;
}

function isAdmin(viewer: ViewerCtx): boolean {
  return viewer.role === 'ADMIN';
}
function isPrivileged(viewer: ViewerCtx): boolean {
  return viewer.role === 'ADMIN' || viewer.role === 'COMMITTEE';
}

function parseDateTime(raw: string): Date {
  const d = new Date(raw);
  if (!isFinite(d.getTime())) {
    throw new HttpError(400, 'invalid_date', `Invalid date: ${raw}`);
  }
  return d;
}

export async function listEvents(viewer: ViewerCtx, query: EventListQuery) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE));
  const skip = (page - 1) * pageSize;

  const where: Prisma.EventWhereInput = {};
  if (query.upcoming) where.dateTime = { gte: new Date() };

  const [rows, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { dateTime: 'desc' },
      skip,
      take: pageSize,
      include: {
        _count: { select: { registrations: true } },
      },
    }),
    prisma.event.count({ where }),
  ]);

  return {
    items: rows.map((e) => ({
      id: e.id,
      name: e.name,
      dateTime: e.dateTime.toISOString(),
      venue: e.venue,
      description: e.description,
      contributionPerFamily: e.contributionPerFamily,
      registrationOpen: e.registrationOpen,
      registrationsCount: e._count.registrations,
      createdAt: e.createdAt.toISOString(),
    })),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getEvent(viewer: ViewerCtx, id: string) {
  if (!OBJECT_ID.test(id)) throw new HttpError(400, 'invalid_id', 'Invalid event id');
  const e = await prisma.event.findUnique({
    where: { id },
    include: {
      _count: { select: { registrations: true } },
    },
  });
  if (!e) throw new HttpError(404, 'not_found', 'Event not found');

  // Caller's own household status.
  const [myReg, myPay] = await Promise.all([
    prisma.eventRegistration.findUnique({
      where: { eventId_householdId: { eventId: id, householdId: viewer.householdId } },
      include: { performances: true },
    }),
    prisma.payment.findFirst({
      where: { eventId: id, householdId: viewer.householdId },
    }),
  ]);

  return {
    id: e.id,
    name: e.name,
    dateTime: e.dateTime.toISOString(),
    venue: e.venue,
    description: e.description,
    contributionPerFamily: e.contributionPerFamily,
    registrationOpen: e.registrationOpen,
    registrationsCount: e._count.registrations,
    createdAt: e.createdAt.toISOString(),
    me: {
      registration: myReg
        ? {
            id: myReg.id,
            attendeesCount: myReg.attendeesCount,
            performances: myReg.performances,
            createdAt: myReg.createdAt.toISOString(),
          }
        : null,
      payment: myPay
        ? {
            id: myPay.id,
            amountDue: myPay.amountDue,
            amountPaid: myPay.amountPaid,
            status: myPay.status,
            mode: myPay.mode,
            paidAt: myPay.paidAt?.toISOString() ?? null,
          }
        : null,
    },
  };
}

export async function createEvent(viewer: ViewerCtx, input: EventInput) {
  if (!isAdmin(viewer)) throw new HttpError(403, 'forbidden', 'Admin role required');

  const dateTime = parseDateTime(input.dateTime);
  const created = await prisma.event.create({
    data: {
      name: input.name.trim(),
      dateTime,
      venue: input.venue?.trim() || null,
      description: input.description?.trim() || null,
      contributionPerFamily: input.contributionPerFamily ?? 1000,
      registrationOpen: input.registrationOpen ?? true,
      createdBy: viewer.sub,
    },
  });

  await audit({
    actorId: viewer.sub,
    action: 'event.create',
    entity: 'Event',
    entityId: created.id,
    meta: { name: created.name, dateTime: created.dateTime.toISOString() },
  });

  return { ...created, dateTime: created.dateTime.toISOString(), createdAt: created.createdAt.toISOString() };
}

export async function updateEvent(viewer: ViewerCtx, id: string, input: Partial<EventInput>) {
  if (!isAdmin(viewer)) throw new HttpError(403, 'forbidden', 'Admin role required');
  if (!OBJECT_ID.test(id)) throw new HttpError(400, 'invalid_id', 'Invalid event id');

  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'not_found', 'Event not found');

  const data: Prisma.EventUpdateInput = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.dateTime !== undefined) data.dateTime = parseDateTime(input.dateTime);
  if (input.venue !== undefined) data.venue = input.venue?.trim() || null;
  if (input.description !== undefined) data.description = input.description?.trim() || null;
  if (input.contributionPerFamily !== undefined) data.contributionPerFamily = input.contributionPerFamily;
  if (input.registrationOpen !== undefined) data.registrationOpen = input.registrationOpen;

  const updated = await prisma.event.update({ where: { id }, data });

  await audit({
    actorId: viewer.sub,
    action: 'event.update',
    entity: 'Event',
    entityId: id,
    meta: input as unknown,
  });

  return { ...updated, dateTime: updated.dateTime.toISOString(), createdAt: updated.createdAt.toISOString() };
}

export async function deleteEvent(viewer: ViewerCtx, id: string) {
  if (!isAdmin(viewer)) throw new HttpError(403, 'forbidden', 'Admin role required');
  if (!OBJECT_ID.test(id)) throw new HttpError(400, 'invalid_id', 'Invalid event id');

  // Cascade related records (Prisma MongoDB has no referential cascade).
  await prisma.$transaction([
    prisma.performance.deleteMany({
      where: { registration: { eventId: id } },
    }),
    prisma.eventRegistration.deleteMany({ where: { eventId: id } }),
    prisma.payment.deleteMany({ where: { eventId: id } }),
    prisma.expense.deleteMany({ where: { eventId: id } }),
    prisma.event.delete({ where: { id } }),
  ]);

  await audit({
    actorId: viewer.sub,
    action: 'event.delete',
    entity: 'Event',
    entityId: id,
  });
}

export async function getEventDashboard(viewer: ViewerCtx, id: string) {
  if (!isPrivileged(viewer)) {
    throw new HttpError(403, 'forbidden', 'Admin or committee role required');
  }
  if (!OBJECT_ID.test(id)) throw new HttpError(400, 'invalid_id', 'Invalid event id');

  const e = await prisma.event.findUnique({ where: { id } });
  if (!e) throw new HttpError(404, 'not_found', 'Event not found');

  const [regs, payments, expenses, performanceCount] = await Promise.all([
    prisma.eventRegistration.findMany({
      where: { eventId: id },
      select: { id: true, attendeesCount: true },
    }),
    prisma.payment.findMany({ where: { eventId: id } }),
    prisma.expense.findMany({ where: { eventId: id } }),
    prisma.performance.count({ where: { registration: { eventId: id } } }),
  ]);

  const registrationsCount = regs.length;
  const totalAttendees = regs.reduce((s, r) => s + (r.attendeesCount ?? 0), 0);

  const expected = registrationsCount * e.contributionPerFamily;
  const collected = payments.reduce((s, p) => s + (p.amountPaid ?? 0), 0);

  const statusBuckets = { PENDING: 0, PARTIAL: 0, PAID: 0 };
  for (const p of payments) {
    statusBuckets[p.status] = (statusBuckets[p.status] ?? 0) + 1;
  }
  // Households registered but with no Payment row yet count as PENDING.
  const phantomPending = Math.max(0, registrationsCount - payments.length);
  statusBuckets.PENDING += phantomPending;

  const totalExpense = expenses.reduce((s, x) => s + (x.amount ?? 0), 0);
  const byCategory: Record<string, number> = {};
  for (const x of expenses) {
    byCategory[x.category] = (byCategory[x.category] ?? 0) + x.amount;
  }

  return {
    event: {
      id: e.id,
      name: e.name,
      dateTime: e.dateTime.toISOString(),
      contributionPerFamily: e.contributionPerFamily,
    },
    registrations: {
      count: registrationsCount,
      totalAttendees,
      performanceCount,
    },
    payments: {
      expected,
      collected,
      outstanding: Math.max(0, expected - collected),
      statusBuckets,
    },
    expenses: {
      total: totalExpense,
      byCategory,
    },
    balance: collected - totalExpense,
  };
}
