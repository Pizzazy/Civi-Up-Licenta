import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

const DashboardLayout = lazy(() => import('@/components/layout/DashboardLayout'));

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const FinanciarPage = lazy(() => import('@/pages/FinanciarPage'));
const ProiectePage = lazy(() => import('@/pages/ProiectePage'));
const CRMPage = lazy(() => import('@/pages/CRMPage'));
const SocialPage = lazy(() => import('@/pages/SocialPage'));
const EmailBuilderPage = lazy(() => import('@/pages/EmailBuilderPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const AccountManagementPage = lazy(() => import('@/pages/AccountManagementPage'));
const AIAnalysisPage = lazy(() => import('@/pages/AIAnalysisPage'));
const EmailCRM = lazy(() => import('@/pages/EmailCRM'));

function RouteFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-9 h-9 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm text-slate-500 font-medium">Se încarcă modulul...</p>
      </div>
    </div>
  );
}

export default function AppRoutes() {
  const { user, loading } = useAuth();

  // While verifying the stored token, show a loading spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-500 font-medium">Se încarcă...</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />

        {/* Protected — Dashboard layout */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="financiar" element={<ProtectedRoute module="financiar"><FinanciarPage /></ProtectedRoute>} />
          <Route path="proiecte" element={<ProtectedRoute module="proiecte"><ProiectePage /></ProtectedRoute>} />
          <Route path="crm" element={<ProtectedRoute module="crm"><CRMPage /></ProtectedRoute>} />
          <Route path="social" element={<ProtectedRoute module="social"><SocialPage /></ProtectedRoute>} />
          <Route path="profil" element={<ProfilePage />} />
          <Route path="ai-analize" element={<ProtectedRoute module="ai-analize"><AIAnalysisPage /></ProtectedRoute>} />
          <Route path="management-conturi" element={<ProtectedRoute module="management-conturi"><AccountManagementPage /></ProtectedRoute>} />
          <Route path="email-crm" element={<ProtectedRoute module="email-crm"><EmailCRM /></ProtectedRoute>} />
        </Route>

        {/* Email Builder — standalone layout (no sidebar) */}
        <Route path="/email-builder" element={<ProtectedRoute module="crm"><EmailBuilderPage /></ProtectedRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
      </Routes>
    </Suspense>
  );
}
