/**
 * Single axios instance. Attaches the admin JWT on every request and normalizes
 * error bodies into a typed ApiError. On 401 it clears the session so routing
 * bounces back to the login page.
 */
import axios, { AxiosError, type AxiosInstance } from 'axios';

import { useAuthStore } from '@/auth/store';
import type { ApiErrorBody } from './types';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:4000';

export class ApiError extends Error {
  status: number;
  code: string;
  body: ApiErrorBody;
  constructor(status: number, body: ApiErrorBody) {
    super(body.message ?? `Request failed (${status})`);
    this.status = status;
    this.code = body.error ?? 'unknown';
    this.body = body;
  }
}

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError<ApiErrorBody>) => {
    if (err.response) {
      const body = (err.response.data ?? {
        error: 'unknown_error',
        message: err.message,
      }) as ApiErrorBody;
      if (err.response.status === 401) useAuthStore.getState().clear();
      throw new ApiError(err.response.status, body);
    }
    throw new ApiError(0, { error: 'network_error', message: err.message ?? 'Network error' });
  },
);
