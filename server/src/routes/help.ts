import { Router } from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import * as svc from '../services/help';

export const helpRouter = Router();
helpRouter.use(requireAuth);

const categorySchema = z.enum([
  'MEDICAL',
  'EDUCATION',
  'JOB',
  'BUSINESS',
  'LEGAL',
  'EMERGENCY',
  'BLOOD_DONATION',
]);
const urgencySchema = z.enum(['LOW', 'NORMAL', 'HIGH']);
const statusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

const createSchema = z.object({
  category: categorySchema,
  description: z.string().trim().min(1).max(2000),
  urgency: urgencySchema.optional(),
  contactPref: z.string().trim().max(200).nullable().optional(),
});

const listQuerySchema = z.object({
  status: statusSchema.optional(),
  category: categorySchema.optional(),
  urgency: urgencySchema.optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
});

const patchSchema = z.object({ status: statusSchema });

helpRouter.post('/', async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const r = await svc.createHelpRequest(req.auth!, body);
    res.status(201).json(r);
  } catch (e) {
    next(e);
  }
});

helpRouter.get('/me', async (req, res, next) => {
  try {
    res.json(await svc.listMyHelpRequests(req.auth!));
  } catch (e) {
    next(e);
  }
});

helpRouter.get('/', async (req, res, next) => {
  try {
    const q = listQuerySchema.parse(req.query);
    res.json(await svc.listHelpRequests(req.auth!, q));
  } catch (e) {
    next(e);
  }
});

helpRouter.patch('/:id', async (req, res, next) => {
  try {
    const { status } = patchSchema.parse(req.body);
    const r = await svc.updateHelpStatus(req.auth!, req.params.id, status);
    res.json(r);
  } catch (e) {
    next(e);
  }
});
