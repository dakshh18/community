/**
 * Top-level routes for items that don't naturally nest under /events/:id —
 * specifically PATCH /payments/:id, PATCH/DELETE /expenses/:id, and
 * POST /registrations/:regId/performances + DELETE /performances/:id.
 */

import { Router } from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import * as pays from '../services/payments';
import * as expenses from '../services/expenses';
import * as regs from '../services/registrations';

export const itemsRouter = Router();
itemsRouter.use(requireAuth);

const paymentPatchSchema = z.object({
  amountDue: z.number().int().nonnegative().max(10_000_000).optional(),
  amountPaid: z.number().int().nonnegative().max(10_000_000).optional(),
  mode: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER']).nullable().optional(),
  reference: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  paidAt: z.string().nullable().optional(),
});

const expensePatchSchema = z.object({
  category: z.enum(['FOOD', 'VENUE', 'DECORATION', 'SOUND', 'GIFTS', 'PRINTING', 'MISC']).optional(),
  amount: z.number().int().positive().max(10_000_000).optional(),
  paidTo: z.string().trim().max(200).nullable().optional(),
  paidBy: z.string().trim().max(200).nullable().optional(),
  date: z.string().nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

const performanceSchema = z.object({
  childName: z.string().trim().min(1).max(120),
  type: z.enum(['DANCE', 'ACT', 'SPEECH', 'SINGING', 'OTHER']),
  title: z.string().trim().max(200).nullable().optional(),
  durationMin: z.number().int().nonnegative().max(600).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

// ---------- Payments ----------
itemsRouter.patch('/payments/:id', async (req, res, next) => {
  try {
    const body = paymentPatchSchema.parse(req.body);
    const r = await pays.updatePayment(req.auth!, req.params.id, body);
    res.json(r);
  } catch (e) {
    next(e);
  }
});

// ---------- Expenses ----------
itemsRouter.patch('/expenses/:id', async (req, res, next) => {
  try {
    const body = expensePatchSchema.parse(req.body);
    const r = await expenses.updateExpense(req.auth!, req.params.id, body);
    res.json(r);
  } catch (e) {
    next(e);
  }
});

itemsRouter.delete('/expenses/:id', async (req, res, next) => {
  try {
    await expenses.deleteExpense(req.auth!, req.params.id);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// ---------- Performances ----------
itemsRouter.post('/registrations/:regId/performances', async (req, res, next) => {
  try {
    const body = performanceSchema.parse(req.body);
    const r = await regs.addPerformance(req.auth!, req.params.regId, body);
    res.status(201).json(r);
  } catch (e) {
    next(e);
  }
});

itemsRouter.delete('/performances/:id', async (req, res, next) => {
  try {
    await regs.removePerformance(req.auth!, req.params.id);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
