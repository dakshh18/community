import { api } from './client';
import type { AdminStats, CommitteeStats } from './types';

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await api.get<AdminStats>('/admin/stats');
  return data;
}

export async function getCommitteeStats(): Promise<CommitteeStats> {
  const { data } = await api.get<CommitteeStats>('/committee/stats');
  return data;
}
