/**
 * Single axios instance for the entire app. Attaches the JWT from the auth
 * store on every request and normalizes error bodies so calls can `try/catch`
 * with a typed shape.
 */
import axios, { AxiosError, AxiosInstance } from 'axios';

import { API_BASE_URL } from './config';
import type { ApiErrorBody } from './types';
import { useAuthStore } from '@/auth/store';

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
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
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
      if (err.response.status === 401 && body.error !== 'not_registered') {
        // Token rejected — clear it so the next render bounces to Login.
        useAuthStore.getState().clear();
      }
      throw new ApiError(err.response.status, body);
    }
    throw new ApiError(0, {
      error: 'network_error',
      message: err.message ?? 'Network error',
    });
  },
);
