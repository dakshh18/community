/**
 * Payments service. Spec §8 module 5 + §10.
 *
 * Auto-created on registration with amountDue = event.contributionPerFamily.
 * Committee/admin record receipts (`amountPaid`, `mode`, `reference`); status
 * is derived from due vs paid (PENDING / PARTIAL / PAID). Members see only
 * their own household's payment via the event detail or /events/:id/payments/me.
 */

import type { PaymentMode, PaymentStatus, Prisma } from '@prisma/client';

import { prisma } from '../db/prisma';
import { HttpError } from '../middleware/errorHandler';
import { audit } from '../utils/audit';
import type { ViewerCtx } from './privacy';

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const VALID_MODES: PaymentMode[] = ['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER'];

function isPrivileged(viewer: ViewerCtx): boolean {
  return viewer.role === 'ADMIN' || viewer.role === 'COMMITTEE';
}

function computeStatus(due: number, paid: number): PaymentStatus {
  if (paid <= 0) return 'PENDING';
  if (paid >= due) return 'PAID';
  return 'PARTIAL';
}

export interface PaymentInput {
  householdId: string;
  amountPaid: number;
  mode?: PaymentMode | null;
  reference?: string | null;
  notes?: string | null;
  paidAt?: string | null;   // ISO; defaults to now when amountPaid > 0
}

export async function getMyPayment(viewer: ViewerCtx, eventId: string) {
  if (!OBJECT_ID.test(eventId)) throw new HttpError(400, 'invalid_id', 'Invalid event id');
  const p = await prisma.payment.findFirst({
    where: { eventId, householdId: viewer.householdId },
  });
  return p ?? null;
}

export async function listPayments(
  viewer: ViewerCtx,
  eventId: string,
  query: { status?: PaymentStatus },
) {
  if (!isPrivileged(viewer)) {
    throw new HttpError(403, 'forbidden', 'Admin or committee role required');
  }
  if (!OBJECT_ID.test(eventId)) throw new HttpError(400, 'invalid_id', 'Invalid event id');

  const where: Prisma.PaymentWhereInput = { eventId };
  if (query.status) where.status = query.status;

  const payments = await prisma.payment.findMany({
    where,
    orderBy: [{ status: 'asc' }, { householdId: 'asc' }],
  });

  const householdIds = [...new Set(payments.map((p) => p.householdId))];
  const households = await prisma.household.findMany({
    where: { id: { in: householdIds } },
    include: { head: { select: { fullName: true } } },
  });
  const hById = new Map(households.map((h) => [h.id, h]));

  return payments.map((p) => ({
    ...p,
    householdName: hById.get(p.householdId)?.head?.fullName ?? '(unknown)',
    nativePlace: hById.get(p.householdId)?.nativePlace.trim() ?? '',
    paidAt: p.paidAt?.toISOString() ?? null,
  }));
}

export async function recordPayment(viewer: ViewerCtx, eventId: string, input: PaymentInput) {
  if (!isPrivileged(viewer)) {
    throw new HttpError(403, 'forbidden', 'Admin or committee role required');
  }
  if (!OBJECT_ID.test(eventId)) throw new HttpError(400, 'invalid_id', 'Invalid event id');
  if (!OBJECT_ID.test(input.householdId)) {
    throw new HttpError(400, 'invalid_id', 'Invalid household id');
  }
  if (input.amountPaid == null || input.amountPaid < 0) {
    throw new HttpError(400, 'invalid_value', 'amountPaid must be >= 0');
  }
  if (input.mode && !VALID_MODES.includes(input.mode)) {
    throw new HttpError(400, 'invalid_value', `Invalid mode: ${input.mode}`);
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new HttpError(404, 'not_found', 'Event not found');
  const household = await prisma.household.findUnique({ where: { id: input.householdId } });
  if (!household) throw new HttpError(404, 'not_found', 'Household not found');

  const existing = await prisma.payment.findFirst({
    where: { eventId, householdId: input.householdId },
  });

  const amountDue = existing?.amountDue ?? event.contributionPerFamily;
  const status = computeStatus(amountDue, input.amountPaid);
  const paidAt =
    input.amountPaid > 0
      ? input.paidAt
        ? new Date(input.paidAt)
        : new Date()
      : null;

  let saved;
  if (existing) {
    saved = await prisma.payment.update({
      where: { id: existing.id },
      data: {
        amountPaid: input.amountPaid,
        mode: input.mode ?? existing.mode,
        reference: input.reference ?? existing.reference,
        notes: input.notes ?? existing.notes,
        paidAt,
        status,
        collectedBy: viewer.sub,
      },
    });
  } else {
    saved = await prisma.payment.create({
      data: {
        eventId,
        householdId: input.householdId,
        amountDue,
        amountPaid: input.amountPaid,
        mode: input.mode ?? null,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        paidAt,
        status,
        collectedBy: viewer.sub,
      },
    });
  }

  await audit({
    actorId: viewer.sub,
    action: existing ? 'payment.update' : 'payment.create',
    entity: 'Payment',
    entityId: saved.id,
    meta: { eventId, householdId: input.householdId, amountPaid: input.amountPaid, status },
  });

  return { ...saved, paidAt: saved.paidAt?.toISOString() ?? null };
}

export async function updatePayment(
  viewer: ViewerCtx,
  paymentId: string,
  input: Partial<PaymentInput> & { amountDue?: number },
) {
  if (!isPrivileged(viewer)) {
    throw new HttpError(403, 'forbidden', 'Admin or committee role required');
  }
  if (!OBJECT_ID.test(paymentId)) throw new HttpError(400, 'invalid_id', 'Invalid payment id');

  const existing = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!existing) throw new HttpError(404, 'not_found', 'Payment not found');

  if (input.mode && !VALID_MODES.includes(input.mode)) {
    throw new HttpError(400, 'invalid_value', `Invalid mode: ${input.mode}`);
  }

  const amountDue = input.amountDue ?? existing.amountDue;
  const amountPaid = input.amountPaid ?? existing.amountPaid;
  if (amountDue < 0 || amountPaid < 0) {
    throw new HttpError(400, 'invalid_value', 'amounts must be >= 0');
  }
  const status = computeStatus(amountDue, amountPaid);

  const data: Prisma.PaymentUpdateInput = {
    amountDue,
    amountPaid,
    status,
    collectedBy: viewer.sub,
  };
  if (input.mode !== undefined) data.mode = input.mode;
  if (input.reference !== undefined) data.reference = input.reference;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.paidAt !== undefined) data.paidAt = input.paidAt ? new Date(input.paidAt) : null;

  const updated = await prisma.payment.update({ where: { id: paymentId }, data });

  await audit({
    actorId: viewer.sub,
    action: 'payment.update',
    entity: 'Payment',
    entityId: paymentId,
    meta: { amountDue, amountPaid, status },
  });

  return { ...updated, paidAt: updated.paidAt?.toISOString() ?? null };
}
