import { Router } from 'express';
import { z } from 'zod';

import { authStart, sendOtp, verifyOtp, adminLogin } from '../services/auth';
import { env } from '../config/env';

export const authRouter = Router();

const adminLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(200),
});

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

// Web admin panel: email + password. ADMIN/COMMITTEE only.
authRouter.post('/admin/login', async (req, res, next) => {
  try {
    const { email, password } = adminLoginSchema.parse(req.body);
    const result = await adminLogin(email, password);
    res.json(result);
  } catch (e) {
    next(e);
  }
});
