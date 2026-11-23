import type { Assessment, AssessmentAttempt, AssessmentResult } from '../types';
export const assessmentService = {
  list: () => import('./api').then(({ api }) => api.get<Assessment[]>('/assessments').then((r) => r.data)),
  start: (assessmentId: number) => import('./api').then(({ api }) => api.post<AssessmentAttempt>('/assessments/start', { assessmentId }).then((r) => r.data)),
  submit: (attemptId: number, answers: (number | null)[]) => import('./api').then(({ api }) => api.post<AssessmentResult>('/assessments/submit', { attemptId, answers }).then((r) => r.data)),
  results: () => import('./api').then(({ api }) => api.get<AssessmentResult[]>('/assessments/results').then((r) => r.data)),
  listSpecial: (kind: 'technical' | 'behavioural' | 'psychometric') => import('./api').then(({ api }) => api.get<Assessment[]>(`/special-assessments/${kind}`).then((r) => r.data)),
  startSpecial: (kind: 'technical' | 'behavioural' | 'psychometric', assessmentId: number) => import('./api').then(({ api }) => api.post<AssessmentAttempt>(`/special-assessments/${kind}/start`, { assessmentId }).then((r) => r.data)),
  submitSpecial: (kind: 'technical' | 'behavioural' | 'psychometric', attemptId: number, answers: (number | null)[]) => import('./api').then(({ api }) => api.post<AssessmentResult>(`/special-assessments/${kind}/submit`, { attemptId, answers }).then((r) => r.data)),
  specialResults: (kind: 'technical' | 'behavioural' | 'psychometric') => import('./api').then(({ api }) => api.get<AssessmentResult[]>(`/special-assessments/${kind}/results`).then((r) => r.data)),
  listImported: () => import('./api').then(({ api }) => api.get<import('../types').ImportedAssessment[]>('/admin/special-assessments').then((r) => r.data)),
  setImportedPublished: (kind: 'technical' | 'behavioural' | 'psychometric', id: number, published: boolean) => import('./api').then(({ api }) => api.put(`/admin/special-assessments/${kind}/${id}/publish`, { published }).then((r) => r.data)),
};
