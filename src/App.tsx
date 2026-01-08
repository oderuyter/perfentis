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
import CoachPortalLayout from "./pages/coach-portal/CoachPortalLayout";
import CoachDashboard from "./pages/coach-portal/CoachDashboard";
import CoachProfile from "./pages/coach-portal/CoachProfile";
import CoachServices from "./pages/coach-portal/CoachServices";
import CoachClients from "./pages/coach-portal/CoachClients";
import CoachInvitations from "./pages/coach-portal/CoachInvitations";
import CoachPlans from "./pages/coach-portal/CoachPlans";
import CoachCheckins from "./pages/coach-portal/CoachCheckins";
import CoachCalendar from "./pages/coach-portal/CoachCalendar";
import CoachProgress from "./pages/coach-portal/CoachProgress";
import CoachAffiliations from "./pages/coach-portal/CoachAffiliations";
import CoachFinancials from "./pages/coach-portal/CoachFinancials";
import CoachSettings from "./pages/coach-portal/CoachSettings";
import EventPortalLayout from "./pages/event-portal/EventPortalLayout";
import EventDashboard from "./pages/event-portal/EventDashboard";
import EventsManagement from "./pages/event-portal/EventsManagement";
import EventDivisions from "./pages/event-portal/EventDivisions";
import EventRegistrations from "./pages/event-portal/EventRegistrations";
import EventWorkouts from "./pages/event-portal/EventWorkouts";
import EventSchedule from "./pages/event-portal/EventSchedule";
import EventScoring from "./pages/event-portal/EventScoring";
import EventLeaderboards from "./pages/event-portal/EventLeaderboards";
import EventStaff from "./pages/event-portal/EventStaff";
import EventCommunications from "./pages/event-portal/EventCommunications";
import EventBranding from "./pages/event-portal/EventBranding";
import EventReports from "./pages/event-portal/EventReports";
import EventSettings from "./pages/event-portal/EventSettings";
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
      <Route path="/coach-portal" element={<ProtectedRoute><CoachPortalLayout /></ProtectedRoute>}>
        <Route index element={<CoachDashboard />} />
        <Route path="profile" element={<CoachProfile />} />
        <Route path="services" element={<CoachServices />} />
        <Route path="clients" element={<CoachClients />} />
        <Route path="invitations" element={<CoachInvitations />} />
        <Route path="plans" element={<CoachPlans />} />
        <Route path="checkins" element={<CoachCheckins />} />
        <Route path="calendar" element={<CoachCalendar />} />
        <Route path="progress" element={<CoachProgress />} />
        <Route path="affiliations" element={<CoachAffiliations />} />
        <Route path="financials" element={<CoachFinancials />} />
        <Route path="settings" element={<CoachSettings />} />
      </Route>
      <Route path="/event-portal" element={<ProtectedRoute><EventPortalLayout /></ProtectedRoute>}>
        <Route index element={<EventDashboard />} />
        <Route path="events" element={<EventsManagement />} />
        <Route path="divisions" element={<EventDivisions />} />
        <Route path="registrations" element={<EventRegistrations />} />
        <Route path="workouts" element={<EventWorkouts />} />
        <Route path="schedule" element={<EventSchedule />} />
        <Route path="scoring" element={<EventScoring />} />
        <Route path="leaderboards" element={<EventLeaderboards />} />
        <Route path="staff" element={<EventStaff />} />
        <Route path="communications" element={<EventCommunications />} />
        <Route path="branding" element={<EventBranding />} />
        <Route path="reports" element={<EventReports />} />
        <Route path="settings" element={<EventSettings />} />
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
