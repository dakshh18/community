/**
 * React Query hooks for the directory endpoints. Keep query keys flat and
 * predictable so they're easy to invalidate from other modules.
 */
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import {
  getDirectory,
  getMyHousehold,
  getNativePlaces,
  getPerson,
  getProfessions,
} from './directory';
import { listEvents, getMyPayment } from './events';
import { getAdminStats, getCommitteeStats } from './stats';
import type { DirectoryQuery } from './types';
import { useAuthStore } from '@/auth/store';

export const qk = {
  directory: (q: Omit<DirectoryQuery, 'page'>) => ['directory', q] as const,
  person: (id: string) => ['person', id] as const,
  myHousehold: () => ['households', 'me'] as const,
  professions: () => ['professions'] as const,
  nativePlaces: () => ['native-places'] as const,
  upcomingEvents: () => ['events', 'upcoming'] as const,
  myPayment: (eventId: string) => ['events', eventId, 'payment', 'me'] as const,
  adminStats: () => ['admin', 'stats'] as const,
  committeeStats: () => ['committee', 'stats'] as const,
};

const PAGE_SIZE = 20;

export function useDirectory(query: Omit<DirectoryQuery, 'page' | 'pageSize'>) {
  return useInfiniteQuery({
    queryKey: qk.directory(query),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getDirectory({ ...query, page: pageParam as number, pageSize: PAGE_SIZE }),
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });
}

export function usePerson(id: string | undefined) {
  return useQuery({
    queryKey: id ? qk.person(id) : ['person', 'none'],
    enabled: !!id,
    queryFn: () => getPerson(id as string),
  });
}

export function useMyHousehold() {
  return useQuery({
    queryKey: qk.myHousehold(),
    queryFn: getMyHousehold,
  });
}

export function useProfessions() {
  return useQuery({
    queryKey: qk.professions(),
    queryFn: getProfessions,
    staleTime: 5 * 60 * 1000, // 5 min — categories rarely change
  });
}

export function useNativePlaces() {
  return useQuery({
    queryKey: qk.nativePlaces(),
    queryFn: getNativePlaces,
    staleTime: 5 * 60 * 1000,
  });
}

// ---------- Events / payments ----------

export function useUpcomingEvent() {
  return useQuery({
    queryKey: qk.upcomingEvents(),
    queryFn: () => listEvents({ upcoming: true, pageSize: 1 }),
    select: (data) => data.items[0] ?? null,
    staleTime: 60 * 1000,
  });
}

export function useMyPayment(eventId: string | undefined) {
  return useQuery({
    queryKey: eventId ? qk.myPayment(eventId) : ['events', 'none', 'payment', 'me'],
    enabled: !!eventId,
    queryFn: () => getMyPayment(eventId as string),
  });
}

// ---------- Dashboards (role-gated server-side; we only call when the
// viewer has the matching role to avoid 403 noise) ----------

export function useAdminStats() {
  const role = useAuthStore((s) => s.viewer?.role);
  return useQuery({
    queryKey: qk.adminStats(),
    queryFn: getAdminStats,
    enabled: role === 'ADMIN',
    staleTime: 30 * 1000,
  });
}

export function useCommitteeStats() {
  const role = useAuthStore((s) => s.viewer?.role);
  return useQuery({
    queryKey: qk.committeeStats(),
    queryFn: getCommitteeStats,
    enabled: role === 'ADMIN' || role === 'COMMITTEE',
    staleTime: 30 * 1000,
  });
}
