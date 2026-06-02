/** Events + payment endpoint wrappers. */
import { api } from './client';
import type { EventListResult, MyPaymentView } from './types';

export async function listEvents(params: {
  upcoming?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<EventListResult> {
  const { data } = await api.get<EventListResult>('/events', { params });
  return data;
}

export async function getMyPayment(eventId: string): Promise<MyPaymentView | null> {
  const { data } = await api.get<MyPaymentView | null>(`/events/${eventId}/payments/me`);
  return data;
}
