/**
 * Typed thin wrappers over every backend endpoint the panel uses.
 * Grouped by domain; all return parsed JSON.
 */
import { api } from './client';
import type {
  AdminHousehold,
  AdminHouseholdDetail,
  AdminPerson,
  AdminStats,
  AdminUser,
  AuthResult,
  Correction,
  EventDashboard,
  EventExpense,
  EventInput,
  EventPayment,
  EventRegistrationRow,
  EventRow,
  NativePlaceRow,
  Paged,
  ProfessionsResult,
  ReviewStatus,
  Role,
} from './types';

// ---------- Auth ----------
export async function adminLogin(email: string, password: string): Promise<AuthResult> {
  const { data } = await api.post('/auth/admin/login', { email, password });
  return data;
}

// ---------- Dashboard ----------
export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await api.get('/admin/stats');
  return data;
}

// ---------- Persons ----------
export interface PersonListParams {
  q?: string;
  householdId?: string;
  professionCatId?: string;
  nativePlace?: string;
  page?: number;
  pageSize?: number;
}
export async function listPersons(params: PersonListParams): Promise<Paged<AdminPerson>> {
  const { data } = await api.get('/admin/persons', { params });
  return data;
}
export async function getPerson(id: string): Promise<AdminPerson> {
  const { data } = await api.get(`/admin/persons/${id}`);
  return data;
}
export async function createPerson(body: Record<string, unknown>): Promise<AdminPerson> {
  const { data } = await api.post('/admin/persons', body);
  return data;
}
export async function updatePerson(id: string, body: Record<string, unknown>): Promise<AdminPerson> {
  const { data } = await api.patch(`/admin/persons/${id}`, body);
  return data;
}
export async function deletePerson(id: string): Promise<void> {
  await api.delete(`/admin/persons/${id}`);
}

// ---------- Households ----------
export interface HouseholdListParams {
  q?: string;
  nativePlace?: string;
  page?: number;
  pageSize?: number;
}
export async function listHouseholds(params: HouseholdListParams): Promise<Paged<AdminHousehold>> {
  const { data } = await api.get('/admin/households', { params });
  return data;
}
export async function getHousehold(id: string): Promise<AdminHouseholdDetail> {
  const { data } = await api.get(`/admin/households/${id}`);
  return data;
}
export async function createHousehold(body: Record<string, unknown>): Promise<AdminHousehold> {
  const { data } = await api.post('/admin/households', body);
  return data;
}
export async function updateHousehold(
  id: string,
  body: Record<string, unknown>,
): Promise<AdminHousehold> {
  const { data } = await api.patch(`/admin/households/${id}`, body);
  return data;
}
export async function deleteHousehold(id: string): Promise<void> {
  await api.delete(`/admin/households/${id}`);
}

// ---------- Users ----------
export async function listUsers(params: {
  q?: string;
  role?: Role;
  page?: number;
  pageSize?: number;
}): Promise<Paged<AdminUser>> {
  const { data } = await api.get('/admin/users', { params });
  return data;
}
export async function updateUser(
  id: string,
  body: { role?: Role; isActive?: boolean },
): Promise<AdminUser> {
  const { data } = await api.patch(`/admin/users/${id}`, body);
  return data;
}

// ---------- Reference data ----------
export async function listProfessions(): Promise<ProfessionsResult> {
  const { data } = await api.get('/professions');
  return data;
}
export async function listNativePlaces(): Promise<NativePlaceRow[]> {
  const { data } = await api.get('/native-places');
  return data;
}

// ---------- Corrections ----------
export async function listCorrections(params: {
  status?: ReviewStatus;
  page?: number;
  pageSize?: number;
}): Promise<Paged<Correction>> {
  const { data } = await api.get('/corrections', { params });
  return data;
}
export async function reviewCorrection(
  id: string,
  action: 'APPROVE' | 'REJECT',
): Promise<Correction> {
  const { data } = await api.patch(`/corrections/${id}`, { action });
  return data;
}

// ---------- Events ----------
export async function listEvents(params: {
  upcoming?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<Paged<EventRow>> {
  const { data } = await api.get('/events', { params });
  return data;
}
export async function getEvent(id: string): Promise<EventRow> {
  const { data } = await api.get(`/events/${id}`);
  return data;
}
export async function getEventDashboard(id: string): Promise<EventDashboard> {
  const { data } = await api.get(`/events/${id}/dashboard`);
  return data;
}
export async function createEvent(body: EventInput): Promise<EventRow> {
  const { data } = await api.post('/events', body);
  return data;
}
export async function updateEvent(id: string, body: Partial<EventInput>): Promise<EventRow> {
  const { data } = await api.patch(`/events/${id}`, body);
  return data;
}
export async function deleteEvent(id: string): Promise<void> {
  await api.delete(`/events/${id}`);
}
export async function listRegistrations(id: string): Promise<EventRegistrationRow[]> {
  const { data } = await api.get(`/events/${id}/registrations`);
  return data;
}
export async function listEventPayments(
  id: string,
  status?: 'PENDING' | 'PARTIAL' | 'PAID',
): Promise<EventPayment[]> {
  const { data } = await api.get(`/events/${id}/payments`, { params: { status } });
  return data;
}
export async function recordPayment(
  id: string,
  body: Record<string, unknown>,
): Promise<EventPayment> {
  const { data } = await api.post(`/events/${id}/payments`, body);
  return data;
}
export async function listEventExpenses(id: string): Promise<EventExpense[]> {
  const { data } = await api.get(`/events/${id}/expenses`);
  return data;
}
export async function createExpense(
  id: string,
  body: Record<string, unknown>,
): Promise<EventExpense> {
  const { data } = await api.post(`/events/${id}/expenses`, body);
  return data;
}
