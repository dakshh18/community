/**
 * Help requests. Spec §8 module 3.
 *
 * Any member can submit; ADMIN/COMMITTEE review and update status (using the
 * shared ReviewStatus enum — PENDING means open, APPROVED means resolved /
 * accepted, REJECTED means closed).
 */

import type { HelpCategory, Prisma, ReviewStatus, Urgency } from '@prisma/client';

import { prisma } from '../db/prisma';
import { HttpError } from '../middleware/errorHandler';
import { audit } from '../utils/audit';
import type { ViewerCtx } from './privacy';

const OBJECT_ID = /^[a-f0-9]{24}$/i;

const VALID_CATEGORIES: HelpCategory[] = [
  'MEDICAL',
  'EDUCATION',
  'JOB',
  'BUSINESS',
  'LEGAL',
  'EMERGENCY',
  'BLOOD_DONATION',
];
const VALID_URGENCY: Urgency[] = ['LOW', 'NORMAL', 'HIGH'];

function isPrivileged(viewer: ViewerCtx): boolean {
  return viewer.role === 'ADMIN' || viewer.role === 'COMMITTEE';
}

export interface HelpInput {
  category: HelpCategory;
  description: string;
  urgency?: Urgency;
  contactPref?: string | null;
}

export interface HelpListQuery {
  status?: ReviewStatus;
  category?: HelpCategory;
  urgency?: Urgency;
  page?: number;
  pageSize?: number;
}

export async function createHelpRequest(viewer: ViewerCtx, input: HelpInput) {
  if (!VALID_CATEGORIES.includes(input.category)) {
    throw new HttpError(400, 'invalid_value', `Invalid category: ${input.category}`);
  }
  const desc = input.description?.trim();
  if (!desc) throw new HttpError(400, 'invalid_value', 'description is required');
  if (input.urgency && !VALID_URGENCY.includes(input.urgency)) {
    throw new HttpError(400, 'invalid_value', `Invalid urgency: ${input.urgency}`);
  }

  const created = await prisma.helpRequest.create({
    data: {
      requestedBy: viewer.sub,
      category: input.category,
      description: desc,
      urgency: input.urgency ?? 'NORMAL',
      contactPref: input.contactPref?.trim() || null,
      status: 'PENDING',
    },
  });

  await audit({
    actorId: viewer.sub,
    action: 'help.create',
    entity: 'HelpRequest',
    entityId: created.id,
    meta: { category: input.category, urgency: created.urgency },
  });

  return created;
}

export async function listMyHelpRequests(viewer: ViewerCtx) {
  return prisma.helpRequest.findMany({
    where: { requestedBy: viewer.sub },
    orderBy: { createdAt: 'desc' },
  });
}

export async function listHelpRequests(viewer: ViewerCtx, query: HelpListQuery) {
  if (!isPrivileged(viewer)) {
    throw new HttpError(403, 'forbidden', 'Admin or committee role required');
  }
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const where: Prisma.HelpRequestWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.category) where.category = query.category;
  if (query.urgency) where.urgency = query.urgency;

  const [rows, total] = await Promise.all([
    prisma.helpRequest.findMany({
      where,
      orderBy: [{ status: 'asc' }, { urgency: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: pageSize,
    }),
    prisma.helpRequest.count({ where }),
  ]);

  // Hydrate requester names with one batch lookup.
  const userIds = [...new Set(rows.map((r) => r.requestedBy))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    include: { person: { select: { fullName: true, household: { select: { nativePlace: true } } } } },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  return {
    items: rows.map((r) => {
      const u = userById.get(r.requestedBy);
      return {
        id: r.id,
        category: r.category,
        description: r.description,
        urgency: r.urgency,
        status: r.status,
        contactPref: r.contactPref,
        requestedBy: r.requestedBy,
        requestedByName: u?.person?.fullName ?? u?.phone ?? '(unknown)',
        nativePlace: u?.person?.household?.nativePlace?.trim() ?? '',
        createdAt: r.createdAt.toISOString(),
      };
    }),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function updateHelpStatus(viewer: ViewerCtx, id: string, status: ReviewStatus) {
  if (!isPrivileged(viewer)) {
    throw new HttpError(403, 'forbidden', 'Admin or committee role required');
  }
  if (!OBJECT_ID.test(id)) throw new HttpError(400, 'invalid_id', 'Invalid help request id');
  if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
    throw new HttpError(400, 'invalid_value', `Invalid status: ${status}`);
  }
  const existing = await prisma.helpRequest.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'not_found', 'Help request not found');

  const updated = await prisma.helpRequest.update({ where: { id }, data: { status } });
  await audit({
    actorId: viewer.sub,
    action: 'help.update',
    entity: 'HelpRequest',
    entityId: id,
    meta: { from: existing.status, to: status },
  });
  return updated;
}
