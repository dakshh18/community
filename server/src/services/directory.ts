/**
 * Directory service. Spec §8 (modules 1, 2) + §10.
 *
 * Every list/detail goes through the privacy filter in `./privacy` so hidden
 * fields never leave the service layer.
 */

import type { Prisma } from '@prisma/client';

import { prisma } from '../db/prisma';
import { HttpError } from '../middleware/errorHandler';
import {
  viewPerson,
  viewHousehold,
  type ViewerCtx,
  type PersonView,
  type HouseholdView,
} from './privacy';

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 20;

export interface DirectoryQuery {
  q?: string;
  professionCategoryId?: string;
  nativePlace?: string;
  city?: string;
  bloodGroup?: string;
  page?: number;
  pageSize?: number;
}

export interface DirectoryPage {
  items: PersonView[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface MyHouseholdResult {
  household: HouseholdView;
  members: PersonView[];
}

export interface ProfessionCategoryRow {
  id: string;
  name: string;
  nameGu: string | null;
  icon: string | null;
  personsCount: number;
}

function nonEmpty(s: string | undefined | null): string | undefined {
  if (s == null) return undefined;
  const t = String(s).trim();
  return t.length ? t : undefined;
}

export async function listDirectory(
  query: DirectoryQuery,
  viewer: ViewerCtx,
): Promise<DirectoryPage> {
  const page = Math.max(1, Math.trunc(query.page ?? 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.trunc(query.pageSize ?? DEFAULT_PAGE_SIZE)),
  );
  const skip = (page - 1) * pageSize;

  const where: Prisma.PersonWhereInput = {};
  const householdWhere: Prisma.HouseholdWhereInput = {};

  const q = nonEmpty(query.q);
  if (q) {
    where.fullName = { contains: q, mode: 'insensitive' };
  }

  const profId = nonEmpty(query.professionCategoryId);
  if (profId && OBJECT_ID.test(profId)) {
    where.professionCatId = profId;
  }

  const bloodGroup = nonEmpty(query.bloodGroup);
  if (bloodGroup) {
    where.bloodGroup = bloodGroup.toUpperCase();
  }

  const nativePlace = nonEmpty(query.nativePlace);
  if (nativePlace) {
    householdWhere.nativePlace = { contains: nativePlace, mode: 'insensitive' };
  }

  const city = nonEmpty(query.city);
  if (city) {
    householdWhere.city = { equals: city, mode: 'insensitive' };
  }

  if (Object.keys(householdWhere).length > 0) {
    where.household = householdWhere;
  }

  const [persons, total] = await Promise.all([
    prisma.person.findMany({
      where,
      include: {
        professionCat: true,
        household: { select: { nativePlace: true, city: true } },
      },
      orderBy: { fullName: 'asc' },
      skip,
      take: pageSize,
    }),
    prisma.person.count({ where }),
  ]);

  return {
    items: persons.map((p) => viewPerson(p, p.household, viewer)),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getPerson(id: string, viewer: ViewerCtx): Promise<PersonView> {
  if (!OBJECT_ID.test(id)) {
    throw new HttpError(400, 'invalid_id', 'Invalid person id');
  }
  const p = await prisma.person.findUnique({
    where: { id },
    include: {
      professionCat: true,
      household: { select: { nativePlace: true, city: true } },
    },
  });
  if (!p) throw new HttpError(404, 'not_found', 'Person not found');
  return viewPerson(p, p.household, viewer);
}

export async function getMyHousehold(viewer: ViewerCtx): Promise<MyHouseholdResult> {
  const h = await prisma.household.findUnique({
    where: { id: viewer.householdId },
    include: {
      head: true,
      persons: {
        include: { professionCat: true },
        orderBy: [{ relation: 'asc' }, { fullName: 'asc' }],
      },
    },
  });
  if (!h) throw new HttpError(404, 'not_found', 'Your household record was not found');

  const summary = { nativePlace: h.nativePlace, city: h.city };
  return {
    household: viewHousehold(h, viewer),
    members: h.persons.map((p) => viewPerson(p, summary, viewer)),
  };
}

export async function listProfessions(): Promise<ProfessionCategoryRow[]> {
  const cats = await prisma.professionCategory.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { persons: true } } },
  });
  return cats.map((c) => ({
    id: c.id,
    name: c.name,
    nameGu: c.nameGu,
    icon: c.icon,
    personsCount: c._count.persons,
  }));
}
