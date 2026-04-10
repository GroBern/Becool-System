import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Lessons from './pages/Lessons';
import GroupLessons from './pages/GroupLessons';
import BoardRentals from './pages/BoardRentals';
import SunbedRentals from './pages/SunbedRentals';
import Instructors from './pages/Instructors';
import Students from './pages/Students';
import Agents from './pages/Agents';
import Schedule from './pages/Schedule';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import UserManagement from './pages/UserManagement';
import type { TabKey } from './types';

// Protected route wrapper — checks auth + tab permission
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

// Admin/Manager only route
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

// Auth-aware layout
function AppLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="flex h-screen w-full bg-surface-alt items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand/30 border-t-brand rounded-full animate-spin" />
          <span className="text-sm font-medium text-text-secondary">Loading...</span>
        </div>
      </div>
    );
  }

  // Login page (no sidebar)
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Redirect /login to / if already authenticated
  if (location.pathname === '/login') {
    return <Navigate to="/" replace />;
  }

  // Main app layout with sidebar
  return (
    <AppProvider>
      <div className="flex h-screen w-full bg-surface-alt p-6 overflow-hidden">
        <Sidebar />
        <main className="flex-1 bg-surface rounded-[40px] shadow-2xl shadow-black/5 dark:shadow-black/30 flex flex-col overflow-hidden">
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
        </main>
      </div>
    </AppProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
