import type { Assessment, AssessmentAttempt, AssessmentResult } from '../types';
export const assessmentService = {
  list: () => import('./api').then(({ api }) => api.get<Assessment[]>('/assessments').then((r) => r.data)),
  start: (assessmentId: number) => import('./api').then(({ api }) => api.post<AssessmentAttempt>('/assessments/start', { assessmentId }).then((r) => r.data)),
  submit: (attemptId: number, answers: (number | null)[]) => import('./api').then(({ api }) => api.post<AssessmentResult>('/assessments/submit', { attemptId, answers }).then((r) => r.data)),
  results: () => import('./api').then(({ api }) => api.get<AssessmentResult[]>('/assessments/results').then((r) => r.data)),
};
