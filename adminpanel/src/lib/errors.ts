import { ApiError } from '@/api/client';

export function errMsg(e: unknown, fallback = 'Something went wrong'): string {
  if (e instanceof ApiError) return e.body.message ?? e.message ?? fallback;
  if (e instanceof Error) return e.message || fallback;
  return fallback;
}
