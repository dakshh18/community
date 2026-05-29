import { Router } from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import * as events from '../services/events';
import * as regs from '../services/registrations';
import * as pays from '../services/payments';
import * as expenses from '../services/expenses';

export const eventsRouter = Router();
eventsRouter.use(requireAuth);

// ---------- Schemas ----------

const eventBaseSchema = z.object({
  name: z.string().trim().min(1).max(200),
  dateTime: z.string().min(1),
  venue: z.string().trim().max(200).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  contributionPerFamily: z.number().int().nonnegative().max(1_000_000).optional(),
  registrationOpen: z.boolean().optional(),
});
const eventCreateSchema = eventBaseSchema;
const eventUpdateSchema = eventBaseSchema.partial();

const listQuerySchema = z.object({
  upcoming: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
});

const performanceTypeSchema = z.enum(['DANCE', 'ACT', 'SPEECH', 'SINGING', 'OTHER']);
const performanceSchema = z.object({
  childName: z.string().trim().min(1).max(120),
  type: performanceTypeSchema,
  title: z.string().trim().max(200).nullable().optional(),
  durationMin: z.number().int().nonnegative().max(600).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

const registerSchema = z.object({
  attendeesCount: z.number().int().nonnegative().max(200),
  performances: z.array(performanceSchema).max(20).optional(),
});

const paymentRecordSchema = z.object({
  householdId: z.string().trim().min(1),
  amountPaid: z.number().int().nonnegative().max(10_000_000),
  mode: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER']).nullable().optional(),
  reference: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  paidAt: z.string().nullable().optional(),
});

const paymentListSchema = z.object({
  status: z.enum(['PENDING', 'PARTIAL', 'PAID']).optional(),
});

const expenseBaseSchema = z.object({
  category: z.enum(['FOOD', 'VENUE', 'DECORATION', 'SOUND', 'GIFTS', 'PRINTING', 'MISC']),
  amount: z.number().int().positive().max(10_000_000),
  paidTo: z.string().trim().max(200).nullable().optional(),
  paidBy: z.string().trim().max(200).nullable().optional(),
  date: z.string().nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

// ---------- Events CRUD ----------

eventsRouter.get('/', async (req, res, next) => {
  try {
    const q = listQuerySchema.parse(req.query);
    res.json(await events.listEvents(req.auth!, q));
  } catch (e) {
    next(e);
  }
});

eventsRouter.post('/', async (req, res, next) => {
  try {
    const body = eventCreateSchema.parse(req.body);
    const result = await events.createEvent(req.auth!, body);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
});

eventsRouter.get('/:id', async (req, res, next) => {
  try {
    res.json(await events.getEvent(req.auth!, req.params.id));
  } catch (e) {
    next(e);
  }
});

eventsRouter.patch('/:id', async (req, res, next) => {
  try {
    const body = eventUpdateSchema.parse(req.body);
    res.json(await events.updateEvent(req.auth!, req.params.id, body));
  } catch (e) {
    next(e);
  }
});

eventsRouter.delete('/:id', async (req, res, next) => {
  try {
    await events.deleteEvent(req.auth!, req.params.id);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

eventsRouter.get('/:id/dashboard', async (req, res, next) => {
  try {
    res.json(await events.getEventDashboard(req.auth!, req.params.id));
  } catch (e) {
    next(e);
  }
});

// ---------- Registrations ----------

eventsRouter.post('/:id/register', async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    res.json(await regs.registerForEvent(req.auth!, req.params.id, body));
  } catch (e) {
    next(e);
  }
});

eventsRouter.get('/:id/registration', async (req, res, next) => {
  try {
    res.json(await regs.getMyRegistration(req.auth!, req.params.id));
  } catch (e) {
    next(e);
  }
});

eventsRouter.delete('/:id/registration', async (req, res, next) => {
  try {
    await regs.cancelMyRegistration(req.auth!, req.params.id);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

eventsRouter.get('/:id/registrations', async (req, res, next) => {
  try {
    res.json(await regs.listRegistrations(req.auth!, req.params.id));
  } catch (e) {
    next(e);
  }
});

// ---------- Payments ----------

eventsRouter.get('/:id/payments', async (req, res, next) => {
  try {
    const q = paymentListSchema.parse(req.query);
    res.json(await pays.listPayments(req.auth!, req.params.id, q));
  } catch (e) {
    next(e);
  }
});

eventsRouter.get('/:id/payments/me', async (req, res, next) => {
  try {
    res.json(await pays.getMyPayment(req.auth!, req.params.id));
  } catch (e) {
    next(e);
  }
});

eventsRouter.post('/:id/payments', async (req, res, next) => {
  try {
    const body = paymentRecordSchema.parse(req.body);
    res.json(await pays.recordPayment(req.auth!, req.params.id, body));
  } catch (e) {
    next(e);
  }
});

// ---------- Expenses ----------

eventsRouter.get('/:id/expenses', async (req, res, next) => {
  try {
    res.json(await expenses.listExpenses(req.auth!, req.params.id));
  } catch (e) {
    next(e);
  }
});

eventsRouter.post('/:id/expenses', async (req, res, next) => {
  try {
    const body = expenseBaseSchema.parse(req.body);
    res.status(201).json(await expenses.createExpense(req.auth!, req.params.id, body));
  } catch (e) {
    next(e);
  }
});
