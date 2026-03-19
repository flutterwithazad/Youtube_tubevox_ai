import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

interface AdminUser {
  adminId: string;
  email: string;
  fullName: string;
  roleName: string;
  permissions: Record<string, boolean>;
}

interface AuthCtx {
  admin: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({ admin: null, loading: true, login: async () => {}, logout: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/auth/me')
      .then(d => setAdmin(d.admin))
      .catch(() => setAdmin(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const d = await api.post('/admin/auth/login', { email, password });
    setAdmin(d.admin);
  };

  const logout = async () => {
    await api.post('/admin/auth/logout');
    setAdmin(null);
  };

  return <AuthContext.Provider value={{ admin, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
