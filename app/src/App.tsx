import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { WakingBanner } from '@/components/app/WakingBanner';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/hooks/useTheme';
import AuthLayout from '@/layouts/AuthLayout';
import MainLayout from '@/layouts/MainLayout';
import HomePage from '@/pages/HomePage';
import type { UserRole } from '@/types';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const EventsPage = lazy(() => import('@/pages/EventsPage'));
const EventDetailPage = lazy(() => import('@/pages/EventDetailPage'));
const CreateEventPage = lazy(() => import('@/pages/CreateEventPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const MyRegistrationsPage = lazy(() => import('@/pages/MyRegistrationsPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const AdminDashboardPage = lazy(() => import('@/pages/AdminDashboardPage'));
const PendingApprovalsPage = lazy(() => import('@/pages/PendingApprovalsPage'));
const UserManagementPage = lazy(() => import('@/pages/UserManagementPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function Protected({ children, roles }: { children: ReactNode; roles?: UserRole[] }) {
  const { isAuthenticated, hasRole } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !hasRole(...roles)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function PageFallback() {
  return (
    <div className="page py-16" aria-busy="true" aria-label="Loading page">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-accent" />
      <div className="mt-4 h-4 w-72 animate-pulse rounded bg-accent" />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route element={<MainLayout />}>
                <Route index element={<HomePage />} />
                <Route path="events" element={<EventsPage />} />
                <Route
                  path="events/create"
                  element={
                    <Protected roles={['ORGANIZER', 'FACULTY', 'ADMIN']}>
                      <CreateEventPage />
                    </Protected>
                  }
                />
                <Route path="events/:id" element={<EventDetailPage />} />
                <Route
                  path="dashboard"
                  element={
                    <Protected>
                      <DashboardPage />
                    </Protected>
                  }
                />
                <Route
                  path="my-registrations"
                  element={
                    <Protected>
                      <MyRegistrationsPage />
                    </Protected>
                  }
                />
                <Route
                  path="notifications"
                  element={
                    <Protected>
                      <NotificationsPage />
                    </Protected>
                  }
                />
                <Route
                  path="profile"
                  element={
                    <Protected>
                      <ProfilePage />
                    </Protected>
                  }
                />
                <Route
                  path="admin"
                  element={
                    <Protected roles={['ADMIN']}>
                      <AdminDashboardPage />
                    </Protected>
                  }
                />
                <Route
                  path="admin/pending-approvals"
                  element={
                    <Protected roles={['FACULTY', 'ADMIN']}>
                      <PendingApprovalsPage />
                    </Protected>
                  }
                />
                <Route
                  path="admin/users"
                  element={
                    <Protected roles={['ADMIN']}>
                      <UserManagementPage />
                    </Protected>
                  }
                />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
              <Route element={<AuthLayout />}>
                <Route
                  path="login"
                  element={
                    <GuestOnly>
                      <LoginPage />
                    </GuestOnly>
                  }
                />
                <Route
                  path="register"
                  element={
                    <GuestOnly>
                      <RegisterPage />
                    </GuestOnly>
                  }
                />
              </Route>
            </Routes>
          </Suspense>
          <WakingBanner />
          <Toaster position="top-center" />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
