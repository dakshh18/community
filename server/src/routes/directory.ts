import { Router } from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import * as svc from '../services/directory';

export const directoryRouter = Router();

directoryRouter.use(requireAuth);

const directoryQuerySchema = z.object({
  q: z.string().trim().optional(),
  professionCategoryId: z.string().trim().optional(),
  nativePlace: z.string().trim().optional(),
  city: z.string().trim().optional(),
  bloodGroup: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
});

directoryRouter.get('/directory', async (req, res, next) => {
  try {
    const query = directoryQuerySchema.parse(req.query);
    const result = await svc.listDirectory(query, req.auth!);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

directoryRouter.get('/persons/:id', async (req, res, next) => {
  try {
    const result = await svc.getPerson(req.params.id, req.auth!);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

directoryRouter.get('/households/me', async (req, res, next) => {
  try {
    const result = await svc.getMyHousehold(req.auth!);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

directoryRouter.get('/professions', async (_req, res, next) => {
  try {
    const result = await svc.listProfessions();
    res.json(result);
  } catch (e) {
    next(e);
  }
});

directoryRouter.get('/native-places', async (_req, res, next) => {
  try {
    const result = await svc.listNativePlaces();
    res.json(result);
  } catch (e) {
    next(e);
  }
});
