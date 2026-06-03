import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

import { useAuthStore } from '@/auth/store';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

/** Guard a route to ADMIN only; committee users are bounced to the dashboard. */
export function AdminOnly({ children }: { children: ReactNode }) {
  const role = useAuthStore((s) => s.user?.role);
  if (role !== 'ADMIN') return <Navigate to="/" replace />;
  return <>{children}</>;
}
