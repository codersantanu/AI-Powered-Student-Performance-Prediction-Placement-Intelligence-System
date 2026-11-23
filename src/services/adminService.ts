import type { AcademicRecord, AdminOverview, AdminQuestion, AdminStudent, Assessment, Prediction } from '../types';
export const adminService = {
  overview: () => import('./api').then(({ api }) => api.get<AdminOverview>('/admin/dashboard').then((r) => r.data)),
  students: (search = '') => import('./api').then(({ api }) => api.get<AdminStudent[]>('/admin/students', { params: { search } }).then((r) => r.data)),
  addStudent: (data: Record<string, unknown>) => import('./api').then(({ api }) => api.post<AdminStudent>('/admin/students', data).then((r) => r.data)),
  updateStudent: (id: number, data: Record<string, unknown>) => import('./api').then(({ api }) => api.put<AdminStudent>(`/admin/students/${id}`, data).then((r) => r.data)),
  records: () => import('./api').then(({ api }) => api.get<(AcademicRecord & { studentId: number; studentName: string })[]>('/admin/academic-records').then((r) => r.data)),
  addRecord: (data: Record<string, unknown>) => import('./api').then(({ api }) => api.post<AcademicRecord>('/admin/academic-records', data).then((r) => r.data)),
  updateRecord: (id: number, data: Record<string, unknown>) => import('./api').then(({ api }) => api.put<AcademicRecord>(`/admin/academic-records/${id}`, data).then((r) => r.data)),
  deleteRecord: (id: number) => import('./api').then(({ api }) => api.delete(`/admin/academic-records/${id}`)),
  assessments: () => import('./api').then(({ api }) => api.get<Assessment[]>('/admin/assessments').then((r) => r.data)),
  addAssessment: (data: Record<string, unknown>) => import('./api').then(({ api }) => api.post<Assessment>('/admin/assessments', data).then((r) => r.data)),
  questions: () => import('./api').then(({ api }) => api.get<AdminQuestion[]>('/admin/questions').then((r) => r.data)),
  addQuestion: (data: Record<string, unknown>) => import('./api').then(({ api }) => api.post<AdminQuestion>('/admin/questions', data).then((r) => r.data)),
  updateQuestion: (id: number, data: Record<string, unknown>) => import('./api').then(({ api }) => api.put<AdminQuestion>(`/admin/questions/${id}`, data).then((r) => r.data)),
  deleteQuestion: (id: number) => import('./api').then(({ api }) => api.delete(`/admin/questions/${id}`)),
  predictions: () => import('./api').then(({ api }) => api.get<(Prediction & { studentName: string })[]>('/admin/predictions').then((r) => r.data)),
};
