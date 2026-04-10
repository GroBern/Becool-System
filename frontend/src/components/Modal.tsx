import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}

export default function Modal({ open, onClose, title, children, width = 'max-w-lg' }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-surface rounded-3xl shadow-2xl dark:shadow-black/40 ${width} w-full mx-4 max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-default">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-dim flex items-center justify-center text-icon-default hover:bg-border-default transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 custom-scrollbar flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

export function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-4 py-2.5 rounded-xl border border-border-default bg-surface text-text-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all placeholder:text-text-secondary/50"
    />
  );
}

export function FormSelect({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full px-4 py-2.5 rounded-xl border border-border-default bg-surface text-text-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
    >
      {children}
    </select>
  );
}

export function FormTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full px-4 py-2.5 rounded-xl border border-border-default bg-surface text-text-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all resize-none placeholder:text-text-secondary/50"
      rows={3}
    />
  );
}

export function FormButton({ children, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  const styles = {
    primary: 'bg-brand text-white shadow-lg shadow-brand/30 hover:scale-105',
    secondary: 'bg-surface-dim text-text-primary hover:bg-border-default',
    danger: 'bg-red-500 text-white shadow-lg shadow-red-500/30 hover:scale-105',
  };

  return (
    <button
      {...props}
      className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${styles[variant]} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}
