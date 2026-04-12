import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import RecordTestPage from "./pages/RecordTestPage";
import ResultsPage from "./pages/ResultsPage";
import HistoryPage from "./pages/HistoryPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminSubmissionsPage from "./pages/AdminSubmissionsPage";
import AdminAthletesPage from "./pages/AdminAthletesPage";
import AdminAthleteProfilePage from "./pages/AdminAthleteProfilePage";
import AdminMessagesPage from "./pages/AdminMessagesPage";
import { AdminBroadcastPage } from "./pages/AdminBroadcastPage";
import AdminCreatePage from "./pages/AdminCreatePage";
import AdminTrainingPage from "./pages/AdminTrainingPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * ProtectedRoute — guards routes based on authentication and role.
 * 
 * Role hierarchy:
 *   headadmin > admin > athlete
 * 
 * - No role specified = any logged-in user
 * - role="admin" = admin OR headadmin
 * - role="headadmin" = headadmin only
 */
function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: string }) {
  const { authed, user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!authed) return <Navigate to="/login" />;
  
  if (role) {
    const userRole = user?.role;
    
    // headadmin-only route
    if (role === 'headadmin' && userRole !== 'headadmin') {
      return <Navigate to="/" />;
    }
    
    // admin route — accessible by both admin and headadmin
    if (role === 'admin' && userRole !== 'admin' && userRole !== 'headadmin') {
      return <Navigate to="/" />;
    }
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();
  return (
    <Routes location={location} key={location.pathname}>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Athlete routes (any logged-in user) */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/record-test" element={<ProtectedRoute><RecordTestPage /></ProtectedRoute>} />
      <Route path="/results" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />

      {/* Admin routes (admin + headadmin) */}
      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboardPage /></ProtectedRoute>} />
      <Route path="/admin/submissions" element={<ProtectedRoute role="admin"><AdminSubmissionsPage /></ProtectedRoute>} />
      <Route path="/admin/athletes" element={<ProtectedRoute role="admin"><AdminAthletesPage /></ProtectedRoute>} />
      <Route path="/admin/athletes/:id" element={<ProtectedRoute role="admin"><AdminAthleteProfilePage /></ProtectedRoute>} />
      <Route path="/admin/messages" element={<ProtectedRoute role="admin"><AdminMessagesPage /></ProtectedRoute>} />
      <Route path="/admin/broadcast" element={<ProtectedRoute role="admin"><AdminBroadcastPage /></ProtectedRoute>} />

      {/* HeadAdmin only */}
      <Route path="/admin/create" element={<ProtectedRoute role="headadmin"><AdminCreatePage /></ProtectedRoute>} />
      <Route path="/admin/training" element={<ProtectedRoute role="headadmin"><AdminTrainingPage /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
