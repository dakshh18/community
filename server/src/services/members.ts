/**
 * Admin member & household management. Spec §10 ("GET/POST/PATCH/DELETE
 * /persons and /households (admin only)") + §8 module 7.
 *
 * Unlike the directory service, these endpoints are NOT privacy-filtered — an
 * admin sees and edits every field. Each mutation writes an AuditLog (§10).
 * Role gating is enforced by `requireRole('ADMIN')` on the router.
 */

import type { Prisma, Relation, Gender } from '@prisma/client';

import { prisma } from '../db/prisma';
import { HttpError } from '../middleware/errorHandler';
import { audit } from '../utils/audit';
import { normalizePhone, toE164India } from '../utils/phone';
import { buildLatinIndex } from '../utils/translit';
import { resolveProfessionCategoryName } from '../utils/aliases/profession';
import type { ViewerCtx } from './privacy';

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function assertId(id: string, label = 'id'): void {
  if (!OBJECT_ID.test(id)) {
    throw new HttpError(400, 'invalid_id', `Invalid ${label}`);
  }
}

function clampPage(page?: number): number {
  return Math.max(1, Math.trunc(page ?? 1));
}
function clampSize(size?: number): number {
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(size ?? DEFAULT_PAGE_SIZE)));
}

// ---------- DTO shapes returned to the admin panel ----------

type PersonRow = Prisma.PersonGetPayload<{
  include: { professionCat: true; household: true; user: true };
}>;

export interface AdminPersonDto {
  id: string;
  householdId: string;
  fullName: string;
  relation: Relation;
  gender: Gender | null;
  dob: string | null;
  phone: string | null;
  phoneE164: string | null;
  email: string | null;
  professionRaw: string | null;
  professionCatId: string | null;
  professionName: string | null;
  bloodGroup: string | null;
  notes: string | null;
  showPhone: boolean;
  showAddress: boolean;
  isHead: boolean;
  hasAccount: boolean;
  household?: { id: string; nativePlace: string; city: string };
  createdAt: string;
  updatedAt: string;
}

function toPersonDto(p: PersonRow): AdminPersonDto {
  return {
    id: p.id,
    householdId: p.householdId,
    fullName: p.fullName,
    relation: p.relation,
    gender: p.gender,
    dob: p.dob ? p.dob.toISOString() : null,
    phone: p.phone,
    phoneE164: p.phoneE164,
    email: p.email,
    professionRaw: p.professionRaw,
    professionCatId: p.professionCatId,
    professionName: p.professionCat?.name ?? null,
    bloodGroup: p.bloodGroup,
    notes: p.notes,
    showPhone: p.showPhone,
    showAddress: p.showAddress,
    isHead: p.household.headPersonId === p.id,
    hasAccount: !!p.user,
    household: {
      id: p.household.id,
      nativePlace: p.household.nativePlace.trim(),
      city: p.household.city,
    },
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

const personInclude = {
  professionCat: true,
  household: true,
  user: true,
} satisfies Prisma.PersonInclude;

// ---------- Profession resolution ----------

/**
 * Resolve a profession category id from explicit input or raw text.
 * - explicit `professionCatId` (validated to exist) wins
 * - else resolve `professionRaw` through the alias map (§5)
 * - else null
 */
async function resolveProfessionCatId(
  professionCatId: string | null | undefined,
  professionRaw: string | null | undefined,
): Promise<string | null> {
  if (professionCatId) {
    assertId(professionCatId, 'professionCatId');
    const cat = await prisma.professionCategory.findUnique({
      where: { id: professionCatId },
      select: { id: true },
    });
    if (!cat) throw new HttpError(400, 'invalid_category', 'Profession category not found');
    return cat.id;
  }
  if (professionRaw) {
    const name = resolveProfessionCategoryName(professionRaw);
    if (name) {
      const cat = await prisma.professionCategory.findUnique({
        where: { name },
        select: { id: true },
      });
      return cat?.id ?? null;
    }
  }
  return null;
}

// ---------- Phone / DOB helpers ----------

/** Validate + normalize a phone, checking uniqueness against other persons. */
async function normalizeUniquePhone(
  raw: string | null | undefined,
  excludePersonId?: string,
): Promise<{ phone: string | null; phoneE164: string | null }> {
  if (raw == null || raw.trim() === '') {
    return { phone: null, phoneE164: null };
  }
  const phone = normalizePhone(raw);
  if (!phone) throw new HttpError(400, 'invalid_phone', 'Invalid phone number');
  const existing = await prisma.person.findUnique({ where: { phone }, select: { id: true } });
  if (existing && existing.id !== excludePersonId) {
    throw new HttpError(409, 'phone_in_use', 'This phone is already on another member');
  }
  return { phone, phoneE164: toE164India(phone) };
}

function parseDob(raw: string | null | undefined): Date | null {
  if (raw == null || raw.trim() === '') return null;
  const d = new Date(raw);
  if (!isFinite(d.getTime())) throw new HttpError(400, 'invalid_dob', 'Invalid date of birth');
  return d;
}

// =====================================================================
// Persons
// =====================================================================

export interface PersonListQuery {
  q?: string;
  householdId?: string;
  professionCatId?: string;
  nativePlace?: string;
  page?: number;
  pageSize?: number;
}

export async function adminListPersons(query: PersonListQuery) {
  const page = clampPage(query.page);
  const pageSize = clampSize(query.pageSize);
  const where: Prisma.PersonWhereInput = {};

  const q = query.q?.trim();
  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: 'insensitive' } },
      { fullNameLatin: { contains: q.toLowerCase(), mode: 'insensitive' } },
      { phone: { contains: q.replace(/\D/g, '') } },
    ];
  }
  if (query.householdId) {
    assertId(query.householdId, 'householdId');
    where.householdId = query.householdId;
  }
  if (query.professionCatId) {
    assertId(query.professionCatId, 'professionCatId');
    where.professionCatId = query.professionCatId;
  }
  if (query.nativePlace?.trim()) {
    where.household = { nativePlace: { contains: query.nativePlace.trim(), mode: 'insensitive' } };
  }

  const [rows, total] = await Promise.all([
    prisma.person.findMany({
      where,
      include: personInclude,
      orderBy: { fullName: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.person.count({ where }),
  ]);

  return {
    items: rows.map(toPersonDto),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function adminGetPerson(id: string): Promise<AdminPersonDto> {
  assertId(id, 'person id');
  const p = await prisma.person.findUnique({ where: { id }, include: personInclude });
  if (!p) throw new HttpError(404, 'not_found', 'Person not found');
  return toPersonDto(p);
}

export interface PersonCreateInput {
  householdId: string;
  fullName: string;
  relation?: Relation;
  gender?: Gender | null;
  dob?: string | null;
  phone?: string | null;
  email?: string | null;
  professionRaw?: string | null;
  professionCatId?: string | null;
  bloodGroup?: string | null;
  notes?: string | null;
  showPhone?: boolean;
  showAddress?: boolean;
  makeHead?: boolean;
}

export async function adminCreatePerson(
  actor: ViewerCtx,
  input: PersonCreateInput,
): Promise<AdminPersonDto> {
  assertId(input.householdId, 'householdId');
  const household = await prisma.household.findUnique({ where: { id: input.householdId } });
  if (!household) throw new HttpError(400, 'invalid_household', 'Household not found');

  const fullName = input.fullName.trim();
  if (!fullName) throw new HttpError(400, 'invalid_name', 'Full name is required');

  const { phone, phoneE164 } = await normalizeUniquePhone(input.phone);
  const professionCatId = await resolveProfessionCatId(input.professionCatId, input.professionRaw);

  const person = await prisma.person.create({
    data: {
      householdId: input.householdId,
      fullName,
      fullNameLatin: buildLatinIndex(fullName),
      relation: input.relation ?? 'OTHER',
      gender: input.gender ?? null,
      dob: parseDob(input.dob),
      phone,
      phoneE164,
      email: input.email?.trim().toLowerCase() || null,
      professionRaw: input.professionRaw?.trim() || null,
      professionCatId,
      bloodGroup: input.bloodGroup?.trim().toUpperCase() || null,
      notes: input.notes?.trim() || null,
      showPhone: input.showPhone ?? true,
      showAddress: input.showAddress ?? false,
    },
    include: personInclude,
  });

  if (input.makeHead || input.relation === 'SELF') {
    await prisma.household.update({
      where: { id: household.id },
      data: { headPersonId: person.id },
    });
  }

  await audit({
    actorId: actor.sub,
    action: 'person.create',
    entity: 'Person',
    entityId: person.id,
    meta: { fullName, householdId: household.id },
  });

  return adminGetPerson(person.id);
}

export interface PersonUpdateInput {
  householdId?: string;
  fullName?: string;
  relation?: Relation;
  gender?: Gender | null;
  dob?: string | null;
  phone?: string | null;
  email?: string | null;
  professionRaw?: string | null;
  professionCatId?: string | null;
  bloodGroup?: string | null;
  notes?: string | null;
  showPhone?: boolean;
  showAddress?: boolean;
}

export async function adminUpdatePerson(
  actor: ViewerCtx,
  id: string,
  input: PersonUpdateInput,
): Promise<AdminPersonDto> {
  assertId(id, 'person id');
  const existing = await prisma.person.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'not_found', 'Person not found');

  const data: Prisma.PersonUpdateInput = {};

  if (input.householdId !== undefined) {
    assertId(input.householdId, 'householdId');
    const h = await prisma.household.findUnique({ where: { id: input.householdId } });
    if (!h) throw new HttpError(400, 'invalid_household', 'Household not found');
    data.household = { connect: { id: input.householdId } };
  }
  if (input.fullName !== undefined) {
    const fullName = input.fullName.trim();
    if (!fullName) throw new HttpError(400, 'invalid_name', 'Full name cannot be empty');
    data.fullName = fullName;
    data.fullNameLatin = buildLatinIndex(fullName);
  }
  if (input.relation !== undefined) data.relation = input.relation;
  if (input.gender !== undefined) data.gender = input.gender;
  if (input.dob !== undefined) data.dob = parseDob(input.dob);
  if (input.phone !== undefined) {
    const { phone, phoneE164 } = await normalizeUniquePhone(input.phone, id);
    data.phone = phone;
    data.phoneE164 = phoneE164;
  }
  if (input.email !== undefined) data.email = input.email?.trim().toLowerCase() || null;
  if (input.professionRaw !== undefined) data.professionRaw = input.professionRaw?.trim() || null;
  if (input.professionCatId !== undefined || input.professionRaw !== undefined) {
    const catId = await resolveProfessionCatId(
      input.professionCatId,
      input.professionRaw ?? existing.professionRaw,
    );
    data.professionCat = catId ? { connect: { id: catId } } : { disconnect: true };
  }
  if (input.bloodGroup !== undefined) {
    data.bloodGroup = input.bloodGroup?.trim().toUpperCase() || null;
  }
  if (input.notes !== undefined) data.notes = input.notes?.trim() || null;
  if (input.showPhone !== undefined) data.showPhone = input.showPhone;
  if (input.showAddress !== undefined) data.showAddress = input.showAddress;

  await prisma.person.update({ where: { id }, data });

  await audit({
    actorId: actor.sub,
    action: 'person.update',
    entity: 'Person',
    entityId: id,
    meta: { fields: Object.keys(input) },
  });

  return adminGetPerson(id);
}

export async function adminDeletePerson(actor: ViewerCtx, id: string): Promise<void> {
  assertId(id, 'person id');
  const person = await prisma.person.findUnique({
    where: { id },
    include: { user: true, headOf: true },
  });
  if (!person) throw new HttpError(404, 'not_found', 'Person not found');

  if (person.user) {
    throw new HttpError(
      409,
      'has_account',
      'This member has a login account. Deactivate the user before deleting.',
    );
  }

  // If they head a household, clear that pointer first so we don't dangle.
  if (person.headOf) {
    await prisma.household.update({
      where: { id: person.headOf.id },
      data: { headPersonId: null },
    });
  }

  await prisma.person.delete({ where: { id } });

  await audit({
    actorId: actor.sub,
    action: 'person.delete',
    entity: 'Person',
    entityId: id,
    meta: { fullName: person.fullName },
  });
}

// =====================================================================
// Households
// =====================================================================

type HouseholdRow = Prisma.HouseholdGetPayload<{
  include: { head: true; _count: { select: { persons: true } } };
}>;

export interface AdminHouseholdDto {
  id: string;
  nativePlace: string;
  nativeAddress: string | null;
  vadodaraAddress: string | null;
  city: string;
  householdPhone: string | null;
  headPersonId: string | null;
  headName: string | null;
  personsCount: number;
  createdAt: string;
  updatedAt: string;
}

function toHouseholdDto(h: HouseholdRow): AdminHouseholdDto {
  return {
    id: h.id,
    nativePlace: h.nativePlace.trim(),
    nativeAddress: h.nativeAddress,
    vadodaraAddress: h.vadodaraAddress,
    city: h.city,
    householdPhone: h.householdPhone,
    headPersonId: h.headPersonId,
    headName: h.head?.fullName ?? null,
    personsCount: h._count.persons,
    createdAt: h.createdAt.toISOString(),
    updatedAt: h.updatedAt.toISOString(),
  };
}

const householdInclude = {
  head: true,
  _count: { select: { persons: true } },
} satisfies Prisma.HouseholdInclude;

export interface HouseholdListQuery {
  q?: string;
  nativePlace?: string;
  page?: number;
  pageSize?: number;
}

export async function adminListHouseholds(query: HouseholdListQuery) {
  const page = clampPage(query.page);
  const pageSize = clampSize(query.pageSize);
  const where: Prisma.HouseholdWhereInput = {};

  const q = query.q?.trim();
  if (q) {
    where.OR = [
      { nativePlace: { contains: q, mode: 'insensitive' } },
      { vadodaraAddress: { contains: q, mode: 'insensitive' } },
      { head: { is: { fullName: { contains: q, mode: 'insensitive' } } } },
      { householdPhone: { contains: q.replace(/\D/g, '') } },
    ];
  }
  if (query.nativePlace?.trim()) {
    where.nativePlace = { contains: query.nativePlace.trim(), mode: 'insensitive' };
  }

  const [rows, total] = await Promise.all([
    prisma.household.findMany({
      where,
      include: householdInclude,
      orderBy: [{ nativePlace: 'asc' }, { createdAt: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.household.count({ where }),
  ]);

  return {
    items: rows.map(toHouseholdDto),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function adminGetHousehold(id: string) {
  assertId(id, 'household id');
  const h = await prisma.household.findUnique({
    where: { id },
    include: {
      ...householdInclude,
      persons: { include: personInclude, orderBy: [{ relation: 'asc' }, { fullName: 'asc' }] },
    },
  });
  if (!h) throw new HttpError(404, 'not_found', 'Household not found');
  return {
    ...toHouseholdDto(h),
    members: h.persons.map(toPersonDto),
  };
}

export interface HouseholdCreateInput {
  nativePlace: string;
  nativeAddress?: string | null;
  vadodaraAddress?: string | null;
  city?: string;
  householdPhone?: string | null;
}

export async function adminCreateHousehold(
  actor: ViewerCtx,
  input: HouseholdCreateInput,
): Promise<AdminHouseholdDto> {
  const nativePlace = input.nativePlace.trim();
  if (!nativePlace) throw new HttpError(400, 'invalid_native_place', 'Native place is required');

  const householdPhone = input.householdPhone?.trim()
    ? normalizePhone(input.householdPhone)
    : null;
  if (input.householdPhone?.trim() && !householdPhone) {
    throw new HttpError(400, 'invalid_phone', 'Invalid household phone');
  }

  const h = await prisma.household.create({
    data: {
      nativePlace,
      nativeAddress: input.nativeAddress?.trim() || null,
      vadodaraAddress: input.vadodaraAddress?.trim() || null,
      city: input.city?.trim() || 'Vadodara',
      householdPhone,
    },
    include: householdInclude,
  });

  await audit({
    actorId: actor.sub,
    action: 'household.create',
    entity: 'Household',
    entityId: h.id,
    meta: { nativePlace },
  });

  return toHouseholdDto(h);
}

export interface HouseholdUpdateInput {
  nativePlace?: string;
  nativeAddress?: string | null;
  vadodaraAddress?: string | null;
  city?: string;
  householdPhone?: string | null;
  headPersonId?: string | null;
}

export async function adminUpdateHousehold(
  actor: ViewerCtx,
  id: string,
  input: HouseholdUpdateInput,
): Promise<AdminHouseholdDto> {
  assertId(id, 'household id');
  const existing = await prisma.household.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'not_found', 'Household not found');

  const data: Prisma.HouseholdUpdateInput = {};
  if (input.nativePlace !== undefined) {
    const np = input.nativePlace.trim();
    if (!np) throw new HttpError(400, 'invalid_native_place', 'Native place cannot be empty');
    data.nativePlace = np;
  }
  if (input.nativeAddress !== undefined) data.nativeAddress = input.nativeAddress?.trim() || null;
  if (input.vadodaraAddress !== undefined) {
    data.vadodaraAddress = input.vadodaraAddress?.trim() || null;
  }
  if (input.city !== undefined) data.city = input.city?.trim() || 'Vadodara';
  if (input.householdPhone !== undefined) {
    if (input.householdPhone?.trim()) {
      const p = normalizePhone(input.householdPhone);
      if (!p) throw new HttpError(400, 'invalid_phone', 'Invalid household phone');
      data.householdPhone = p;
    } else {
      data.householdPhone = null;
    }
  }
  if (input.headPersonId !== undefined) {
    if (input.headPersonId === null) {
      data.head = { disconnect: true };
    } else {
      assertId(input.headPersonId, 'headPersonId');
      const head = await prisma.person.findUnique({ where: { id: input.headPersonId } });
      if (!head || head.householdId !== id) {
        throw new HttpError(400, 'invalid_head', 'Head must be a member of this household');
      }
      data.head = { connect: { id: input.headPersonId } };
    }
  }

  const h = await prisma.household.update({ where: { id }, data, include: householdInclude });

  await audit({
    actorId: actor.sub,
    action: 'household.update',
    entity: 'Household',
    entityId: id,
    meta: { fields: Object.keys(input) },
  });

  return toHouseholdDto(h);
}

export async function adminDeleteHousehold(actor: ViewerCtx, id: string): Promise<void> {
  assertId(id, 'household id');
  const h = await prisma.household.findUnique({
    where: { id },
    include: { _count: { select: { persons: true } } },
  });
  if (!h) throw new HttpError(404, 'not_found', 'Household not found');
  if (h._count.persons > 0) {
    throw new HttpError(
      409,
      'household_not_empty',
      `Household still has ${h._count.persons} member(s). Move or delete them first.`,
    );
  }

  // Break the self-referential head pointer before deleting.
  if (h.headPersonId) {
    await prisma.household.update({ where: { id }, data: { headPersonId: null } });
  }
  await prisma.household.delete({ where: { id } });

  await audit({
    actorId: actor.sub,
    action: 'household.delete',
    entity: 'Household',
    entityId: id,
    meta: { nativePlace: h.nativePlace },
  });
}

// =====================================================================
// Users (role / activation)
// =====================================================================

export interface UserListQuery {
  q?: string;
  role?: 'ADMIN' | 'COMMITTEE' | 'MEMBER';
  page?: number;
  pageSize?: number;
}

export async function adminListUsers(query: UserListQuery) {
  const page = clampPage(query.page);
  const pageSize = clampSize(query.pageSize);
  const where: Prisma.UserWhereInput = {};
  if (query.role) where.role = query.role;
  const q = query.q?.trim();
  if (q) {
    where.OR = [
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q.replace(/\D/g, '') } },
      { person: { is: { fullName: { contains: q, mode: 'insensitive' } } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { person: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: rows.map((u) => ({
      id: u.id,
      phone: toE164India(u.phone),
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      hasPassword: !!u.passwordHash,
      personName: u.person?.fullName ?? null,
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      createdAt: u.createdAt.toISOString(),
    })),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export interface UserUpdateInput {
  role?: 'ADMIN' | 'COMMITTEE' | 'MEMBER';
  isActive?: boolean;
}

export async function adminUpdateUser(actor: ViewerCtx, id: string, input: UserUpdateInput) {
  assertId(id, 'user id');
  if (id === actor.sub && (input.role !== undefined || input.isActive === false)) {
    throw new HttpError(400, 'self_modify', 'You cannot change your own role or deactivate yourself');
  }
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'not_found', 'User not found');

  const data: Prisma.UserUpdateInput = {};
  if (input.role !== undefined) data.role = input.role;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  const u = await prisma.user.update({
    where: { id },
    data,
    include: { person: { select: { fullName: true } } },
  });

  await audit({
    actorId: actor.sub,
    action: 'user.update',
    entity: 'User',
    entityId: id,
    meta: { ...input },
  });

  return {
    id: u.id,
    phone: toE164India(u.phone),
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    hasPassword: !!u.passwordHash,
    personName: u.person?.fullName ?? null,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    createdAt: u.createdAt.toISOString(),
  };
}
