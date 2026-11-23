import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, errorMessage, isBackendConfigured } from '../services/api';
import { previewStore } from '../data/preview';
import type { ReportCatalogItem } from '../types';
interface HistoryItem { id: number; key: string; title: string; semester: number | null; generatedAt: string; }
export default function useReportCollection() {
  const { isPreview, user } = useAuth(); const [data, setData] = useState<ReportCatalogItem[] | null>(null); const [history, setHistory] = useState<HistoryItem[] | null>(null); const [semesters, setSemesters] = useState<number[]>([]); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [version, setVersion] = useState(0);
  useEffect(() => { if (isPreview) { setData(previewStore.reportCatalog); setHistory([]); setSemesters([4, 5, 6]); setLoading(false); setError(''); return; } if (!isBackendConfigured || !user) { setData(null); return; } let active = true; setLoading(true); setError(''); Promise.all([api.get<ReportCatalogItem[]>('/student/reports'), api.get<HistoryItem[]>('/student/reports/history'), api.get<number[]>('/student/semesters')]).then(([catalog, reports, semesters]) => { if (active) { setData(catalog.data); setHistory(reports.data); setSemesters(semesters.data); } }).catch((err) => { if (active) setError(errorMessage(err)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [isPreview, isBackendConfigured, user?.id, version]);
  return { data, history, semesters, loading, error, reload: () => setVersion((v) => v + 1) };
}
