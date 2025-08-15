import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { authService } from '@/services/auth';
import { setAuthToken } from '@/lib/api';

// Layout components
import DashboardLayout from '@/components/layout/DashboardLayout';
import AuthLayout from '@/components/layout/AuthLayout';

// Auth pages
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';

// Dashboard pages
import DashboardPage from '@/pages/dashboard/DashboardPage';
import EnhancedDashboard from '@/pages/dashboard/EnhancedDashboard';
import ProprietairesPage from '@/pages/proprietaires/ProprietairesPage';
import BiensPageComplete from '@/pages/biens/BiensPageComplete';
import BienDetailsPage from '@/pages/biens/BienDetailsPage';
import LocatairesPageComplete from '@/pages/locataires/LocatairesPageComplete';
import LocataireDetailsPage from '@/pages/locataires/LocataireDetailsPage';
import GarantsPage from '@/pages/garants/GarantsPage';
import ContratsPageNew from '@/pages/contrats/ContratsPageNew';
import ContratDetailsPage from '@/pages/contrats/ContratDetailsPage';
import LoyersPage from '@/pages/loyers/LoyersPage';
import LoyersGenerationPage from '@/pages/loyers/LoyersGenerationPage';
import RappelsPage from '@/pages/rappels/RappelsPage';
import QuittancesPage from '@/pages/quittances/QuittancesPage';
import ChargesPage from '@/pages/charges/ChargesPage';
import FiscalitePage from '@/pages/fiscalite/FiscalitePage';
import PretsPage from '@/pages/prets/PretsPage';
import DiagnosticPage from '@/pages/DiagnosticPage';
import EmailsPage from '@/pages/emails/EmailsPage';
import SettingsPage from '@/pages/settings/SettingsPage';

// Loading component
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Test components (temporary)
import DocumentTest from '@/components/Documents/DocumentTest';
import DocumentDebug from '@/components/Documents/DocumentDebug';
import SimpleUploadTest from '@/components/Documents/SimpleUploadTest';
import BasicDropTest from '@/components/Documents/BasicDropTest';

// Protected Route component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = authService.getToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route component (redirects to dashboard if authenticated)
const PublicRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = authService.getToken();

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Auth Check component
const AuthCheck: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = authService.getToken();

  const { isLoading, error } = useQuery(
    'currentUser',
    authService.getCurrentUser,
    {
      enabled: !!token,
      retry: false,
      onError: () => {
        // Token is invalid, remove it
        authService.logout();
      },
    }
  );

  // If we have a token but the query is still loading, show loading
  if (token && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If we have a token but got an error, the token is invalid
  if (token && error) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  // Initialize auth token on app start
  React.useEffect(() => {
    const token = authService.getToken();
    if (token) {
      setAuthToken(token);
    }
  }, []);

  return (
    <AuthCheck>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <AuthLayout>
                <LoginPage />
              </AuthLayout>
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <AuthLayout>
                <RegisterPage />
              </AuthLayout>
            </PublicRoute>
          }
        />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <EnhancedDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/simple"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DashboardPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/proprietaires"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ProprietairesPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/biens"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <BiensPageComplete />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/biens/:id"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <BienDetailsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/locataires"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <LocatairesPageComplete />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/locataires/:id"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <LocataireDetailsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/garants"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <GarantsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/contrats"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ContratsPageNew />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/contrats/:id"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ContratDetailsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/loyers"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <LoyersPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/loyers/generation"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <LoyersGenerationPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/quittances"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <QuittancesPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/charges"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ChargesPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/fiscalite"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <FiscalitePage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/prets"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <PretsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/diagnostic"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DiagnosticPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/emails"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <EmailsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rappels"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <RappelsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Test Documents routes (temporary) */}
        <Route
          path="/test-documents"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DocumentTest />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/debug-documents"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DocumentDebug />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/simple-upload"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SimpleUploadTest />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/drop-test"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <BasicDropTest />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SettingsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Redirect root to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthCheck>
  );
}

export default App;