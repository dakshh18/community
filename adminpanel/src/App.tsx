import { Routes, Route, Navigate } from 'react-router-dom';

import { Layout } from './components/Layout';
import { ProtectedRoute, AdminOnly } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MembersPage from './pages/MembersPage';
import HouseholdsPage from './pages/HouseholdsPage';
import HouseholdDetailPage from './pages/HouseholdDetailPage';
import CorrectionsPage from './pages/CorrectionsPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route
          path="/members"
          element={
            <AdminOnly>
              <MembersPage />
            </AdminOnly>
          }
        />
        <Route
          path="/households"
          element={
            <AdminOnly>
              <HouseholdsPage />
            </AdminOnly>
          }
        />
        <Route
          path="/households/:id"
          element={
            <AdminOnly>
              <HouseholdDetailPage />
            </AdminOnly>
          }
        />
        <Route path="/corrections" element={<CorrectionsPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route
          path="/users"
          element={
            <AdminOnly>
              <UsersPage />
            </AdminOnly>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
