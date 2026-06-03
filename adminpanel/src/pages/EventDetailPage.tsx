import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createExpense,
  deleteEvent,
  getEvent,
  getEventDashboard,
  listEventExpenses,
  listEventPayments,
  recordPayment,
} from '@/api/endpoints';
import type { EventExpense, EventPayment, ExpenseCategory, PaymentMode } from '@/api/types';
import { useAuthStore } from '@/auth/store';
import { Page } from '@/components/Layout';
import { Badge, Field, Input, Loading, PageError, Select } from '@/components/ui';
import { Modal, ConfirmModal } from '@/components/Modal';
import { EventFormModal } from '@/components/EventFormModal';
import { useToast } from '@/components/Toast';
import { downloadCsv } from '@/lib/download';
import { fmtDate, fmtDateTime, rupees } from '@/lib/format';
import { errMsg } from '@/lib/errors';

const PAYMENT_STATUS_TONE: Record<string, string> = { PAID: 'green', PARTIAL: 'amber', PENDING: '' };
const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'FOOD', 'VENUE', 'DECORATION', 'SOUND', 'GIFTS', 'PRINTING', 'MISC',
];

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card stat">
      <div className="label">{label}</div>
      <div className="value" style={{ fontSize: 24 }}>{value}</div>
    </div>
  );
}

export default function EventDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [paying, setPaying] = useState<EventPayment | null>(null);
  const [addingExpense, setAddingExpense] = useState(false);

  const event = useQuery({ queryKey: ['event', id], queryFn: () => getEvent(id) });
  const dash = useQuery({ queryKey: ['event-dash', id], queryFn: () => getEventDashboard(id) });
  const payments = useQuery({ queryKey: ['event-payments', id], queryFn: () => listEventPayments(id) });
  const expenses = useQuery({ queryKey: ['event-expenses', id], queryFn: () => listEventExpenses(id) });

  const del = useMutation({
    mutationFn: () => deleteEvent(id),
    onSuccess: () => {
      toast.push('Event deleted', 'success');
      qc.invalidateQueries({ queryKey: ['events'] });
      navigate('/events');
    },
    onError: (e) => {
      toast.push(errMsg(e), 'error');
      setDeleting(false);
    },
  });

  return (
    <Page
      title={event.data?.name ?? 'Event'}
      actions={
        <div className="row-actions">
          <Link to="/events" className="btn">← All events</Link>
          {isAdmin && event.data && (
            <>
              <button className="btn" onClick={() => setEditing(true)}>Edit</button>
              <button className="btn danger" onClick={() => setDeleting(true)}>Delete</button>
            </>
          )}
        </div>
      }
    >
      {event.isLoading && <Loading />}
      {event.error && <PageError message={errMsg(event.error)} />}
      {event.data && (
        <>
          <div className="card pad" style={{ marginBottom: 16 }}>
            <dl className="kv">
              <dt>When</dt>
              <dd>{fmtDateTime(event.data.dateTime)}</dd>
              <dt>Venue</dt>
              <dd>{event.data.venue ?? '—'}</dd>
              <dt>Contribution</dt>
              <dd>{rupees(event.data.contributionPerFamily)} / family</dd>
              <dt>Registration</dt>
              <dd>{event.data.registrationOpen ? <Badge tone="green">Open</Badge> : <Badge>Closed</Badge>}</dd>
              {event.data.description && (
                <>
                  <dt>Description</dt>
                  <dd>{event.data.description}</dd>
                </>
              )}
            </dl>
          </div>

          {dash.data && (
            <div className="grid cols-4" style={{ marginBottom: 16 }}>
              <Stat label="Registrations" value={dash.data.registrationsCount} />
              <Stat label="Attendees" value={dash.data.totalAttendees} />
              <Stat label="Collected" value={rupees(dash.data.collected)} />
              <Stat
                label="Balance"
                value={rupees((dash.data.collected ?? 0) - (dash.data.totalExpense ?? 0))}
              />
            </div>
          )}

          {/* Payments */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head">
              <h3>Payments</h3>
              <button className="btn sm" onClick={() => downloadCsv(`/reports/events/${id}/payments.csv`, `payments-${id}.csv`)}>
                ⬇ CSV
              </button>
            </div>
            {payments.isLoading ? (
              <Loading />
            ) : payments.error ? (
              <PageError message={errMsg(payments.error)} />
            ) : (
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Household</th>
                      <th>Native place</th>
                      <th style={{ textAlign: 'right' }}>Due</th>
                      <th style={{ textAlign: 'right' }}>Paid</th>
                      <th>Status</th>
                      <th>Mode</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(payments.data ?? []).map((p) => (
                      <tr key={p.id}>
                        <td className="gu">{p.householdName}</td>
                        <td className="gu muted">{p.nativePlace}</td>
                        <td style={{ textAlign: 'right' }}>{rupees(p.amountDue)}</td>
                        <td style={{ textAlign: 'right' }}>{rupees(p.amountPaid)}</td>
                        <td><Badge tone={PAYMENT_STATUS_TONE[p.status]}>{p.status}</Badge></td>
                        <td className="muted">{p.mode ?? '—'}</td>
                        <td>
                          <div className="row-actions">
                            <button className="btn sm" onClick={() => setPaying(p)}>Record</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(payments.data ?? []).length === 0 && (
                      <tr><td colSpan={7} className="muted">No payment rows yet — households get one when they register.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Expenses */}
          <div className="card">
            <div className="card-head">
              <h3>Expenses{expenses.data ? ` · ${rupees(expenses.data.reduce((s, x) => s + x.amount, 0))}` : ''}</h3>
              <div className="row-actions">
                <button className="btn sm" onClick={() => downloadCsv(`/reports/events/${id}/expenses.csv`, `expenses-${id}.csv`)}>⬇ CSV</button>
                <button className="btn sm primary" onClick={() => setAddingExpense(true)}>+ Add expense</button>
              </div>
            </div>
            {expenses.isLoading ? (
              <Loading />
            ) : (
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th>Paid to</th>
                      <th>Paid by</th>
                      <th>Date</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(expenses.data ?? []).map((x: EventExpense) => (
                      <tr key={x.id}>
                        <td><Badge>{x.category}</Badge></td>
                        <td style={{ textAlign: 'right' }}>{rupees(x.amount)}</td>
                        <td className="muted">{x.paidTo ?? '—'}</td>
                        <td className="muted">{x.paidBy ?? '—'}</td>
                        <td className="muted">{fmtDate(x.date)}</td>
                        <td className="muted">{x.notes ?? '—'}</td>
                      </tr>
                    ))}
                    {(expenses.data ?? []).length === 0 && (
                      <tr><td colSpan={6} className="muted">No expenses recorded.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {editing && <EventFormModal event={event.data} onClose={() => setEditing(false)} />}
          {deleting && (
            <ConfirmModal
              title="Delete event"
              danger
              confirmLabel="Delete"
              busy={del.isPending}
              onClose={() => setDeleting(false)}
              onConfirm={() => del.mutate()}
              body={<>Delete <strong>{event.data.name}</strong> and all its registrations, payments and expenses? This cannot be undone.</>}
            />
          )}
          {paying && <RecordPaymentModal eventId={id} payment={paying} onClose={() => setPaying(null)} />}
          {addingExpense && <AddExpenseModal eventId={id} onClose={() => setAddingExpense(false)} />}
        </>
      )}
    </Page>
  );
}

function RecordPaymentModal({
  eventId,
  payment,
  onClose,
}: {
  eventId: string;
  payment: EventPayment;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [amount, setAmount] = useState(String(payment.amountPaid || payment.amountDue || ''));
  const [mode, setMode] = useState<PaymentMode>(payment.mode ?? 'CASH');
  const [reference, setReference] = useState(payment.reference ?? '');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      recordPayment(eventId, {
        householdId: payment.householdId,
        amountPaid: Number(amount) || 0,
        mode,
        reference: reference.trim() || null,
      }),
    onSuccess: () => {
      toast.push('Payment recorded', 'success');
      qc.invalidateQueries({ queryKey: ['event-payments', eventId] });
      qc.invalidateQueries({ queryKey: ['event-dash', eventId] });
      onClose();
    },
    onError: (e) => setError(errMsg(e)),
  });

  return (
    <Modal
      title={`Record payment — ${payment.householdName}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={mutation.isPending}>Cancel</button>
          <button className="btn primary" onClick={() => { setError(''); mutation.mutate(); }} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      {error && <div className="page-error">{error}</div>}
      <Field label={`Amount paid (due ${rupees(payment.amountDue)})`}>
        <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
      </Field>
      <div className="row2">
        <Field label="Mode">
          <Select
            value={mode}
            onChange={(e) => setMode(e.target.value as PaymentMode)}
            options={[
              { value: 'CASH', label: 'Cash' },
              { value: 'UPI', label: 'UPI' },
              { value: 'BANK_TRANSFER', label: 'Bank transfer' },
              { value: 'OTHER', label: 'Other' },
            ]}
          />
        </Field>
        <Field label="Reference">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR / receipt no." />
        </Field>
      </div>
    </Modal>
  );
}

function AddExpenseModal({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [category, setCategory] = useState<ExpenseCategory>('FOOD');
  const [amount, setAmount] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      createExpense(eventId, {
        category,
        amount: Number(amount) || 0,
        paidTo: paidTo.trim() || null,
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      toast.push('Expense added', 'success');
      qc.invalidateQueries({ queryKey: ['event-expenses', eventId] });
      qc.invalidateQueries({ queryKey: ['event-dash', eventId] });
      onClose();
    },
    onError: (e) => setError(errMsg(e)),
  });

  return (
    <Modal
      title="Add expense"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={mutation.isPending}>Cancel</button>
          <button
            className="btn primary"
            onClick={() => {
              setError('');
              if (!(Number(amount) > 0)) return setError('Amount must be greater than 0');
              mutation.mutate();
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Saving…' : 'Add'}
          </button>
        </>
      }
    >
      {error && <div className="page-error">{error}</div>}
      <div className="row2">
        <Field label="Category">
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
        </Field>
        <Field label="Amount (₹)">
          <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </Field>
      </div>
      <Field label="Paid to">
        <Input value={paidTo} onChange={(e) => setPaidTo(e.target.value)} placeholder="Vendor / person" />
      </Field>
      <Field label="Notes">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Modal>
  );
}
