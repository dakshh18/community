// Shared API types — mirror the backend DTOs (server/src/services/*).

export type Role = 'ADMIN' | 'COMMITTEE' | 'MEMBER';
export type Relation =
  | 'SELF' | 'SPOUSE' | 'SON' | 'DAUGHTER' | 'DAUGHTER_IN_LAW'
  | 'MOTHER' | 'FATHER' | 'GRANDSON' | 'GRANDDAUGHTER' | 'OTHER';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID';
export type PaymentMode = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';
export type ExpenseCategory =
  | 'FOOD' | 'VENUE' | 'DECORATION' | 'SOUND' | 'GIFTS' | 'PRINTING' | 'MISC';

export interface ApiErrorBody {
  error?: string;
  message?: string;
  [k: string]: unknown;
}

export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AuthResult {
  token: string;
  user: { id: string; role: Role; phone: string | null; email: string | null };
  personId: string;
  householdId: string;
}

export interface AdminPerson {
  id: string;
  householdId: string;
  fullName: string;
  relation: Relation;
  gender: Gender | null;
  dob: string | null;
  phone: string | null;
  phoneE164: string | null;
  email: string | null;
  professionRaw: string | null;
  professionCatId: string | null;
  professionName: string | null;
  bloodGroup: string | null;
  notes: string | null;
  showPhone: boolean;
  showAddress: boolean;
  isHead: boolean;
  hasAccount: boolean;
  household?: { id: string; nativePlace: string; city: string };
  createdAt: string;
  updatedAt: string;
}

export interface AdminHousehold {
  id: string;
  nativePlace: string;
  nativeAddress: string | null;
  vadodaraAddress: string | null;
  city: string;
  householdPhone: string | null;
  headPersonId: string | null;
  headName: string | null;
  personsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminHouseholdDetail extends AdminHousehold {
  members: AdminPerson[];
}

export interface AdminUser {
  id: string;
  phone: string | null;
  email: string | null;
  role: Role;
  isActive: boolean;
  hasPassword: boolean;
  personName: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface ProfessionCategory {
  id: string;
  name: string;
  nameGu: string | null;
  icon: string | null;
  personsCount: number;
}

export interface ProfessionsResult {
  categories: ProfessionCategory[];
  uncategorizedCount: number;
  totalPersons: number;
}

export interface NativePlaceRow {
  nativePlace: string;
  personsCount: number;
  householdsCount: number;
}

export interface AdminStats {
  totals: { households: number; persons: number; users: number; activeUsers: number };
  queues: { pendingCorrections: number; pendingHelpRequests: number };
  byProfession: { id: string; name: string; nameGu: string | null; personsCount: number }[];
  upcomingEvents: {
    id: string;
    name: string;
    dateTime: string;
    venue: string | null;
    registrationsCount: number;
    contributionPerFamily: number;
  }[];
  payments: {
    eventsTotal: number;
    registrationsTotal: number;
    expected: number;
    collected: number;
    outstanding: number;
    statusBuckets: { PENDING: number; PARTIAL: number; PAID: number };
  };
  recentHelpRequests: {
    id: string;
    category: string;
    urgency: string;
    status: ReviewStatus;
    description: string;
    requestedByName: string;
    createdAt: string;
  }[];
}

export interface Correction {
  id: string;
  personId: string;
  personName?: string | null;
  requestedByUserId: string;
  requestedByName?: string | null;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EventRow {
  id: string;
  name: string;
  dateTime: string;
  venue: string | null;
  description: string | null;
  contributionPerFamily: number;
  registrationOpen: boolean;
  registrationsCount?: number;
}

export interface EventInput {
  name: string;
  dateTime: string;
  venue?: string | null;
  description?: string | null;
  contributionPerFamily?: number;
  registrationOpen?: boolean;
}

export interface EventDashboard {
  registrationsCount: number;
  totalAttendees: number;
  expected: number;
  collected: number;
  outstanding?: number;
  totalExpense: number;
  balance?: number;
  statusBuckets: { PENDING: number; PARTIAL: number; PAID: number };
  performanceCount?: number;
  byCategory?: Record<string, number>;
  [k: string]: unknown;
}

export interface EventPayment {
  id: string;
  householdId: string;
  householdName: string;
  nativePlace: string;
  amountDue: number;
  amountPaid: number;
  status: PaymentStatus;
  mode: PaymentMode | null;
  reference: string | null;
  paidAt: string | null;
}

export interface EventExpense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  paidTo: string | null;
  paidBy: string | null;
  date: string;
  notes: string | null;
}

export interface EventRegistrationRow {
  id: string;
  householdId: string;
  householdName?: string | null;
  nativePlace?: string | null;
  attendeesCount: number;
  performancesCount?: number;
}
