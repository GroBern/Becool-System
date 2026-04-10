import React, { useState } from 'react';
import { Waves, Eye, EyeOff, Sun, Moon, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

export default function Login() {
  const { login } = useAuth();
  const { theme, setTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-alt flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand/5 rounded-full blur-3xl" />
      </div>

      {/* Theme toggle */}
      <div className="absolute top-6 right-6 z-10">
        <div className="bg-surface rounded-xl p-1 flex gap-1 border border-border-default shadow-sm">
          <button
            onClick={() => setTheme('light')}
            className={cn(
              'py-1.5 px-3 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1',
              theme === 'light'
                ? 'bg-brand text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            <Sun size={10} /> Light
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={cn(
              'py-1.5 px-3 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1',
              theme === 'dark'
                ? 'bg-brand text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            <Moon size={10} /> Dark
          </button>
        </div>
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-surface rounded-[32px] shadow-2xl shadow-black/10 dark:shadow-black/40 border border-border-default p-10">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center shadow-xl shadow-brand/30">
              <Waves size={32} className="text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight">SurfDesk</h1>
              <p className="text-text-secondary text-sm mt-1">Surf School Management System</p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoFocus
                autoComplete="username"
                className="w-full px-4 py-3 rounded-xl bg-surface-dim border border-border-default text-sm font-medium placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-surface-dim border border-border-default text-sm font-medium placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2',
                loading
                  ? 'bg-brand/60 cursor-not-allowed'
                  : 'bg-brand hover:bg-brand/90 shadow-lg shadow-brand/30 hover:shadow-xl hover:shadow-brand/40 hover:scale-[1.02] active:scale-[0.98]'
              )}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Default credentials hint */}
          <div className="mt-6 pt-5 border-t border-border-default">
            <div className="bg-surface-dim rounded-xl p-4">
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">
                Default Admin Login
              </p>
              <div className="flex gap-4 text-xs">
                <div>
                  <span className="text-text-secondary">Username:</span>{' '}
                  <span className="font-bold text-text-primary">admin</span>
                </div>
                <div>
                  <span className="text-text-secondary">Password:</span>{' '}
                  <span className="font-bold text-text-primary">admin123</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-text-secondary mt-4 font-medium">
          SurfDesk Surf School Management System v2.0
        </p>
      </div>
    </div>
  );
}
