import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiPublicRequest, apiRequest, hasStoredToken, setAccessToken } from '@erp/shared-frontend-data-access';

export interface AuthUser { id: string; tenantId: string; companyId: string; email: string; name: string; role: string; permissions: string[] }
interface AuthContextValue { user: AuthUser | null; isLoading: boolean; login(email: string, password: string): Promise<void>; logout(): void; can(permission: string): boolean }
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(hasStoredToken());
  const logout = useCallback(() => { setAccessToken(null); setUser(null); }, []);
  useEffect(() => {
    const unauthorized = () => logout();
    window.addEventListener('erp:unauthorized', unauthorized);
    if (hasStoredToken()) apiRequest<AuthUser>('/auth/me').then(setUser).catch(logout).finally(() => setIsLoading(false));
    return () => window.removeEventListener('erp:unauthorized', unauthorized);
  }, [logout]);
  const login = useCallback(async (email: string, password: string) => {
    const result = await apiPublicRequest<{ accessToken: string; user: AuthUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setAccessToken(result.accessToken); setUser(result.user);
  }, []);
  const value = useMemo<AuthContextValue>(() => ({ user, isLoading, login, logout, can: (permission) => Boolean(user?.permissions.includes(permission)) }), [user, isLoading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
