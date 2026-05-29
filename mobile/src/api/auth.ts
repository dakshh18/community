/** Typed wrappers around the auth endpoints — keep the call sites short. */
import { api } from './client';
import type {
  AuthStartResponse,
  SendOtpResponse,
  VerifyOtpResponse,
} from './types';

export async function authStart(phone: string): Promise<AuthStartResponse> {
  const { data } = await api.post<AuthStartResponse>('/auth/start', { phone });
  return data;
}

export async function authSendOtp(phone: string, email?: string): Promise<SendOtpResponse> {
  const { data } = await api.post<SendOtpResponse>('/auth/send-otp', {
    phone,
    ...(email ? { email } : {}),
  });
  return data;
}

export async function authVerifyOtp(phone: string, code: string): Promise<VerifyOtpResponse> {
  const { data } = await api.post<VerifyOtpResponse>('/auth/verify-otp', { phone, code });
  return data;
}
