import { Router } from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import * as svc from '../services/corrections';
import { CORRECTABLE_FIELDS } from '../services/corrections';

export const correctionsRouter = Router();

correctionsRouter.use(requireAuth);

const submitSchema = z.object({
  personId: z.string().trim(),
  fieldName: z.enum(CORRECTABLE_FIELDS),
  newValue: z.string().min(1).max(500),
});

const listQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
});

const reviewSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
});

correctionsRouter.post('/', async (req, res, next) => {
  try {
    const body = submitSchema.parse(req.body);
    const result = await svc.submitCorrection(req.auth!, body);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
});

correctionsRouter.get('/', async (req, res, next) => {
  try {
    const q = listQuerySchema.parse(req.query);
    const result = await svc.listCorrections(req.auth!, q);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

correctionsRouter.patch('/:id', async (req, res, next) => {
  try {
    const { action } = reviewSchema.parse(req.body);
    const result = await svc.reviewCorrection(req.auth!, req.params.id, action);
    res.json(result);
  } catch (e) {
    next(e);
  }
});
