import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "./components/AppLayout";
import Home from "./pages/Home";
import Train from "./pages/Train";
import Exercises from "./pages/Exercises";
import Progress from "./pages/Progress";
import Profile from "./pages/Profile";
import WorkoutDetail from "./pages/WorkoutDetail";
import ActiveWorkout from "./pages/ActiveWorkout";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Nutrition from "./pages/Nutrition";
import Habits from "./pages/Habits";
import GymMembership from "./pages/GymMembership";
import FindCoach from "./pages/FindCoach";
import Social from "./pages/Social";
import Events from "./pages/Events";
import Help from "./pages/Help";
import GymPortalLayout from "./pages/gym-portal/GymPortalLayout";
import GymDashboard from "./pages/gym-portal/GymDashboard";
import GymMembers from "./pages/gym-portal/GymMembers";
import GymMemberships from "./pages/gym-portal/GymMemberships";
import GymClasses from "./pages/gym-portal/GymClasses";
import GymBookings from "./pages/gym-portal/GymBookings";
import GymStaff from "./pages/gym-portal/GymStaff";
import GymRotas from "./pages/gym-portal/GymRotas";
import GymPayments from "./pages/gym-portal/GymPayments";
import GymReports from "./pages/gym-portal/GymReports";
import GymProfile from "./pages/gym-portal/GymProfile";
import GymSettings from "./pages/gym-portal/GymSettings";
import GymMembershipLevels from "./pages/gym-portal/GymMembershipLevels";
import AcceptInvite from "./pages/AcceptInvite";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-primary">
        <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-primary">
        <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<Home />} />
        <Route path="/train" element={<Train />} />
        <Route path="/exercises" element={<Exercises />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/nutrition" element={<Nutrition />} />
        <Route path="/habits" element={<Habits />} />
        <Route path="/gym-membership" element={<GymMembership />} />
        <Route path="/find-coach" element={<FindCoach />} />
        <Route path="/social" element={<Social />} />
        <Route path="/events" element={<Events />} />
        <Route path="/help" element={<Help />} />
        <Route path="/workout/:id" element={<WorkoutDetail />} />
      </Route>
      <Route path="/gym-portal" element={<ProtectedRoute><GymPortalLayout /></ProtectedRoute>}>
        <Route index element={<GymDashboard />} />
        <Route path="members" element={<GymMembers />} />
        <Route path="memberships" element={<GymMemberships />} />
        <Route path="classes" element={<GymClasses />} />
        <Route path="bookings" element={<GymBookings />} />
        <Route path="staff" element={<GymStaff />} />
        <Route path="rotas" element={<GymRotas />} />
        <Route path="payments" element={<GymPayments />} />
        <Route path="reports" element={<GymReports />} />
        <Route path="profile" element={<GymProfile />} />
        <Route path="settings" element={<GymSettings />} />
        <Route path="membership-levels" element={<GymMembershipLevels />} />
      </Route>
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/workout/:id/active" element={<ProtectedRoute><ActiveWorkout /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
