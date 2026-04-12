import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '@/lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  dob?: string;
  age?: number;
  gender?: string;
  location?: string;
  role: 'athlete' | 'admin' | 'headadmin';
  profile_photo?: string;
}

interface AuthContextType {
  user: User | null;
  authed: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (form: { name: string; email: string; password: string; dob?: string; gender?: string; location?: string }) => Promise<void>;
  logout: () => void;
}

const AuthCtx = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  // On mount: validate stored token
  useEffect(() => {
    const token = localStorage.getItem('sai_token');
    if (token) {
      authApi.me()
        .then((data) => {
          setUser(data.user);
          setAuthed(true);
        })
        .catch(() => {
          localStorage.removeItem('sai_token');
          localStorage.removeItem('sai_user');
        })
        .finally(() => setLoading(false));
    } else {
      // Try loading from localStorage for backward compat
      try {
        const saved = localStorage.getItem('sai_user');
        if (saved) {
          const u = JSON.parse(saved);
          setUser(u);
          setAuthed(true);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setUser(data.user);
    setAuthed(true);
  }, []);

  const register = useCallback(async (form: { name: string; email: string; password: string; dob?: string; gender?: string; location?: string }) => {
    const data = await authApi.register(form);
    setUser(data.user);
    setAuthed(true);
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
    setAuthed(false);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, authed, loading, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
