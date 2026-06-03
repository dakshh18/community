import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/auth/store';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: '▦' },
  { to: '/members', label: 'Members', icon: '👤', adminOnly: true },
  { to: '/households', label: 'Households', icon: '🏠', adminOnly: true },
  { to: '/corrections', label: 'Corrections', icon: '✎' },
  { to: '/events', label: 'Events', icon: '📅' },
  { to: '/reports', label: 'Reports', icon: '⬇' },
  { to: '/users', label: 'Users & Roles', icon: '🛡', adminOnly: true },
];

export function Layout() {
  const { user, clear } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';

  function logout() {
    clear();
    navigate('/login', { replace: true });
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="dot" /> Samaj Connect
        </div>
        <nav>
          {NAV.filter((n) => !n.adminOnly || isAdmin).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}>
              <span className="ic">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="foot">
          <div className="who">{user?.email ?? 'Admin'}</div>
          <div className="role">{user?.role}</div>
          <button className="btn sm block" style={{ marginTop: 10 }} onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <div className="main">
        <Outlet />
      </div>
    </div>
  );
}

/** Standard page chrome: a sticky title bar + padded content area. */
export function Page({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="topbar">
        <h1>{title}</h1>
        {actions}
      </div>
      <div className="content">{children}</div>
    </>
  );
}
