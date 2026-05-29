import { Router } from 'express';

import { requireAuth } from '../middleware/auth';
import { getCommitteeStats } from '../services/stats';

export const committeeRouter = Router();
committeeRouter.use(requireAuth);

committeeRouter.get('/stats', async (req, res, next) => {
  try {
    res.json(await getCommitteeStats(req.auth!));
  } catch (e) {
    next(e);
  }
});
