import { Router } from 'express';

import { requireAuth } from '../middleware/auth';
import * as reports from '../services/reports';

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

function sendCsv(res: import('express').Response, filename: string, body: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(body);
}

function stamp(): string {
  // Deterministic date stamp suffix for filenames.
  return new Date().toISOString().slice(0, 10);
}

reportsRouter.get('/members.csv', async (req, res, next) => {
  try {
    const body = await reports.reportMembersCsv(req.auth!);
    sendCsv(res, `members-${stamp()}.csv`, body);
  } catch (e) {
    next(e);
  }
});

reportsRouter.get('/events/:id/registrations.csv', async (req, res, next) => {
  try {
    const body = await reports.reportRegistrationsCsv(req.auth!, req.params.id);
    sendCsv(res, `registrations-${req.params.id}-${stamp()}.csv`, body);
  } catch (e) {
    next(e);
  }
});

reportsRouter.get('/events/:id/payments.csv', async (req, res, next) => {
  try {
    const body = await reports.reportPaymentsCsv(req.auth!, req.params.id);
    sendCsv(res, `payments-${req.params.id}-${stamp()}.csv`, body);
  } catch (e) {
    next(e);
  }
});

reportsRouter.get('/events/:id/expenses.csv', async (req, res, next) => {
  try {
    const body = await reports.reportExpensesCsv(req.auth!, req.params.id);
    sendCsv(res, `expenses-${req.params.id}-${stamp()}.csv`, body);
  } catch (e) {
    next(e);
  }
});

reportsRouter.get('/payments/pending.csv', async (req, res, next) => {
  try {
    const body = await reports.reportPendingPaymentsCsv(req.auth!);
    sendCsv(res, `pending-payments-${stamp()}.csv`, body);
  } catch (e) {
    next(e);
  }
});
