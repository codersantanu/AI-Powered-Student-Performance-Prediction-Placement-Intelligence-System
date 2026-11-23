import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, errorMessage, isBackendConfigured } from '../services/api';
import { previewStore } from '../data/preview';
import type { DashboardData } from '../types';

export function useResource<T>(path: string, previewData: T | null) {
  const { isPreview, user } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    if (isPreview) { setData(previewData); setLoading(false); setError(''); return; }
    if (!isBackendConfigured || !user) { setData(null); return; }
    let active = true; setLoading(true); setError('');
    api.get<T>(path).then((response) => { if (active) setData(response.data); }).catch((err) => { if (active) { setData(null); setError(errorMessage(err)); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path, isPreview, isBackendConfigured, user?.id, version]);
  return { data, loading, error, reload };
}
export function useWorkspace() { return useResource<DashboardData>('/student/dashboard', previewStore.dashboard()); }
export function usePageSize<T>(items: T[], initial = 8) { const [page, setPage] = useState(1); const size = initial; const totalPages = Math.max(1, Math.ceil(items.length / size)); const safePage = Math.min(page, totalPages); return { page: safePage, setPage, size, totalPages, items: items.slice((safePage - 1) * size, safePage * size) }; }
