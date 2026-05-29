import { Router } from 'express';
import { z } from 'zod';

import { authStart, sendOtp, verifyOtp } from '../services/auth';
import { env } from '../config/env';

export const authRouter = Router();

const startSchema = z.object({
  phone: z.string().min(7).max(20),
});

const sendOtpSchema = z.object({
  phone: z.string().min(7).max(20),
  email: z.string().email().optional(),
});

const verifySchema = z.object({
  phone: z.string().min(7).max(20),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

authRouter.post('/start', async (req, res, next) => {
  try {
    const { phone } = startSchema.parse(req.body);
    const result = await authStart(phone);
    if (!result.found) {
      res.status(404).json({
        error: 'not_registered',
        message: "Your number isn't in community records. Please contact the committee.",
        adminContactPhone: env.ADMIN_CONTACT_PHONE || null,
      });
      return;
    }
    res.json(result);
  } catch (e) {
    next(e);
  }
});

authRouter.post('/send-otp', async (req, res, next) => {
  try {
    const { phone, email } = sendOtpSchema.parse(req.body);
    const result = await sendOtp(phone, email);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

authRouter.post('/verify-otp', async (req, res, next) => {
  try {
    const { phone, code } = verifySchema.parse(req.body);
    const result = await verifyOtp(phone, code);
    res.json(result);
  } catch (e) {
    next(e);
  }
});
