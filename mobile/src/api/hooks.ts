/**
 * React Query hooks for the directory endpoints. Keep query keys flat and
 * predictable so they're easy to invalidate from other modules.
 */
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { getDirectory, getMyHousehold, getPerson, getProfessions } from './directory';
import type { DirectoryQuery } from './types';

export const qk = {
  directory: (q: Omit<DirectoryQuery, 'page'>) => ['directory', q] as const,
  person: (id: string) => ['person', id] as const,
  myHousehold: () => ['households', 'me'] as const,
  professions: () => ['professions'] as const,
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
