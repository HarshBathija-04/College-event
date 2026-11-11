import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, onSessionChange, session, type StoredAuth } from '@/lib/api';
import type { User, UserRole } from '@/types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: Parameters<typeof api.auth.register>[0]) => Promise<User>;
  logout: () => void;
  updateUser: (user: User) => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(() => session.read());

  // Keep in sync when the API client refreshes tokens or drops an expired session.
  useEffect(() => onSessionChange(setAuth), []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.auth.login(email, password);
    session.write(data);
    return data.user;
  }, []);

  const register = useCallback(async (body: Parameters<typeof api.auth.register>[0]) => {
    const { data } = await api.auth.register(body);
    session.write(data);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    api.auth.logout().catch(() => undefined);
    session.write(null);
  }, []);

  const updateUser = useCallback((user: User) => {
    const current = session.read();
    if (current) session.write({ ...current, user: { ...current.user, ...user } });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: auth?.user ?? null,
      isAuthenticated: !!auth,
      login,
      register,
      logout,
      updateUser,
      hasRole: (...roles) => !!auth && roles.includes(auth.user.role),
    }),
    [auth, login, register, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
