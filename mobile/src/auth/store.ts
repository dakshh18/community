/**
 * Auth state for the entire app. JWT + viewer summary live here; the rehydrate
 * step on app boot reads the token out of SecureStore (see RootNavigator).
 *
 * Server state (directory listings, etc.) lives in React Query — not here.
 */
import { create } from 'zustand';

import type { Role } from '@/api/types';
import { clearToken, loadToken, saveToken } from './storage';

export interface Viewer {
  userId: string;
  role: Role;
  phone: string;
  email: string | null;
  personId: string;
  householdId: string;
}

interface AuthState {
  token: string | null;
  viewer: Viewer | null;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  signIn: (token: string, viewer: Viewer) => Promise<void>;
  clear: () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  viewer: null,
  hydrated: false,

  async hydrate() {
    const token = await loadToken();
    set({ token, hydrated: true });
  },

  async signIn(token, viewer) {
    await saveToken(token);
    set({ token, viewer });
  },

  clear() {
    set({ token: null, viewer: null });
  },

  async signOut() {
    await clearToken();
    set({ token: null, viewer: null });
  },
}));
