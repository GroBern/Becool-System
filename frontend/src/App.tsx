import React, { Suspense, lazy, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Menu, Waves } from 'lucide-react';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import PWAUpdatePrompt from './components/PWAUpdatePrompt';
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

function AppLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      <div className="flex h-[100dvh] w-full overflow-hidden bg-surface-alt p-2 sm:p-4 lg:p-6">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex flex-1 min-w-0 flex-col overflow-hidden rounded-2xl lg:rounded-[40px] bg-surface shadow-xl shadow-black/5 dark:shadow-black/30">
          {/* Mobile topbar */}
          <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border-default bg-surface/95 px-4 py-3 backdrop-blur">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl p-2 text-text-primary hover:bg-surface-dim active:scale-95 transition"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center shadow shadow-brand/20">
                <Waves size={14} className="text-white" />
              </div>
              <span className="text-sm font-bold tracking-tight">Becool Surf</span>
            </div>
            <div className="w-9" />
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
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
