import React, { Suspense, lazy, useState, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import ErrorBoundary from './components/ErrorBoundary';
import PWAUpdatePrompt from './components/PWAUpdatePrompt';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import type { TabKey } from './types';

// Route-level code splitting: each page loads on demand.
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Lessons = lazy(() => import('./pages/Lessons'));
const GroupLessons = lazy(() => import('./pages/GroupLessons'));
const BoardRentals = lazy(() => import('./pages/BoardRentals'));
const SunbedRentals = lazy(() => import('./pages/SunbedRentals'));
const Instructors = lazy(() => import('./pages/Instructors'));
const Students = lazy(() => import('./pages/Students'));
const Agents = lazy(() => import('./pages/Agents'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Payments = lazy(() => import('./pages/Payments'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const UserManagement = lazy(() => import('./pages/UserManagement'));

function FullScreenLoader({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand/30 border-t-brand" />
        <span className="text-sm font-medium text-text-secondary">{label}</span>
      </div>
    </div>
  );
}

function ProtectedRoute({ tab, children }: { tab?: TabKey; children: React.ReactNode }) {
  const { user, hasTab } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (tab && !hasTab(tab)) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 opacity-20">🔒</div>
          <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
          <p className="text-text-secondary text-sm">
            You don't have permission to access this page.
            <br />
            Contact your administrator for access.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isManager } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin && !isManager) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 opacity-20">🛡️</div>
          <h2 className="text-xl font-bold mb-2">Admin Access Only</h2>
          <p className="text-text-secondary text-sm">
            This page is only accessible to administrators and managers.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/lessons': 'Lessons',
  '/group-lessons': 'Group Lessons',
  '/rentals': 'Board Rentals',
  '/sunbeds': 'Sunbed Rentals',
  '/instructors': 'Instructors',
  '/students': 'Students',
  '/agents': 'Agents',
  '/schedule': 'Schedule',
  '/payments': 'Payments',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/users': 'User Management',
};

function AppLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pageTitle = useMemo(
    () => ROUTE_TITLES[location.pathname] || 'Becool Surf',
    [location.pathname]
  );

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-alt">
        <FullScreenLoader />
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-surface-alt"><FullScreenLoader /></div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (location.pathname === '/login') {
    return <Navigate to="/" replace />;
  }

  return (
    <AppProvider>
      <div className="flex h-[100dvh] w-full overflow-hidden bg-surface-alt p-0 sm:p-2 lg:p-6">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex flex-1 min-w-0 flex-col overflow-hidden rounded-none sm:rounded-2xl lg:rounded-[40px] bg-surface shadow-xl shadow-black/5 dark:shadow-black/30">
          {/* Mobile topbar — shows CURRENT PAGE TITLE, respects iOS safe area */}
          <header
            className="lg:hidden sticky top-0 z-30 flex items-center gap-2 border-b border-border-default bg-surface/95 px-3 backdrop-blur"
            style={{
              paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
              paddingBottom: '0.5rem',
              paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 0.75rem)',
              paddingRight: 'calc(env(safe-area-inset-right, 0px) + 0.75rem)',
            }}
          >
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl p-2 -ml-1 text-text-primary hover:bg-surface-dim active:scale-95 transition shrink-0"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <h1 className="flex-1 min-w-0 text-[15px] font-bold tracking-tight truncate">
              {pageTitle}
            </h1>
            <div className="w-8 shrink-0" />
          </header>

          <div className="flex-1 min-h-0 overflow-auto">
            <Suspense fallback={<FullScreenLoader />}>
              <Routes>
                <Route path="/" element={<ProtectedRoute tab="dashboard"><Dashboard /></ProtectedRoute>} />
                <Route path="/lessons" element={<ProtectedRoute tab="lessons"><Lessons /></ProtectedRoute>} />
                <Route path="/group-lessons" element={<ProtectedRoute tab="group-lessons"><GroupLessons /></ProtectedRoute>} />
                <Route path="/rentals" element={<ProtectedRoute tab="rentals"><BoardRentals /></ProtectedRoute>} />
                <Route path="/sunbeds" element={<ProtectedRoute tab="sunbeds"><SunbedRentals /></ProtectedRoute>} />
                <Route path="/instructors" element={<ProtectedRoute tab="instructors"><Instructors /></ProtectedRoute>} />
                <Route path="/students" element={<ProtectedRoute tab="students"><Students /></ProtectedRoute>} />
                <Route path="/agents" element={<ProtectedRoute tab="agents"><Agents /></ProtectedRoute>} />
                <Route path="/schedule" element={<ProtectedRoute tab="schedule"><Schedule /></ProtectedRoute>} />
                <Route path="/payments" element={<ProtectedRoute tab="payments"><Payments /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute tab="reports"><Reports /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute tab="settings"><Settings /></ProtectedRoute>} />
                <Route path="/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </div>

          {/* Mobile bottom navigation */}
          <BottomNav onOpenMenu={() => setSidebarOpen(true)} />
        </main>
      </div>
    </AppProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppLayout />
            <PWAUpdatePrompt />
            <PWAInstallPrompt />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
