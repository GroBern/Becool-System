import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Users as UsersIcon, Sailboat, GraduationCap,
  Calendar, Settings, ChevronRight, Waves, Sun, Moon, Wind, Thermometer,
  UserPlus, DollarSign, FileText, Armchair, UserCog, LogOut, Shield, X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import type { TabKey } from '../types';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  tab?: TabKey;
  adminOnly?: boolean;
}

const sections: { label: string; items: NavItem[] }[] = [
  {
    label: 'Operations',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/', tab: 'dashboard' },
      { icon: BookOpen, label: 'Lessons', path: '/lessons', tab: 'lessons' },
      { icon: UsersIcon, label: 'Group Lessons', path: '/group-lessons', tab: 'group-lessons' },
      { icon: Sailboat, label: 'Board Rentals', path: '/rentals', tab: 'rentals' },
      { icon: Armchair, label: 'Sunbed Rentals', path: '/sunbeds', tab: 'sunbeds' },
      { icon: Calendar, label: 'Schedule', path: '/schedule', tab: 'schedule' },
    ],
  },
  {
    label: 'People',
    items: [
      { icon: UserCog, label: 'Instructors', path: '/instructors', tab: 'instructors' },
      { icon: GraduationCap, label: 'Students', path: '/students', tab: 'students' },
      { icon: UserPlus, label: 'Agents', path: '/agents', tab: 'agents' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { icon: DollarSign, label: 'Payments', path: '/payments', tab: 'payments' },
      { icon: FileText, label: 'Reports', path: '/reports', tab: 'reports' },
    ],
  },
  {
    label: 'System',
    items: [
      { icon: Settings, label: 'Settings', path: '/settings', tab: 'settings' },
      { icon: Shield, label: 'Users', path: '/users', adminOnly: true },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user, logout, hasTab, isAdmin, isManager } = useAuth();

  // Close the drawer on route change (mobile)
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Lock body scroll while drawer is open on mobile
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const go = (path: string) => {
    navigate(path);
    onClose();
  };

  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.adminOnly) return isAdmin || isManager;
        if (item.tab) return hasTab(item.tab);
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);

  const roleLabel =
    user?.role === 'admin' ? 'Administrator'
      : user?.role === 'manager' ? 'Manager'
        : 'Staff';

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        aria-hidden="true"
      />

      <aside
        className={cn(
          // Mobile: fixed drawer
          'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-surface-alt p-4 pr-2 shadow-2xl overflow-y-auto custom-scrollbar',
          'transform transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
          // Desktop: static
          'lg:static lg:inset-auto lg:translate-x-0 lg:w-64 lg:max-w-none lg:bg-transparent lg:shadow-none lg:p-0 lg:pr-4 lg:flex lg:flex-col lg:gap-4 lg:shrink-0',
          'flex flex-col gap-4'
        )}
        // iOS safe-area + notch: push content below the status bar on mobile.
        // Reset to defaults at lg+ where the drawer becomes a static sidebar.
        style={{
          paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
          paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
        }}
        aria-label="Sidebar"
      >
        {/* Header row */}
        <div className="flex items-center justify-between px-2 lg:px-4">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => go('/')}
          >
            <div className="w-9 h-9 bg-brand rounded-xl flex items-center justify-center shadow-lg shadow-brand/20">
              <Waves size={18} className="text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-bold tracking-tight">Becool Surf</span>
              <span className="text-[10px] text-text-secondary">Surf School Management</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden rounded-lg p-2 text-text-secondary hover:bg-surface-dim"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1">
          {visibleSections.map(section => (
            <div key={section.label} className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest px-4 pt-3 pb-1">
                {section.label}
              </span>
              {section.items.map(item => {
                const active = location.pathname === item.path;
                return (
                  <button
                    type="button"
                    key={item.path}
                    onClick={() => go(item.path)}
                    className={cn(
                      'flex items-center justify-between px-4 py-2.5 cursor-pointer transition-all duration-200 rounded-xl group text-left',
                      active
                        ? 'bg-brand text-white shadow-lg shadow-brand/30'
                        : 'text-text-secondary hover:bg-surface-dim'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon size={17} className={cn(active ? 'text-white' : 'group-hover:text-brand')} />
                      <span className="font-medium text-[13px]">{item.label}</span>
                    </div>
                    {active && <ChevronRight size={14} />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="mt-auto flex flex-col gap-4 pb-2">
          <div className="bg-surface rounded-2xl p-3 mx-2 flex flex-col gap-2 border border-border-default shadow-sm">
            <div className="flex items-center gap-1.5">
              <Sun size={14} className="text-amber-400" />
              <span className="text-[10px] font-bold">Beach Conditions</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <div className="flex flex-col items-center gap-0.5">
                <Thermometer size={12} className="text-text-secondary" />
                <span className="text-[10px] font-bold">28°C</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <Waves size={12} className="text-text-secondary" />
                <span className="text-[10px] font-bold">1.2m</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <Wind size={12} className="text-text-secondary" />
                <span className="text-[10px] font-bold">12km</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4">
            <div
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0',
                user?.role === 'admin'
                  ? 'bg-red-500'
                  : user?.role === 'manager'
                    ? 'bg-blue-500'
                    : 'bg-green-500'
              )}
            >
              {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-bold truncate">{user?.displayName || 'User'}</span>
              <span className="text-[9px] text-text-secondary">{roleLabel}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 text-text-secondary transition-all"
              title="Logout"
            >
              <LogOut size={15} />
            </button>
          </div>

          <div className="bg-surface rounded-xl p-1 flex gap-1 mx-2 border border-border-default">
            <button
              onClick={() => setTheme('light')}
              className={cn(
                'flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1',
                theme === 'light' ? 'bg-brand text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <Sun size={10} /> Light
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={cn(
                'flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1',
                theme === 'dark' ? 'bg-brand text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <Moon size={10} /> Dark
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
