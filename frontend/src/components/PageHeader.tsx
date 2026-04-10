import React, { ReactNode } from 'react';
import { Bell, Search, MessageCircle } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  action?: ReactNode;
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="flex items-center justify-between px-10 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-xs text-text-secondary font-medium">{subtitle}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
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
