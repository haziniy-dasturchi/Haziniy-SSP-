import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/guard/ProtectedRoute';
import { Skeleton } from './components/common/Skeleton';

// Lazy-loaded pages for optimal bundle splitting
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Scorecard = lazy(() => import('./pages/Scorecard').then((m) => ({ default: m.Scorecard })));
const MetricDetail = lazy(() => import('./pages/MetricDetail').then((m) => ({ default: m.MetricDetail })));
const FactsEntry = lazy(() => import('./pages/FactsEntry').then((m) => ({ default: m.FactsEntry })));
const PlansGrid = lazy(() => import('./pages/PlansGrid').then((m) => ({ default: m.PlansGrid })));
const Bonus = lazy(() => import('./pages/Bonus').then((m) => ({ default: m.Bonus })));
const AIAnalysis = lazy(() => import('./pages/AIAnalysis').then((m) => ({ default: m.AIAnalysis })));
const Branches = lazy(() => import('./pages/Branches').then((m) => ({ default: m.Branches })));
const Structure = lazy(() => import('./pages/Structure').then((m) => ({ default: m.Structure })));
const Roles = lazy(() => import('./pages/Roles').then((m) => ({ default: m.Roles })));
const Users = lazy(() => import('./pages/Users').then((m) => ({ default: m.Users })));
const Evaluation = lazy(() => import('./pages/Evaluation').then((m) => ({ default: m.Evaluation })));
const ImportCSV = lazy(() => import('./pages/ImportCSV').then((m) => ({ default: m.ImportCSV })));
const AuditLog = lazy(() => import('./pages/AuditLog').then((m) => ({ default: m.AuditLog })));
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })));
const Unauthorized = lazy(() => import('./pages/Unauthorized').then((m) => ({ default: m.Unauthorized })));
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

const PageLoader = () => (
  <div className="p-6 space-y-4 max-w-4xl mx-auto animate-pulse">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-44 w-full rounded-xl" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
    </div>
  </div>
);

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Route */}
                <Route path="/login" element={<Login />} />

                {/* Authenticated Layout */}
                <Route
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  {/* SSP Dashboard */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute module="ssp">
                        <Scorecard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Metric Detail */}
                  <Route
                    path="/metric/:id"
                    element={
                      <ProtectedRoute module="ssp">
                        <MetricDetail />
                      </ProtectedRoute>
                    }
                  />

                  {/* Fact Entry */}
                  <Route
                    path="/facts"
                    element={
                      <ProtectedRoute module="fact_entry">
                        <FactsEntry />
                      </ProtectedRoute>
                    }
                  />

                  {/* Monthly Plans */}
                  <Route
                    path="/plans"
                    element={
                      <ProtectedRoute module="monthly_plans">
                        <PlansGrid />
                      </ProtectedRoute>
                    }
                  />

                  {/* Bonus */}
                  <Route
                    path="/bonus"
                    element={
                      <ProtectedRoute module="bonus">
                        <Bonus />
                      </ProtectedRoute>
                    }
                  />

                  {/* AI Analysis */}
                  <Route
                    path="/ai"
                    element={
                      <ProtectedRoute module="ai_analysis">
                        <AIAnalysis />
                      </ProtectedRoute>
                    }
                  />

                  {/* Branches */}
                  <Route
                    path="/branches"
                    element={
                      <ProtectedRoute module="branches">
                        <Branches />
                      </ProtectedRoute>
                    }
                  />

                  {/* Structure (Departments + Metrics) */}
                  <Route
                    path="/structure"
                    element={
                      <ProtectedRoute module="structure">
                        <Structure />
                      </ProtectedRoute>
                    }
                  />

                  {/* Roles & Permissions */}
                  <Route
                    path="/roles"
                    element={
                      <ProtectedRoute module="roles">
                        <Roles />
                      </ProtectedRoute>
                    }
                  />

                  {/* Users */}
                  <Route
                    path="/users"
                    element={
                      <ProtectedRoute module="users">
                        <Users />
                      </ProtectedRoute>
                    }
                  />

                  {/* Evaluation Settings & Bonus Schemes */}
                  <Route
                    path="/evaluation"
                    element={
                      <ProtectedRoute module="evaluation">
                        <Evaluation />
                      </ProtectedRoute>
                    }
                  />

                  {/* CSV Import */}
                  <Route
                    path="/import"
                    element={
                      <ProtectedRoute module="import">
                        <ImportCSV />
                      </ProtectedRoute>
                    }
                  />

                  {/* Audit Log */}
                  <Route
                    path="/audit"
                    element={
                      <ProtectedRoute module="audit_log">
                        <AuditLog />
                      </ProtectedRoute>
                    }
                  />

                  {/* Profile */}
                  <Route path="/profile" element={<Profile />} />

                  {/* Unauthorized */}
                  <Route path="/unauthorized" element={<Unauthorized />} />

                  {/* Catch-all 404 */}
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default App;
