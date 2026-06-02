/** Events + registration + performance + payment endpoint wrappers. */
import { api } from './client';
import type {
  EventDetail,
  EventListResult,
  MyPaymentView,
  MyRegistration,
  Performance,
  PerformanceInput,
  RegisterForEventInput,
} from './types';

export async function listEvents(params: {
  upcoming?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<EventListResult> {
  const { data } = await api.get<EventListResult>('/events', { params });
  return data;
}

export async function getEvent(id: string): Promise<EventDetail> {
  const { data } = await api.get<EventDetail>(`/events/${id}`);
  return data;
}

export async function registerForEvent(
  eventId: string,
  input: RegisterForEventInput,
): Promise<MyRegistration> {
  const { data } = await api.post<MyRegistration>(`/events/${eventId}/register`, input);
  return data;
}

export async function cancelRegistration(eventId: string): Promise<void> {
  await api.delete(`/events/${eventId}/registration`);
}

export async function addPerformance(
  registrationId: string,
  input: PerformanceInput,
): Promise<Performance> {
  const { data } = await api.post<Performance>(
    `/registrations/${registrationId}/performances`,
    input,
  );
  return data;
}

export async function removePerformance(performanceId: string): Promise<void> {
  await api.delete(`/performances/${performanceId}`);
}

export async function getMyPayment(eventId: string): Promise<MyPaymentView | null> {
  const { data } = await api.get<MyPaymentView | null>(`/events/${eventId}/payments/me`);
  return data;
}
