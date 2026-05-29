/**
 * Admin + committee dashboard aggregates. Spec §8 modules 7-8 + §10.
 */

import { prisma } from '../db/prisma';
import { HttpError } from '../middleware/errorHandler';
import type { ViewerCtx } from './privacy';

const RECENT_HELP_LIMIT = 10;
const UPCOMING_EVENTS_LIMIT = 10;

function requireAdmin(viewer: ViewerCtx) {
  if (viewer.role !== 'ADMIN') {
    throw new HttpError(403, 'forbidden', 'Admin role required');
  }
}
function requirePrivileged(viewer: ViewerCtx) {
  if (viewer.role !== 'ADMIN' && viewer.role !== 'COMMITTEE') {
    throw new HttpError(403, 'forbidden', 'Admin or committee role required');
  }
}

async function paymentSummary() {
  const [payments, registrations, events] = await Promise.all([
    prisma.payment.findMany({
      select: { eventId: true, amountDue: true, amountPaid: true, status: true },
    }),
    prisma.eventRegistration.findMany({ select: { eventId: true } }),
    prisma.event.findMany({ select: { id: true, contributionPerFamily: true } }),
  ]);
  const contribByEvent = new Map(events.map((e) => [e.id, e.contributionPerFamily]));

  let expected = 0;
  for (const r of registrations) {
    expected += contribByEvent.get(r.eventId) ?? 0;
  }
  const collected = payments.reduce((s, p) => s + (p.amountPaid ?? 0), 0);

  const statusBuckets = { PENDING: 0, PARTIAL: 0, PAID: 0 };
  for (const p of payments) statusBuckets[p.status] += 1;

  return {
    eventsTotal: events.length,
    registrationsTotal: registrations.length,
    expected,
    collected,
    outstanding: Math.max(0, expected - collected),
    statusBuckets,
  };
}

async function upcomingEventsBrief() {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: { dateTime: { gte: now } },
    orderBy: { dateTime: 'asc' },
    take: UPCOMING_EVENTS_LIMIT,
    include: { _count: { select: { registrations: true } } },
  });
  return events.map((e) => ({
    id: e.id,
    name: e.name,
    dateTime: e.dateTime.toISOString(),
    venue: e.venue,
    registrationsCount: e._count.registrations,
    contributionPerFamily: e.contributionPerFamily,
  }));
}

async function professionBreakdown() {
  const cats = await prisma.professionCategory.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { persons: true } } },
  });
  return cats.map((c) => ({
    id: c.id,
    name: c.name,
    nameGu: c.nameGu,
    personsCount: c._count.persons,
  }));
}

async function recentHelpRequests() {
  const rows = await prisma.helpRequest.findMany({
    orderBy: { createdAt: 'desc' },
    take: RECENT_HELP_LIMIT,
  });
  if (!rows.length) return [];
  const userIds = [...new Set(rows.map((r) => r.requestedBy))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    include: { person: { select: { fullName: true } } },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    urgency: r.urgency,
    status: r.status,
    description: r.description.length > 200 ? r.description.slice(0, 200) + '…' : r.description,
    requestedByName: byId.get(r.requestedBy)?.person?.fullName ?? '(unknown)',
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getAdminStats(viewer: ViewerCtx) {
  requireAdmin(viewer);

  const [
    households,
    persons,
    activeUsers,
    totalUsers,
    pendingCorrections,
    helpPending,
    byProfession,
    upcomingEvents,
    paymentsAgg,
    recentHelp,
  ] = await Promise.all([
    prisma.household.count(),
    prisma.person.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count(),
    prisma.profileCorrectionRequest.count({ where: { status: 'PENDING' } }),
    prisma.helpRequest.count({ where: { status: 'PENDING' } }),
    professionBreakdown(),
    upcomingEventsBrief(),
    paymentSummary(),
    recentHelpRequests(),
  ]);

  return {
    totals: {
      households,
      persons,
      users: totalUsers,
      activeUsers,
    },
    queues: {
      pendingCorrections,
      pendingHelpRequests: helpPending,
    },
    byProfession,
    upcomingEvents,
    payments: paymentsAgg,
    recentHelpRequests: recentHelp,
  };
}

export async function getCommitteeStats(viewer: ViewerCtx) {
  requirePrivileged(viewer);

  const [households, persons, pendingCorrections, upcomingEvents, paymentsAgg] = await Promise.all([
    prisma.household.count(),
    prisma.person.count(),
    prisma.profileCorrectionRequest.count({ where: { status: 'PENDING' } }),
    upcomingEventsBrief(),
    paymentSummary(),
  ]);

  return {
    totals: { households, persons },
    queues: { pendingCorrections },
    upcomingEvents,
    payments: paymentsAgg,
  };
}
