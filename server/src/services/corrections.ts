/**
 * Profile-correction queue. Spec §8 (module 25), §10.
 *
 * Members suggest a field-level change for any Person; admins/committee review.
 * Approving applies the change directly to the Person (and to the linked User
 * row if phone/email changed, so login keeps working).
 */

import type { Person, Prisma, ReviewStatus } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../db/prisma';
import { HttpError } from '../middleware/errorHandler';
import { audit } from '../utils/audit';
import { normalizePhone, toE164India } from '../utils/phone';
import { parseDob } from '../utils/dob';
import { resolveProfessionCategoryName } from '../utils/aliases/profession';
import type { ViewerCtx } from './privacy';

const OBJECT_ID = /^[a-f0-9]{24}$/i;

export const CORRECTABLE_FIELDS = [
  'fullName',
  'relation',
  'gender',
  'dob',
  'phone',
  'email',
  'bloodGroup',
  'professionRaw',
] as const;
export type CorrectableField = (typeof CORRECTABLE_FIELDS)[number];

const VALID_RELATIONS = new Set([
  'SELF',
  'SPOUSE',
  'SON',
  'DAUGHTER',
  'DAUGHTER_IN_LAW',
  'MOTHER',
  'FATHER',
  'GRANDSON',
  'GRANDDAUGHTER',
  'OTHER',
]);
const VALID_GENDERS = new Set(['MALE', 'FEMALE', 'OTHER']);
const BLOOD_GROUP_RE = /^(A|B|AB|O)[+-]$/;
const emailSchema = z.string().trim().toLowerCase().email();

function isPrivileged(viewer: ViewerCtx): boolean {
  return viewer.role === 'ADMIN' || viewer.role === 'COMMITTEE';
}

function readField(person: Person, field: CorrectableField): string | null {
  const v = person[field as keyof Person];
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

// ---------- Submit ----------

export interface CorrectionInput {
  personId: string;
  fieldName: CorrectableField;
  newValue: string;
}

export async function submitCorrection(viewer: ViewerCtx, input: CorrectionInput) {
  if (!OBJECT_ID.test(input.personId)) {
    throw new HttpError(400, 'invalid_id', 'Invalid person id');
  }
  const newValue = input.newValue.trim();
  if (!newValue) {
    throw new HttpError(400, 'empty_value', 'New value cannot be empty');
  }

  const target = await prisma.person.findUnique({ where: { id: input.personId } });
  if (!target) throw new HttpError(404, 'not_found', 'Person not found');

  const oldValue = readField(target, input.fieldName);
  if (oldValue === newValue) {
    throw new HttpError(400, 'no_change', 'New value is the same as current value');
  }

  const correction = await prisma.profileCorrectionRequest.create({
    data: {
      personId: input.personId,
      requestedByUserId: viewer.sub,
      fieldName: input.fieldName,
      oldValue,
      newValue,
      status: 'PENDING',
    },
  });

  await audit({
    actorId: viewer.sub,
    action: 'correction.submit',
    entity: 'ProfileCorrectionRequest',
    entityId: correction.id,
    meta: {
      personId: input.personId,
      field: input.fieldName,
      oldValue,
      newValue,
    },
  });

  return correction;
}

// ---------- List ----------

export interface ListQuery {
  status?: ReviewStatus;
  page?: number;
  pageSize?: number;
}

export async function listCorrections(viewer: ViewerCtx, query: ListQuery) {
  if (!isPrivileged(viewer)) {
    throw new HttpError(403, 'forbidden', 'Admin or committee role required');
  }
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const where: Prisma.ProfileCorrectionRequestWhereInput = {};
  if (query.status) where.status = query.status;

  const [rows, total] = await Promise.all([
    prisma.profileCorrectionRequest.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: pageSize,
    }),
    prisma.profileCorrectionRequest.count({ where }),
  ]);

  // Hydrate person + requester names with two cheap batch lookups.
  const personIds = [...new Set(rows.map((r) => r.personId))];
  const userIds = [...new Set(rows.map((r) => r.requestedByUserId))];

  const [persons, users] = await Promise.all([
    prisma.person.findMany({
      where: { id: { in: personIds } },
      select: { id: true, fullName: true },
    }),
    prisma.user.findMany({
      where: { id: { in: userIds } },
      include: { person: { select: { fullName: true } } },
    }),
  ]);

  const personById = new Map(persons.map((p) => [p.id, p]));
  const userById = new Map(users.map((u) => [u.id, u]));

  return {
    items: rows.map((r) => ({
      id: r.id,
      personId: r.personId,
      personName: personById.get(r.personId)?.fullName ?? '(deleted)',
      requestedByUserId: r.requestedByUserId,
      requestedByName:
        userById.get(r.requestedByUserId)?.person?.fullName ??
        userById.get(r.requestedByUserId)?.phone ??
        '(unknown)',
      fieldName: r.fieldName,
      oldValue: r.oldValue,
      newValue: r.newValue,
      status: r.status,
      reviewedByUserId: r.reviewedByUserId,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

// ---------- Review (approve / reject) ----------

export type ReviewAction = 'APPROVE' | 'REJECT';

export async function reviewCorrection(viewer: ViewerCtx, id: string, action: ReviewAction) {
  if (!isPrivileged(viewer)) {
    throw new HttpError(403, 'forbidden', 'Admin or committee role required');
  }
  if (!OBJECT_ID.test(id)) {
    throw new HttpError(400, 'invalid_id', 'Invalid correction id');
  }

  const correction = await prisma.profileCorrectionRequest.findUnique({ where: { id } });
  if (!correction) throw new HttpError(404, 'not_found', 'Correction not found');
  if (correction.status !== 'PENDING') {
    throw new HttpError(400, 'already_reviewed', `Already ${correction.status.toLowerCase()}`);
  }

  if (action === 'APPROVE') {
    await applyApprovedCorrection(correction);
  }

  const updated = await prisma.profileCorrectionRequest.update({
    where: { id },
    data: {
      status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      reviewedByUserId: viewer.sub,
    },
  });

  await audit({
    actorId: viewer.sub,
    action: action === 'APPROVE' ? 'correction.approve' : 'correction.reject',
    entity: 'ProfileCorrectionRequest',
    entityId: id,
    meta: {
      personId: correction.personId,
      field: correction.fieldName,
      oldValue: correction.oldValue,
      newValue: correction.newValue,
    },
  });

  return updated;
}

async function applyApprovedCorrection(c: {
  personId: string;
  fieldName: string;
  newValue: string | null;
}): Promise<void> {
  const raw = c.newValue?.trim();
  if (!raw) throw new HttpError(400, 'empty_value', 'New value is empty — cannot apply');

  const field = c.fieldName as CorrectableField;
  switch (field) {
    case 'fullName': {
      await prisma.person.update({ where: { id: c.personId }, data: { fullName: raw } });
      return;
    }

    case 'relation': {
      const r = raw.toUpperCase();
      if (!VALID_RELATIONS.has(r)) {
        throw new HttpError(400, 'invalid_value', `Invalid relation: ${raw}`);
      }
      await prisma.person.update({
        where: { id: c.personId },
        data: { relation: r as Prisma.PersonUpdateInput['relation'] },
      });
      return;
    }

    case 'gender': {
      const g = raw.toUpperCase();
      if (!VALID_GENDERS.has(g)) {
        throw new HttpError(400, 'invalid_value', `Invalid gender: ${raw}`);
      }
      await prisma.person.update({
        where: { id: c.personId },
        data: { gender: g as Prisma.PersonUpdateInput['gender'] },
      });
      return;
    }

    case 'dob': {
      const dob = parseDob(raw);
      if (!dob) throw new HttpError(400, 'invalid_value', `Invalid date: ${raw}`);
      await prisma.person.update({ where: { id: c.personId }, data: { dob } });
      return;
    }

    case 'bloodGroup': {
      const bg = raw.toUpperCase().replace(/\s+/g, '');
      if (!BLOOD_GROUP_RE.test(bg)) {
        throw new HttpError(400, 'invalid_value', `Invalid blood group: ${raw}`);
      }
      await prisma.person.update({ where: { id: c.personId }, data: { bloodGroup: bg } });
      return;
    }

    case 'phone': {
      const phone = normalizePhone(raw);
      if (!phone) throw new HttpError(400, 'invalid_value', `Invalid phone: ${raw}`);
      const conflict = await prisma.person.findUnique({ where: { phone } });
      if (conflict && conflict.id !== c.personId) {
        throw new HttpError(409, 'phone_in_use', 'Phone in use by another person');
      }
      const e164 = toE164India(phone);
      await prisma.person.update({
        where: { id: c.personId },
        data: { phone, phoneE164: e164 ?? undefined },
      });
      // Keep User.phone in sync so the next login works for this person.
      const linkedUser = await prisma.user.findUnique({ where: { personId: c.personId } });
      if (linkedUser) {
        await prisma.user.update({ where: { id: linkedUser.id }, data: { phone } });
      }
      return;
    }

    case 'email': {
      const parsed = emailSchema.safeParse(raw);
      if (!parsed.success) throw new HttpError(400, 'invalid_value', `Invalid email: ${raw}`);
      const email = parsed.data;
      const conflict = await prisma.person.findUnique({ where: { email } });
      if (conflict && conflict.id !== c.personId) {
        throw new HttpError(409, 'email_in_use', 'Email in use by another person');
      }
      await prisma.person.update({ where: { id: c.personId }, data: { email } });
      const linkedUser = await prisma.user.findUnique({ where: { personId: c.personId } });
      if (linkedUser) {
        await prisma.user.update({ where: { id: linkedUser.id }, data: { email } });
      }
      return;
    }

    case 'professionRaw': {
      const catName = resolveProfessionCategoryName(raw);
      const cat = catName
        ? await prisma.professionCategory.findUnique({ where: { name: catName } })
        : null;
      await prisma.person.update({
        where: { id: c.personId },
        data: {
          professionRaw: raw,
          professionCatId: cat?.id ?? null,
        },
      });
      return;
    }

    default: {
      const exhaustive: never = field;
      throw new HttpError(400, 'invalid_field', `Field not correctable: ${exhaustive}`);
    }
  }
}
