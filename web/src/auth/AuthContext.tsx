import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, clearToken, getToken, setToken, ApiError, type User, type Mode } from '../api/client';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, defaultMode?: Mode, person1Name?: string, person2Name?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      if (getToken()) {
        const { user } = await api.me();
        setUser(user);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) clearToken();
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (getToken()) {
          const { user } = await api.me();
          setUser(user);
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) clearToken();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Keep the Vercel serverless function warm so requests don't hit cold starts.
  // Pings /api/health every 8 minutes — lightweight, fire-and-forget.
  useEffect(() => {
    const ping = () => fetch('/api/health').catch(() => {});
    ping(); // warm up immediately on mount
    const id = setInterval(ping, 8 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await api.login(email, password);
    setToken(token);
    setUser(user);
  }, []);

  const signup = useCallback(async (email: string, password: string, defaultMode?: Mode, person1Name?: string, person2Name?: string) => {
    const { token, user } = await api.signup(email, password, defaultMode, person1Name, person2Name);
    setToken(token);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser, setUser }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
