import axios from 'axios';

export const isBackendConfigured = Boolean(import.meta.env.VITE_API_URL);
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', withCredentials: true, xsrfCookieName: 'csrf_access_token', xsrfHeaderName: 'X-CSRF-TOKEN', timeout: 20000 });
let accessToken = '';
let csrfToken = '';
export const setAccessToken = (token: string) => { accessToken = token; };
export const setCsrfToken = (token: string) => { csrfToken = token; };
export const clearAuthSession = () => { setAccessToken(''); setCsrfToken(''); api.defaults.headers.common.Authorization = ''; };
api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  if (csrfToken && !config.headers['X-CSRF-TOKEN']) config.headers['X-CSRF-TOKEN'] = csrfToken;
  return config;
});
api.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401 && !error.config?.url?.includes('/auth/')) window.dispatchEvent(new Event('studentiq:session-expired'));
  return Promise.reject(error);
});
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) return error.response?.data?.message || error.response?.data?.msg || (error.code === 'ECONNABORTED' ? 'The request timed out. Please try again.' : 'Unable to reach the server. Please try again shortly.');
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
export async function downloadBlob(url: string, filename: string, params?: Record<string, string | number>) {
  const response = await api.get(url, { params, responseType: 'blob' });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = objectUrl; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
