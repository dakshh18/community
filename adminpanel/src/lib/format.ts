import type { Relation, ReviewStatus, Role } from '@/api/types';

export const RELATION_LABELS: Record<Relation, string> = {
  SELF: 'Self (head)',
  SPOUSE: 'Spouse',
  SON: 'Son',
  DAUGHTER: 'Daughter',
  DAUGHTER_IN_LAW: 'Daughter-in-law',
  MOTHER: 'Mother',
  FATHER: 'Father',
  GRANDSON: 'Grandson',
  GRANDDAUGHTER: 'Granddaughter',
  OTHER: 'Other',
};

export const RELATION_OPTIONS = Object.entries(RELATION_LABELS).map(([value, label]) => ({
  value: value as Relation,
  label,
}));

export const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

export const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'COMMITTEE', label: 'Committee' },
  { value: 'MEMBER', label: 'Member' },
];

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** ISO string → value for <input type="datetime-local"> (local time). */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

export function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function rupees(n: number | null | undefined): string {
  if (n == null) return '₹0';
  return `₹${n.toLocaleString('en-IN')}`;
}

export const STATUS_BADGE: Record<ReviewStatus, string> = {
  PENDING: 'amber',
  APPROVED: 'green',
  REJECTED: 'red',
};

export function roleBadgeClass(role: Role): string {
  return role === 'ADMIN' ? 'purple' : role === 'COMMITTEE' ? 'blue' : '';
}
