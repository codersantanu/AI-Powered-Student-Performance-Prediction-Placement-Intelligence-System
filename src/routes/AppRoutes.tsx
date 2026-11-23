import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isBackendConfigured } from '../services/api';
import { Landing, AuthPage, NotFound } from '../pages/Landing';
import Navbar from '../components/Navbar';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { LoadingState } from '../components/dashboard/Page';
import Dashboard from '../pages/student/Dashboard';
import Profile from '../pages/student/Profile';
import AcademicPerformance from '../pages/student/AcademicPerformance';
import StudyBehaviour from '../pages/student/StudyBehaviour';
import Assessments from '../pages/student/Assessments';
import SkillsExperience from '../pages/student/SkillsExperience';
import PerformancePrediction from '../pages/student/PerformancePrediction';
import ImprovementRecommendations from '../pages/student/ImprovementRecommendations';
import MyReports from '../pages/student/MyReports';
import AdminDashboard from '../pages/admin/AdminDashboard';
import StudentManagement from '../pages/admin/StudentManagement';
import AcademicRecords from '../pages/admin/AcademicRecords';
import AssessmentManagement from '../pages/admin/AssessmentManagement';
import ReportsAnalytics from '../pages/admin/ReportsAnalytics';

function Protected({ role, children }: { role: 'student' | 'admin'; children: ReactNode }) {
  const { user, loading, isPreview } = useAuth(); const location = useLocation();
  if (loading) return <div className="workspace-loading"><LoadingState label="Restoring your secure session…" /></div>;
  if (!user) {
    if (isPreview && !isBackendConfigured) return <DashboardLayout>{children}</DashboardLayout>;
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} replace />;
  return <DashboardLayout>{children}</DashboardLayout>;
}
export default function AppRoutes() {
  return <Routes>
    <Route path="/" element={<><Navbar /><Landing /></>} />
    <Route path="/login" element={<AuthPage key="login" mode="login" />} />
    <Route path="/register" element={<AuthPage key="register" mode="register" />} />
    <Route path="/student/dashboard" element={<Protected role="student"><Dashboard /></Protected>} />
    <Route path="/student/profile" element={<Protected role="student"><Profile /></Protected>} />
    <Route path="/student/academic-performance" element={<Protected role="student"><AcademicPerformance /></Protected>} />
    <Route path="/student/study-behaviour" element={<Protected role="student"><StudyBehaviour /></Protected>} />
    <Route path="/student/technical-assessment" element={<Protected role="student"><Assessments key="technical" kind="technical" /></Protected>} />
    <Route path="/student/behavioural-assessment" element={<Protected role="student"><Assessments key="behavioural" kind="behavioural" /></Protected>} />
    <Route path="/student/psychometric-assessment" element={<Protected role="student"><Assessments key="psychometric" kind="psychometric" /></Protected>} />
    <Route path="/student/skills-experience" element={<Protected role="student"><SkillsExperience /></Protected>} />
    <Route path="/student/performance-prediction" element={<Protected role="student"><PerformancePrediction /></Protected>} />
    <Route path="/student/improvement-recommendations" element={<Protected role="student"><ImprovementRecommendations /></Protected>} />
    <Route path="/student/reports" element={<Protected role="student"><MyReports /></Protected>} />
    <Route path="/admin/dashboard" element={<Protected role="admin"><AdminDashboard /></Protected>} />
    <Route path="/admin/students" element={<Protected role="admin"><StudentManagement /></Protected>} />
    <Route path="/admin/academic-records" element={<Protected role="admin"><AcademicRecords /></Protected>} />
    <Route path="/admin/assessments" element={<Protected role="admin"><AssessmentManagement /></Protected>} />
    <Route path="/admin/reports" element={<Protected role="admin"><ReportsAnalytics /></Protected>} />
    <Route path="/dashboard" element={<Navigate to="/student/dashboard" replace />} />
    <Route path="*" element={<NotFound />} />
  </Routes>;
}
