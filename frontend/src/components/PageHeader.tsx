import React, { ReactNode } from 'react';
import { Bell, Search, MessageCircle } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  action?: ReactNode;
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-3 px-4 sm:px-6 lg:px-10 py-4 lg:py-8 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1 min-w-0">
        <h1 className="text-xl lg:text-2xl font-bold truncate">{title}</h1>
        <p className="text-xs text-text-secondary font-medium">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
        <div className="hidden sm:flex gap-2">
          <button className="w-10 h-10 rounded-full bg-surface-dim flex items-center justify-center text-icon-default hover:bg-border-default transition-colors">
            <Bell size={18} />
          </button>
          <button className="w-10 h-10 rounded-full bg-surface-dim flex items-center justify-center text-icon-default hover:bg-border-default transition-colors">
            <Search size={18} />
          </button>
          <button className="w-10 h-10 rounded-full bg-surface-dim flex items-center justify-center text-icon-default hover:bg-border-default transition-colors">
            <MessageCircle size={18} />
          </button>
        </div>
        {action}
      </div>
    </header>
  );
}
