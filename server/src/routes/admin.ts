import { Router } from 'express';

import { requireAuth } from '../middleware/auth';
import { getAdminStats } from '../services/stats';

export const adminRouter = Router();
adminRouter.use(requireAuth);

adminRouter.get('/stats', async (req, res, next) => {
  try {
    res.json(await getAdminStats(req.auth!));
  } catch (e) {
    next(e);
  }
});
