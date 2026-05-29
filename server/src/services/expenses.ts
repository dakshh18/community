/**
 * Expenses service. Spec §8 module 6 + §10.
 * Admin/committee CRUD. Categorized per ExpenseCategory enum.
 */

import type { ExpenseCategory, Prisma } from '@prisma/client';

import { prisma } from '../db/prisma';
import { HttpError } from '../middleware/errorHandler';
import { audit } from '../utils/audit';
import type { ViewerCtx } from './privacy';

const OBJECT_ID = /^[a-f0-9]{24}$/i;

const VALID_CATEGORIES: ExpenseCategory[] = [
  'FOOD',
  'VENUE',
  'DECORATION',
  'SOUND',
  'GIFTS',
  'PRINTING',
  'MISC',
];

function isPrivileged(viewer: ViewerCtx): boolean {
  return viewer.role === 'ADMIN' || viewer.role === 'COMMITTEE';
}

export interface ExpenseInput {
  category: ExpenseCategory;
  amount: number;
  paidTo?: string | null;
  paidBy?: string | null;
  date?: string | null;
  notes?: string | null;
}

export async function listExpenses(viewer: ViewerCtx, eventId: string) {
  if (!isPrivileged(viewer)) {
    throw new HttpError(403, 'forbidden', 'Admin or committee role required');
  }
  if (!OBJECT_ID.test(eventId)) throw new HttpError(400, 'invalid_id', 'Invalid event id');

  const rows = await prisma.expense.findMany({
    where: { eventId },
    orderBy: { date: 'desc' },
  });

  return rows.map((x) => ({ ...x, date: x.date.toISOString() }));
}

export async function createExpense(viewer: ViewerCtx, eventId: string, input: ExpenseInput) {
  if (!isPrivileged(viewer)) {
    throw new HttpError(403, 'forbidden', 'Admin or committee role required');
  }
  if (!OBJECT_ID.test(eventId)) throw new HttpError(400, 'invalid_id', 'Invalid event id');
  if (!VALID_CATEGORIES.includes(input.category)) {
    throw new HttpError(400, 'invalid_value', `Invalid category: ${input.category}`);
  }
  if (input.amount == null || input.amount <= 0) {
    throw new HttpError(400, 'invalid_value', 'amount must be > 0');
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new HttpError(404, 'not_found', 'Event not found');

  const created = await prisma.expense.create({
    data: {
      eventId,
      category: input.category,
      amount: Math.trunc(input.amount),
      paidTo: input.paidTo?.trim() || null,
      paidBy: input.paidBy?.trim() || null,
      date: input.date ? new Date(input.date) : new Date(),
      notes: input.notes?.trim() || null,
    },
  });

  await audit({
    actorId: viewer.sub,
    action: 'expense.create',
    entity: 'Expense',
    entityId: created.id,
    meta: { eventId, category: input.category, amount: input.amount },
  });

  return { ...created, date: created.date.toISOString() };
}

export async function updateExpense(
  viewer: ViewerCtx,
  expenseId: string,
  input: Partial<ExpenseInput>,
) {
  if (!isPrivileged(viewer)) {
    throw new HttpError(403, 'forbidden', 'Admin or committee role required');
  }
  if (!OBJECT_ID.test(expenseId)) throw new HttpError(400, 'invalid_id', 'Invalid expense id');

  const existing = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!existing) throw new HttpError(404, 'not_found', 'Expense not found');

  if (input.category && !VALID_CATEGORIES.includes(input.category)) {
    throw new HttpError(400, 'invalid_value', `Invalid category: ${input.category}`);
  }
  if (input.amount !== undefined && input.amount <= 0) {
    throw new HttpError(400, 'invalid_value', 'amount must be > 0');
  }

  const data: Prisma.ExpenseUpdateInput = {};
  if (input.category !== undefined) data.category = input.category;
  if (input.amount !== undefined) data.amount = Math.trunc(input.amount);
  if (input.paidTo !== undefined) data.paidTo = input.paidTo?.trim() || null;
  if (input.paidBy !== undefined) data.paidBy = input.paidBy?.trim() || null;
  if (input.date !== undefined) data.date = input.date ? new Date(input.date) : existing.date;
  if (input.notes !== undefined) data.notes = input.notes?.trim() || null;

  const updated = await prisma.expense.update({ where: { id: expenseId }, data });

  await audit({
    actorId: viewer.sub,
    action: 'expense.update',
    entity: 'Expense',
    entityId: expenseId,
    meta: input as unknown,
  });

  return { ...updated, date: updated.date.toISOString() };
}

export async function deleteExpense(viewer: ViewerCtx, expenseId: string) {
  if (!isPrivileged(viewer)) {
    throw new HttpError(403, 'forbidden', 'Admin or committee role required');
  }
  if (!OBJECT_ID.test(expenseId)) throw new HttpError(400, 'invalid_id', 'Invalid expense id');

  const existing = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!existing) throw new HttpError(404, 'not_found', 'Expense not found');

  await prisma.expense.delete({ where: { id: expenseId } });

  await audit({
    actorId: viewer.sub,
    action: 'expense.delete',
    entity: 'Expense',
    entityId: expenseId,
    meta: { eventId: existing.eventId, category: existing.category, amount: existing.amount },
  });
}
