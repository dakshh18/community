import { Router } from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import * as settings from '../services/settings';

export const meRouter = Router();

meRouter.use(requireAuth);

const privacySchema = z
  .object({
    showPhone: z.boolean().optional(),
    showAddress: z.boolean().optional(),
  })
  .refine((v) => v.showPhone !== undefined || v.showAddress !== undefined, {
    message: 'Provide showPhone and/or showAddress',
  });

const emailChangeSchema = z.object({
  newEmail: z.string().trim().min(3),
});

const emailVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

meRouter.patch('/privacy', async (req, res, next) => {
  try {
    const patch = privacySchema.parse(req.body);
    const result = await settings.patchPrivacy(req.auth!, patch);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

meRouter.patch('/email', async (req, res, next) => {
  try {
    const { newEmail } = emailChangeSchema.parse(req.body);
    const result = await settings.requestEmailChange(req.auth!, newEmail);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

meRouter.post('/email/verify', async (req, res, next) => {
  try {
    const { code } = emailVerifySchema.parse(req.body);
    const result = await settings.verifyEmailChange(req.auth!, code);
    res.json(result);
  } catch (e) {
    next(e);
  }
});
