import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Calendar, DollarSign, Menu,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import type { TabKey } from '../types';

interface BottomNavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  tab?: TabKey;
  action?: 'menu';
}

const navItems: BottomNavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', tab: 'dashboard' },
  { icon: BookOpen, label: 'Lessons', path: '/lessons', tab: 'lessons' },
  { icon: Calendar, label: 'Schedule', path: '/schedule', tab: 'schedule' },
  { icon: DollarSign, label: 'Payments', path: '/payments', tab: 'payments' },
  { icon: Menu, label: 'More', path: '', action: 'menu' },
];

interface BottomNavProps {
  onOpenMenu: () => void;
}

export default function BottomNav({ onOpenMenu }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasTab } = useAuth();

  const visibleItems = navItems.filter(
    (item) => item.action === 'menu' || !item.tab || hasTab(item.tab)
  );

  const handleTap = (item: BottomNavItem) => {
    if (item.action === 'menu') {
      onOpenMenu();
    } else {
      navigate(item.path);
    }
  };

  // Check if current path is one of the bottom nav paths
  const isActive = (item: BottomNavItem) => {
    if (item.action === 'menu') {
      // Highlight "More" if current route isn't in any of the other bottom nav items
      const bottomPaths = navItems.filter((n) => !n.action).map((n) => n.path);
      return !bottomPaths.includes(location.pathname);
    }
    return location.pathname === item.path;
  };

  return (
    <nav className="lg:hidden border-t border-border-default bg-surface/95 backdrop-blur-lg safe-area-bottom">
      <div className="flex items-center justify-around px-1 pt-1.5 pb-1.5">
        {visibleItems.map((item) => {
          const active = isActive(item);
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => handleTap(item)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1 rounded-xl transition-all duration-200 active:scale-90',
                active
                  ? 'text-brand'
                  : 'text-text-secondary'
              )}
            >
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200',
                  active && 'bg-brand/10'
                )}
              >
                <item.icon size={20} strokeWidth={active ? 2.5 : 2} />
              </div>
              <span className={cn(
                'text-[10px] leading-tight font-medium truncate',
                active && 'font-bold'
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
