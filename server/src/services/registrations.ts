/**
 * Event registrations + kids performances. Spec §8 module 4.
 *
 * Member registers their own household for an event (one registration per
 * eventId + householdId; the schema enforces uniqueness). Performances are
 * always nested under a registration the caller owns (or admin/committee).
 */

import type { PerformanceType, Prisma } from '@prisma/client';

import { prisma } from '../db/prisma';
import { HttpError } from '../middleware/errorHandler';
import { audit } from '../utils/audit';
import type { ViewerCtx } from './privacy';

const OBJECT_ID = /^[a-f0-9]{24}$/i;

const VALID_PERFORMANCE_TYPES: PerformanceType[] = ['DANCE', 'ACT', 'SPEECH', 'SINGING', 'OTHER'];

export interface PerformanceInput {
  childName: string;
  type: PerformanceType;
  title?: string | null;
  durationMin?: number | null;
  notes?: string | null;
}

export interface RegisterInput {
  attendeesCount: number;
  performances?: PerformanceInput[];
}

function isPrivileged(viewer: ViewerCtx): boolean {
  return viewer.role === 'ADMIN' || viewer.role === 'COMMITTEE';
}

function normalizePerf(p: PerformanceInput): Omit<PerformanceInput, 'type'> & { type: PerformanceType } {
  const childName = p.childName.trim();
  if (!childName) throw new HttpError(400, 'invalid_value', 'childName is required');
  if (!VALID_PERFORMANCE_TYPES.includes(p.type)) {
    throw new HttpError(400, 'invalid_value', `Invalid performance type: ${p.type}`);
  }
  return {
    childName,
    type: p.type,
    title: p.title?.trim() || null,
    durationMin:
      p.durationMin === undefined || p.durationMin === null
        ? null
        : (() => {
            const n = Math.trunc(p.durationMin);
            if (n < 0 || n > 600) {
              throw new HttpError(400, 'invalid_value', 'durationMin out of range');
            }
            return n;
          })(),
    notes: p.notes?.trim() || null,
  };
}

async function ensureEventOpen(eventId: string) {
  if (!OBJECT_ID.test(eventId)) throw new HttpError(400, 'invalid_id', 'Invalid event id');
  const e = await prisma.event.findUnique({ where: { id: eventId } });
  if (!e) throw new HttpError(404, 'not_found', 'Event not found');
  if (!e.registrationOpen) {
    throw new HttpError(400, 'registration_closed', 'Registration is closed for this event');
  }
  return e;
}

export async function registerForEvent(viewer: ViewerCtx, eventId: string, input: RegisterInput) {
  const e = await ensureEventOpen(eventId);

  if (input.attendeesCount == null || input.attendeesCount < 0) {
    throw new HttpError(400, 'invalid_value', 'attendeesCount must be >= 0');
  }
  const attendeesCount = Math.trunc(input.attendeesCount);

  const performances = (input.performances ?? []).map(normalizePerf);

  // Upsert registration (the @@unique([eventId, householdId]) makes this safe).
  const existing = await prisma.eventRegistration.findUnique({
    where: { eventId_householdId: { eventId, householdId: viewer.householdId } },
  });

  let regId: string;
  if (existing) {
    const updated = await prisma.eventRegistration.update({
      where: { id: existing.id },
      data: { attendeesCount },
    });
    regId = updated.id;
  } else {
    const created = await prisma.eventRegistration.create({
      data: { eventId, householdId: viewer.householdId, attendeesCount },
    });
    regId = created.id;
  }

  if (performances.length) {
    await prisma.performance.createMany({
      data: performances.map((p) => ({
        registrationId: regId,
        childName: p.childName,
        type: p.type,
        title: p.title,
        durationMin: p.durationMin,
        notes: p.notes,
      })),
    });
  }

  // Auto-create the Payment row so dashboards show it as PENDING immediately.
  const existingPayment = await prisma.payment.findFirst({
    where: { eventId, householdId: viewer.householdId },
  });
  if (!existingPayment) {
    await prisma.payment.create({
      data: {
        eventId,
        householdId: viewer.householdId,
        amountDue: e.contributionPerFamily,
        amountPaid: 0,
        status: 'PENDING',
      },
    });
  }

  await audit({
    actorId: viewer.sub,
    action: 'registration.upsert',
    entity: 'EventRegistration',
    entityId: regId,
    meta: { eventId, householdId: viewer.householdId, attendeesCount, performances: performances.length },
  });

  return getMyRegistration(viewer, eventId);
}

export async function getMyRegistration(viewer: ViewerCtx, eventId: string) {
  if (!OBJECT_ID.test(eventId)) throw new HttpError(400, 'invalid_id', 'Invalid event id');
  const reg = await prisma.eventRegistration.findUnique({
    where: { eventId_householdId: { eventId, householdId: viewer.householdId } },
    include: { performances: true },
  });
  if (!reg) return null;
  return {
    id: reg.id,
    eventId: reg.eventId,
    householdId: reg.householdId,
    attendeesCount: reg.attendeesCount,
    performances: reg.performances,
    createdAt: reg.createdAt.toISOString(),
  };
}

export async function cancelMyRegistration(viewer: ViewerCtx, eventId: string) {
  if (!OBJECT_ID.test(eventId)) throw new HttpError(400, 'invalid_id', 'Invalid event id');
  const reg = await prisma.eventRegistration.findUnique({
    where: { eventId_householdId: { eventId, householdId: viewer.householdId } },
  });
  if (!reg) throw new HttpError(404, 'not_found', 'You are not registered');

  await prisma.$transaction([
    prisma.performance.deleteMany({ where: { registrationId: reg.id } }),
    prisma.eventRegistration.delete({ where: { id: reg.id } }),
  ]);

  await audit({
    actorId: viewer.sub,
    action: 'registration.cancel',
    entity: 'EventRegistration',
    entityId: reg.id,
    meta: { eventId, householdId: viewer.householdId },
  });
}

export async function listRegistrations(viewer: ViewerCtx, eventId: string) {
  if (!isPrivileged(viewer)) {
    throw new HttpError(403, 'forbidden', 'Admin or committee role required');
  }
  if (!OBJECT_ID.test(eventId)) throw new HttpError(400, 'invalid_id', 'Invalid event id');

  const regs = await prisma.eventRegistration.findMany({
    where: { eventId },
    include: {
      performances: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Hydrate household names in one batch.
  const householdIds = [...new Set(regs.map((r) => r.householdId))];
  const households = await prisma.household.findMany({
    where: { id: { in: householdIds } },
    include: { head: { select: { fullName: true } } },
  });
  const hById = new Map(households.map((h) => [h.id, h]));

  return regs.map((r) => {
    const h = hById.get(r.householdId);
    return {
      id: r.id,
      householdId: r.householdId,
      householdName: h?.head?.fullName ?? '(unknown)',
      nativePlace: h?.nativePlace.trim() ?? '',
      attendeesCount: r.attendeesCount,
      performances: r.performances,
      createdAt: r.createdAt.toISOString(),
    };
  });
}

// ---------- Performances ----------

export async function addPerformance(viewer: ViewerCtx, regId: string, input: PerformanceInput) {
  if (!OBJECT_ID.test(regId)) throw new HttpError(400, 'invalid_id', 'Invalid registration id');
  const reg = await prisma.eventRegistration.findUnique({ where: { id: regId } });
  if (!reg) throw new HttpError(404, 'not_found', 'Registration not found');
  if (reg.householdId !== viewer.householdId && !isPrivileged(viewer)) {
    throw new HttpError(403, 'forbidden', "Not your household's registration");
  }

  const p = normalizePerf(input);
  const created = await prisma.performance.create({
    data: {
      registrationId: regId,
      childName: p.childName,
      type: p.type,
      title: p.title,
      durationMin: p.durationMin,
      notes: p.notes,
    },
  });

  await audit({
    actorId: viewer.sub,
    action: 'performance.create',
    entity: 'Performance',
    entityId: created.id,
    meta: { registrationId: regId, childName: p.childName, type: p.type },
  });

  return created;
}

export async function removePerformance(viewer: ViewerCtx, perfId: string) {
  if (!OBJECT_ID.test(perfId)) throw new HttpError(400, 'invalid_id', 'Invalid performance id');
  const perf = await prisma.performance.findUnique({
    where: { id: perfId },
    include: { registration: true },
  });
  if (!perf) throw new HttpError(404, 'not_found', 'Performance not found');
  if (perf.registration.householdId !== viewer.householdId && !isPrivileged(viewer)) {
    throw new HttpError(403, 'forbidden', "Not your household's performance");
  }

  await prisma.performance.delete({ where: { id: perfId } });

  await audit({
    actorId: viewer.sub,
    action: 'performance.delete',
    entity: 'Performance',
    entityId: perfId,
  });
}
