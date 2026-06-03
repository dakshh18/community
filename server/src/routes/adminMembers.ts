/**
 * Admin-only member / household / user management routes. Spec §10.
 * Mounted under /admin and gated by requireRole('ADMIN'). Every mutating
 * handler delegates to services/members.ts, which writes an AuditLog.
 */
import { Router } from 'express';
import { z } from 'zod';

import { requireAuth, requireRole } from '../middleware/auth';
import * as svc from '../services/members';

export const adminMembersRouter = Router();
adminMembersRouter.use(requireAuth, requireRole('ADMIN'));

// ---------- Shared field schemas ----------

const relationEnum = z.enum([
  'SELF', 'SPOUSE', 'SON', 'DAUGHTER', 'DAUGHTER_IN_LAW',
  'MOTHER', 'FATHER', 'GRANDSON', 'GRANDDAUGHTER', 'OTHER',
]);
const genderEnum = z.enum(['MALE', 'FEMALE', 'OTHER']);
const roleEnum = z.enum(['ADMIN', 'COMMITTEE', 'MEMBER']);

const personCreateSchema = z.object({
  householdId: z.string().trim().min(1),
  fullName: z.string().trim().min(1).max(200),
  relation: relationEnum.optional(),
  gender: genderEnum.nullable().optional(),
  dob: z.string().nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  email: z.string().trim().email().nullable().optional().or(z.literal('')),
  professionRaw: z.string().trim().max(200).nullable().optional(),
  professionCatId: z.string().trim().nullable().optional(),
  bloodGroup: z.string().trim().max(5).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  showPhone: z.boolean().optional(),
  showAddress: z.boolean().optional(),
  makeHead: z.boolean().optional(),
});

const personUpdateSchema = personCreateSchema.partial().omit({ makeHead: true });

const householdCreateSchema = z.object({
  nativePlace: z.string().trim().min(1).max(120),
  nativeAddress: z.string().trim().max(500).nullable().optional(),
  vadodaraAddress: z.string().trim().max(500).nullable().optional(),
  city: z.string().trim().max(120).optional(),
  householdPhone: z.string().trim().max(20).nullable().optional(),
});

const householdUpdateSchema = householdCreateSchema.partial().extend({
  headPersonId: z.string().trim().nullable().optional(),
});

const userUpdateSchema = z.object({
  role: roleEnum.optional(),
  isActive: z.boolean().optional(),
});

const listQuery = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
});

// Normalize an optional email that may arrive as '' → null.
function cleanBody<T extends { email?: unknown }>(body: T): T {
  if (body.email === '') body.email = null;
  return body;
}

// ---------- Persons ----------

adminMembersRouter.get('/persons', async (req, res, next) => {
  try {
    const q = listQuery
      .extend({
        householdId: z.string().trim().optional(),
        professionCatId: z.string().trim().optional(),
        nativePlace: z.string().trim().optional(),
      })
      .parse(req.query);
    res.json(await svc.adminListPersons(q));
  } catch (e) {
    next(e);
  }
});

adminMembersRouter.post('/persons', async (req, res, next) => {
  try {
    const body = personCreateSchema.parse(cleanBody(req.body));
    res.status(201).json(await svc.adminCreatePerson(req.auth!, body));
  } catch (e) {
    next(e);
  }
});

adminMembersRouter.get('/persons/:id', async (req, res, next) => {
  try {
    res.json(await svc.adminGetPerson(req.params.id));
  } catch (e) {
    next(e);
  }
});

adminMembersRouter.patch('/persons/:id', async (req, res, next) => {
  try {
    const body = personUpdateSchema.parse(cleanBody(req.body));
    res.json(await svc.adminUpdatePerson(req.auth!, req.params.id, body));
  } catch (e) {
    next(e);
  }
});

adminMembersRouter.delete('/persons/:id', async (req, res, next) => {
  try {
    await svc.adminDeletePerson(req.auth!, req.params.id);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// ---------- Households ----------

adminMembersRouter.get('/households', async (req, res, next) => {
  try {
    const q = listQuery.extend({ nativePlace: z.string().trim().optional() }).parse(req.query);
    res.json(await svc.adminListHouseholds(q));
  } catch (e) {
    next(e);
  }
});

adminMembersRouter.post('/households', async (req, res, next) => {
  try {
    const body = householdCreateSchema.parse(req.body);
    res.status(201).json(await svc.adminCreateHousehold(req.auth!, body));
  } catch (e) {
    next(e);
  }
});

adminMembersRouter.get('/households/:id', async (req, res, next) => {
  try {
    res.json(await svc.adminGetHousehold(req.params.id));
  } catch (e) {
    next(e);
  }
});

adminMembersRouter.patch('/households/:id', async (req, res, next) => {
  try {
    const body = householdUpdateSchema.parse(req.body);
    res.json(await svc.adminUpdateHousehold(req.auth!, req.params.id, body));
  } catch (e) {
    next(e);
  }
});

adminMembersRouter.delete('/households/:id', async (req, res, next) => {
  try {
    await svc.adminDeleteHousehold(req.auth!, req.params.id);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// ---------- Users ----------

adminMembersRouter.get('/users', async (req, res, next) => {
  try {
    const q = listQuery.extend({ role: roleEnum.optional() }).parse(req.query);
    res.json(await svc.adminListUsers(q));
  } catch (e) {
    next(e);
  }
});

adminMembersRouter.patch('/users/:id', async (req, res, next) => {
  try {
    const body = userUpdateSchema.parse(req.body);
    res.json(await svc.adminUpdateUser(req.auth!, req.params.id, body));
  } catch (e) {
    next(e);
  }
});
