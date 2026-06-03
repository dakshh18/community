import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Role } from '@/api/types';

interface AuthState {
  token: string | null;
  user: { id: string; role: Role; email: string | null; phone: string | null } | null;
  setAuth: (token: string, user: AuthState['user']) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clear: () => set({ token: null, user: null }),
    }),
    { name: 'samaj-admin-auth' },
  ),
);
