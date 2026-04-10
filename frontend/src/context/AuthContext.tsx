import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { User, TabKey } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasTab: (tab: TabKey) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  isWorker: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'surfdesk-token';
const USER_KEY = 'surfdesk-user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  // Validate token when it changes (initial load + login/logout)
  useEffect(() => {
    async function validate() {
      setLoading(true);
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const freshUser = await api.auth.me();
        setUser(freshUser);
        localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
      } catch {
        // Token invalid - clear auth
        setUser(null);
        setToken(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      } finally {
        setLoading(false);
      }
    }
    validate();
  }, [token]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await api.auth.login(username, password);
    setToken(response.token);
    setUser(response.user);
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  const hasTab = useCallback(
    (tab: TabKey) => {
      if (!user) return false;
      if (user.role === 'admin' || user.role === 'manager') return true;
      return user.allowedTabs.includes(tab);
    },
    [user]
  );

  const refreshUser = useCallback(async () => {
    try {
      const freshUser = await api.auth.me();
      setUser(freshUser);
      localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
    } catch {
      // ignore
    }
  }, []);

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    logout,
    hasTab,
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager',
    isWorker: user?.role === 'worker',
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
