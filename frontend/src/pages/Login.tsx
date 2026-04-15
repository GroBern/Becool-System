import React, { useEffect, useState } from 'react';
import {
  Waves, Eye, EyeOff, Sun, Moon, LogIn, Lock, User as UserIcon,
  ShieldCheck, Sparkles, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

export default function Login() {
  const { login } = useAuth();
  const { theme, setTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  // Restore remembered username
  useEffect(() => {
    const saved = localStorage.getItem('becool.lastUser');
    if (saved) setUsername(saved);
  }, []);

  // Trigger shake animation when an error appears
  useEffect(() => {
    if (!error) return;
    setShake(true);
    const t = setTimeout(() => setShake(false), 450);
    return () => clearTimeout(t);
  }, [error]);

  const handleKeyEvent = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(e.getModifierState && e.getModifierState('CapsLock'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
      if (remember) {
        localStorage.setItem('becool.lastUser', username.trim());
      } else {
        localStorage.removeItem('becool.lastUser');
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillAdmin = () => {
    setUsername('admin');
    setPassword('admin123');
    setError('');
  };

  const year = new Date().getFullYear();

  return (
    <div className="min-h-[100dvh] bg-surface-alt flex items-stretch relative overflow-hidden">
      {/* ───────── Animated background ───────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[28rem] h-[28rem] bg-brand/20 rounded-full blur-3xl animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-[28rem] h-[28rem] bg-sky-500/15 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] bg-brand/5 rounded-full blur-3xl animate-blob animation-delay-4000" />

        {/* subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* ───────── Theme toggle (floating) ───────── */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <div className="bg-surface/90 backdrop-blur rounded-xl p-1 flex gap-1 border border-border-default shadow-sm">
          <button
            onClick={() => setTheme('light')}
            aria-label="Light theme"
            className={cn(
              'py-1.5 px-3 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1',
              theme === 'light'
                ? 'bg-brand text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            <Sun size={11} /> Light
          </button>
          <button
            onClick={() => setTheme('dark')}
            aria-label="Dark theme"
            className={cn(
              'py-1.5 px-3 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1',
              theme === 'dark'
                ? 'bg-brand text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            <Moon size={11} /> Dark
          </button>
        </div>
      </div>

      {/* ───────── Left brand panel (desktop only) ───────── */}
      <aside className="hidden lg:flex relative z-10 flex-1 flex-col justify-between p-12 xl:p-16 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand via-brand/90 to-sky-700" />
        <div className="absolute inset-0 opacity-30">
          <svg viewBox="0 0 800 800" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="wave" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity="0.4" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0,500 C200,420 400,580 600,460 C700,400 800,500 800,500 L800,800 L0,800 Z"
              fill="url(#wave)"
            />
            <path
              d="M0,600 C200,520 400,680 600,560 C700,500 800,600 800,600 L800,800 L0,800 Z"
              fill="url(#wave)"
              opacity="0.6"
            />
          </svg>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 bg-white/15 backdrop-blur rounded-2xl flex items-center justify-center border border-white/20">
            <Waves size={24} className="text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-xl font-bold tracking-tight">Becool Surf</div>
            <div className="text-xs text-white/70">Surf School Management</div>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
            Ride the wave of effortless management.
          </h2>
          <p className="mt-4 text-white/80 text-base leading-relaxed">
            Lessons, rentals, schedules, payments, and reports — all in one place.
            Built for surf schools that want to spend less time on admin and more time
            on the water.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-4 max-w-sm">
            <Stat label="Lessons" />
            <Stat label="Rentals" />
            <Stat label="Reports" />
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xs text-white/70">
          <ShieldCheck size={14} />
          <span>Secure session • End-to-end token auth</span>
        </div>
      </aside>

      {/* ───────── Right form panel ───────── */}
      <main className="relative z-10 flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-md">
          {/* Mobile-only logo */}
          <div className="lg:hidden flex flex-col items-center gap-3 mb-6">
            <div className="w-14 h-14 bg-brand rounded-2xl flex items-center justify-center shadow-xl shadow-brand/30">
              <Waves size={26} className="text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold tracking-tight">Becool Surf</h1>
              <p className="text-text-secondary text-xs mt-0.5">Surf School Management</p>
            </div>
          </div>

          {/* Card */}
          <div
            className={cn(
              'relative bg-surface/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/10 dark:shadow-black/40 border border-border-default p-6 sm:p-8 lg:p-10',
              shake && 'animate-shake'
            )}
          >
            {/* gradient border accent */}
            <div className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-br from-brand/30 via-transparent to-sky-500/20 opacity-50 blur-sm -z-10" />

            <div className="mb-6 lg:mb-8">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-brand mb-2">
                <Sparkles size={12} />
                Welcome back
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Sign in to your account</h2>
              <p className="text-sm text-text-secondary mt-1">
                Enter your credentials to access the dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              {/* Username */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="username" className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  Username
                </label>
                <div className="relative">
                  <UserIcon
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
                  />
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    autoFocus
                    autoComplete="username"
                    spellCheck={false}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface-dim border border-border-default text-sm font-medium placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
                  />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyEvent}
                    onKeyUp={handleKeyEvent}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full pl-11 pr-12 py-3 rounded-xl bg-surface-dim border border-border-default text-sm font-medium placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {capsLock && (
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-0.5">
                    <AlertCircle size={12} />
                    Caps Lock is on
                  </div>
                )}
              </div>

              {/* Remember + forgot */}
              <div className="flex items-center justify-between -mt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="w-4 h-4 rounded-md border border-border-default bg-surface-dim flex items-center justify-center peer-checked:bg-brand peer-checked:border-brand transition-colors">
                    <svg
                      viewBox="0 0 12 12"
                      className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M2 6.5L5 9.5L10 3.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-xs font-medium text-text-secondary group-hover:text-text-primary transition-colors">
                    Remember me
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setError('Please contact your administrator to reset your password.')}
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium px-3 py-2.5 rounded-xl"
                >
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 mt-1',
                  loading
                    ? 'bg-brand/60 cursor-not-allowed'
                    : 'bg-brand hover:bg-brand/90 shadow-lg shadow-brand/30 hover:shadow-xl hover:shadow-brand/40 hover:scale-[1.01] active:scale-[0.99]'
                )}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn size={16} />
                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* Default credentials */}
            <div className="mt-6 pt-5 border-t border-border-default">
              <div className="bg-surface-dim/70 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    Default Admin
                  </p>
                  <p className="text-xs mt-1 text-text-secondary">
                    <span className="font-bold text-text-primary">admin</span>
                    <span className="mx-1.5 opacity-40">/</span>
                    <span className="font-bold text-text-primary">admin123</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fillAdmin}
                  className="text-[11px] font-bold uppercase tracking-wider text-brand hover:text-brand/80 px-3 py-1.5 rounded-lg bg-brand/10 hover:bg-brand/15 transition-colors"
                >
                  Quick fill
                </button>
              </div>
            </div>
          </div>

          <p className="text-center text-[10px] text-text-secondary mt-5 font-medium">
            © {year} Becool Surf School • v2.0
          </p>
        </div>
      </main>
    </div>
  );
}

function Stat({ label }: { label: string }) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-xl border border-white/15 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-white/70 font-bold">{label}</div>
      <div className="text-sm font-bold mt-0.5">Managed</div>
    </div>
  );
}
