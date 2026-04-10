import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Users as UsersIcon, Sailboat, GraduationCap,
  Calendar, Settings, ChevronRight, Waves, Sun, Moon, Wind, Thermometer,
  UserPlus, DollarSign, FileText, Armchair, UserCog, LogOut, Shield,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import type { TabKey } from '../types';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  tab?: TabKey;        // maps to allowedTabs key
  adminOnly?: boolean; // only visible to admin/manager
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

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user, logout, hasTab, isAdmin, isManager } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Filter sections based on user permissions
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
    user?.role === 'admin'
      ? 'Administrator'
      : user?.role === 'manager'
        ? 'Manager'
        : 'Staff';

  return (
    <aside className="w-64 flex flex-col gap-4 pr-4 shrink-0 overflow-y-auto custom-scrollbar">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 cursor-pointer" onClick={() => navigate('/')}>
        <div className="w-9 h-9 bg-brand rounded-xl flex items-center justify-center shadow-lg shadow-brand/20">
          <Waves size={18} className="text-white" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-lg font-bold tracking-tight">Becool Surf</span>
          <span className="text-xs text-text-secondary">Surf School Management System</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1">
        {visibleSections.map(section => (
          <div key={section.label} className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest px-4 pt-3 pb-1">{section.label}</span>
            {section.items.map(item => {
              const active = location.pathname === item.path;
              return (
                <div
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "flex items-center justify-between px-4 py-2.5 cursor-pointer transition-all duration-200 rounded-xl group",
                    active ? "bg-brand text-white shadow-lg shadow-brand/30" : "text-text-secondary hover:bg-surface-dim"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon size={17} className={cn(active ? "text-white" : "group-hover:text-brand")} />
                    <span className="font-medium text-[13px]">{item.label}</span>
                  </div>
                  {active && <ChevronRight size={14} />}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="mt-auto flex flex-col gap-4 pb-2">
        {/* Weather */}
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

        {/* User */}
        <div className="flex items-center gap-3 px-4">
          <div
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm',
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

        {/* Theme Toggle */}
        <div className="bg-surface rounded-xl p-1 flex gap-1 mx-2 border border-border-default">
          <button
            onClick={() => setTheme('light')}
            className={cn(
              "flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1",
              theme === 'light' ? "bg-brand text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
            )}
          >
            <Sun size={10} /> Light
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={cn(
              "flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1",
              theme === 'dark' ? "bg-brand text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
            )}
          >
            <Moon size={10} /> Dark
          </button>
        </div>
      </div>
    </aside>
  );
}
