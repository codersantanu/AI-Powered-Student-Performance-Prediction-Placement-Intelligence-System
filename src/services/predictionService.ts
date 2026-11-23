import type { ModelInfo, Prediction } from '../types';
export const predictionService = {
  generate: (data: { target: string; inputs: Record<string, number> }) => import('./api').then(({ api }) => api.post<Prediction>('/predictions/generate', data).then((r) => r.data)),
  history: () => import('./api').then(({ api }) => api.get<Prediction[]>('/predictions/history').then((r) => r.data)),
  modelInfo: () => import('./api').then(({ api }) => api.get<ModelInfo>('/predictions/model-metrics').then((r) => r.data)),
};
