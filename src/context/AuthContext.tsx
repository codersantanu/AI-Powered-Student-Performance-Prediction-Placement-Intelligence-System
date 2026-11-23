import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { User } from '../types';
import { api, clearAuthSession, errorMessage, isBackendConfigured, setAccessToken, setCsrfToken } from '../services/api';

interface AuthContextValue { user: User | null; loading: boolean; isPreview: boolean; login: (email: string, password: string) => Promise<User>; register: (name: string, email: string, password: string) => Promise<void>; logout: () => Promise<void>; updateUser: (user: User) => void; }
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isBackendConfigured);
  const navigate = useNavigate();
  const { search } = useLocation();
  const isPreview = !user && new URLSearchParams(search).get('preview') === '1';
  useEffect(() => {
    if (!isBackendConfigured) { setLoading(false); return; }
    let active = true;
    api[import.meta.env.VITE_AUTH_MODE === 'bearer' ? 'post' : 'get']('/auth/session').then((response) => {
      if (!active) return;
      setUser(response.data.user); setAccessToken(response.data.access_token || ''); setCsrfToken(response.data.csrf_token || '');
    }).catch(() => { if (active) { clearAuthSession(); setUser(null); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const expired = () => { clearAuthSession(); setUser(null); navigate('/login', { replace: true }); };
    window.addEventListener('studentiq:session-expired', expired);
    return () => window.removeEventListener('studentiq:session-expired', expired);
  }, [navigate]);
  const login = async (email: string, password: string) => {
    const response = await api.post<{ user: User; access_token?: string; csrf_token?: string }>('/auth/login', { email, password });
    setAccessToken(response.data.access_token || ''); setCsrfToken(response.data.csrf_token || '');
    setUser(response.data.user); return response.data.user;
  };
  const register = async (name: string, email: string, password: string) => { await api.post('/auth/register', { name, email, password }); };
  const logout = async () => {
    if (isBackendConfigured && user) { try { await api.post('/auth/logout'); } catch { /* Always clear the local session, including when the server is offline. */ } }
    clearAuthSession(); setUser(null); navigate('/login', { replace: true });
  };
  return <AuthContext.Provider value={{ user, loading, isPreview, login, register, logout, updateUser: setUser }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used within AuthProvider'); return context; }
export function requireBackend() { if (!isBackendConfigured) throw new Error(errorMessage(new Error('Connect VITE_API_URL to the Flask backend to use this feature.'))); }
