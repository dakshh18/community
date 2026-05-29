/** Mirror of the backend's response shapes (auth + minimal directory). */

export type Role = 'ADMIN' | 'COMMITTEE' | 'MEMBER';

export interface AuthStartResponse {
  found: boolean;
  needsEmail: boolean;
  maskedEmail: string | null;
}

export interface NotRegisteredResponse {
  error: 'not_registered';
  message: string;
  adminContactPhone: string | null;
}

export interface SendOtpResponse {
  sent: true;
  maskedEmail: string;
  expiresInMinutes: number;
  mock: boolean;
}

export interface VerifyOtpResponse {
  token: string;
  user: {
    id: string;
    role: Role;
    phone: string;
    email: string | null;
  };
  personId: string;
  householdId: string;
}

export interface ApiErrorBody {
  error: string;
  message: string;
  issues?: { path: (string | number)[]; message: string }[];
  adminContactPhone?: string | null;
}
