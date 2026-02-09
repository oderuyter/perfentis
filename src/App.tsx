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
import SplitDetail from "./pages/train/SplitDetail";
import SplitBuilder from "./pages/train/SplitBuilder";
import WorkoutBuilder from "./pages/train/WorkoutBuilder";
import WorkoutTemplateDetail from "./pages/train/WorkoutTemplateDetail";
import Exercises from "./pages/Exercises";
import Progress from "./pages/Progress";
import Profile from "./pages/Profile";
import WorkoutDetail from "./pages/WorkoutDetail";
import ActiveWorkout from "./pages/ActiveWorkout";
import TemplateActiveWorkout from "./pages/TemplateActiveWorkout";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Nutrition from "./pages/Nutrition";
import Habits from "./pages/Habits";
import GymMembership from "./pages/GymMembership";
import FindCoach from "./pages/FindCoach";
import Social from "./pages/Social";
import Events from "./pages/Events";
import RunClubs from "./pages/RunClubs";
import Help from "./pages/Help";
import Playlists from "./pages/Playlists";
import Inbox from "./pages/Inbox";
import Notifications from "./pages/Notifications";
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
import GymSpaces from "./pages/gym-portal/GymSpaces";
import GymCheckinStation from "./pages/gym-portal/GymCheckinStation";
import GymInbox from "./pages/gym-portal/GymInbox";
import GymCRM from "./pages/gym-portal/GymCRM";
import CoachPortalLayout from "./pages/coach-portal/CoachPortalLayout";
import CoachDashboard from "./pages/coach-portal/CoachDashboard";
import CoachProfile from "./pages/coach-portal/CoachProfile";
import CoachServices from "./pages/coach-portal/CoachServices";
import CoachClients from "./pages/coach-portal/CoachClients";
import CoachInvitations from "./pages/coach-portal/CoachInvitations";
import CoachPlans from "./pages/coach-portal/CoachPlans";
import CoachCheckins from "./pages/coach-portal/CoachCheckins";
import CheckinReviewWorkspace from "./pages/coach-portal/CheckinReviewWorkspace";
import CoachCalendar from "./pages/coach-portal/CoachCalendar";
import CoachProgress from "./pages/coach-portal/CoachProgress";
import CoachAffiliations from "./pages/coach-portal/CoachAffiliations";
import CoachFinancials from "./pages/coach-portal/CoachFinancials";
import CoachSettings from "./pages/coach-portal/CoachSettings";
import CoachInbox from "./pages/coach-portal/CoachInbox";
import CoachCRM from "./pages/coach-portal/CoachCRM";
import EventPortalLayout from "./pages/event-portal/EventPortalLayout";
import EventDashboard from "./pages/event-portal/EventDashboard";
import EventsManagement from "./pages/event-portal/EventsManagement";
import EventDivisions from "./pages/event-portal/EventDivisions";
import EventRegistrations from "./pages/event-portal/EventRegistrations";
import EventWorkouts from "./pages/event-portal/EventWorkouts";
import EventClassesWorkouts from "./pages/event-portal/EventClassesWorkouts";
import EventSchedule from "./pages/event-portal/EventSchedule";
import EventScoring from "./pages/event-portal/EventScoring";
import EventLeaderboards from "./pages/event-portal/EventLeaderboards";
import EventCheckin from "./pages/event-portal/EventCheckin";
import EventCheckinStation from "./pages/event-portal/EventCheckinStation";
import EventStaff from "./pages/event-portal/EventStaff";
import EventCommunications from "./pages/event-portal/EventCommunications";
import EventBranding from "./pages/event-portal/EventBranding";
import EventReports from "./pages/event-portal/EventReports";
import EventSettings from "./pages/event-portal/EventSettings";
import EventInbox from "./pages/event-portal/EventInbox";
import EventCRM from "./pages/event-portal/EventCRM";
import RunClubPortalLayout from "./pages/run-club-portal/RunClubPortalLayout";
import RunClubDashboard from "./pages/run-club-portal/RunClubDashboard";
import RunClubMembers from "./pages/run-club-portal/RunClubMembers";
import RunClubRuns from "./pages/run-club-portal/RunClubRuns";
import RunClubEvents from "./pages/run-club-portal/RunClubEvents";
import RunClubAttendance from "./pages/run-club-portal/RunClubAttendance";
import RunClubAnnouncements from "./pages/run-club-portal/RunClubAnnouncements";
import RunClubFinancials from "./pages/run-club-portal/RunClubFinancials";
import RunClubProfile from "./pages/run-club-portal/RunClubProfile";
import RunClubSettings from "./pages/run-club-portal/RunClubSettings";
import RunClubInbox from "./pages/run-club-portal/RunClubInbox";
import RunClubCRM from "./pages/run-club-portal/RunClubCRM";
import AcceptInvite from "./pages/AcceptInvite";
import AdminPortalLayout from "./pages/admin-portal/AdminPortalLayout";
import AdminDashboard from "./pages/admin-portal/AdminDashboard";
import AdminUsers from "./pages/admin-portal/AdminUsers";
import AdminUAC from "./pages/admin-portal/AdminUAC";
import AdminGyms from "./pages/admin-portal/AdminGyms";
import AdminCoaches from "./pages/admin-portal/AdminCoaches";
import AdminEvents from "./pages/admin-portal/AdminEvents";
import AdminWorkouts from "./pages/admin-portal/AdminWorkouts";
import AdminExercises from "./pages/admin-portal/AdminExercises";
import AdminPlaylists from "./pages/admin-portal/AdminPlaylists";
import AdminBilling from "./pages/admin-portal/AdminBilling";
import AdminSocial from "./pages/admin-portal/AdminSocial";
import AdminNotifications from "./pages/admin-portal/AdminNotifications";
import AdminImports from "./pages/admin-portal/AdminImports";
import AdminLogs from "./pages/admin-portal/AdminLogs";
import AdminSettings from "./pages/admin-portal/AdminSettings";
import AdminInbox from "./pages/admin-portal/AdminInbox";
import AdminRegistrations from "./pages/admin-portal/AdminRegistrations";
import AdminEmailDiagnostics from "./pages/admin-portal/AdminEmailDiagnostics";
import AdminWorkoutModeration from "./pages/admin-portal/AdminWorkoutModeration";
import AdminSplitModeration from "./pages/admin-portal/AdminSplitModeration";
import AdminRunClubs from "./pages/admin-portal/AdminRunClubs";
import AdminUserDetail from "./pages/admin-portal/AdminUserDetail";
import AdminRewards from "./pages/admin-portal/AdminRewards";
import AdminSupplierSubmissions from "./pages/admin-portal/AdminSupplierSubmissions";
import GymOffers from "./pages/gym-portal/GymOffers";
import Rewards from "./pages/Rewards";
import ImportWizard from "./pages/ImportWizard";
import AdminExerciseSubmissions from "./pages/admin-portal/AdminExerciseSubmissions";
import AdminNutrition from "./pages/admin-portal/AdminNutrition";
import AdminExternalGymSubmissions from "./pages/admin-portal/AdminExternalGymSubmissions";
import NutritionLibrary from "./pages/NutritionLibrary";
import RunTracker from "./pages/RunTracker";

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
        <Route path="/train/split/new" element={<SplitBuilder />} />
        <Route path="/train/split/:splitId" element={<SplitDetail />} />
        <Route path="/train/split/:splitId/edit" element={<SplitBuilder />} />
        <Route path="/train/workout/new" element={<WorkoutBuilder />} />
        <Route path="/train/workout/:templateId" element={<WorkoutTemplateDetail />} />
        <Route path="/train/workout/:templateId/edit" element={<WorkoutBuilder />} />
        <Route path="/workout/template/:templateId/active" element={<TemplateActiveWorkout />} />
        <Route path="/exercises" element={<Exercises />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/nutrition" element={<Nutrition />} />
        <Route path="/nutrition/library" element={<NutritionLibrary />} />
        <Route path="/habits" element={<Habits />} />
        <Route path="/gym-membership" element={<GymMembership />} />
        <Route path="/find-coach" element={<FindCoach />} />
        <Route path="/social" element={<Social />} />
        <Route path="/events" element={<Events />} />
        <Route path="/run-clubs" element={<RunClubs />} />
        <Route path="/playlists" element={<Playlists />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/import" element={<ImportWizard />} />
        <Route path="/help" element={<Help />} />
        <Route path="/run" element={<RunTracker />} />
      </Route>
      <Route path="/gym-portal" element={<ProtectedRoute><GymPortalLayout /></ProtectedRoute>}>
        <Route index element={<GymDashboard />} />
        <Route path="dashboard" element={<GymDashboard />} />
        <Route path="checkin-station" element={<GymCheckinStation />} />
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
        <Route path="spaces" element={<GymSpaces />} />
        <Route path="inbox" element={<GymInbox />} />
        <Route path="crm" element={<GymCRM />} />
        <Route path="offers" element={<GymOffers />} />
      </Route>
      <Route path="/coach-portal" element={<ProtectedRoute><CoachPortalLayout /></ProtectedRoute>}>
        <Route index element={<CoachDashboard />} />
        <Route path="profile" element={<CoachProfile />} />
        <Route path="services" element={<CoachServices />} />
        <Route path="clients" element={<CoachClients />} />
        <Route path="invitations" element={<CoachInvitations />} />
        <Route path="plans" element={<CoachPlans />} />
        <Route path="checkins" element={<CoachCheckins />} />
        <Route path="checkins/:clientId" element={<CheckinReviewWorkspace />} />
        <Route path="checkins/:clientId/:checkinId" element={<CheckinReviewWorkspace />} />
        <Route path="calendar" element={<CoachCalendar />} />
        <Route path="progress" element={<CoachProgress />} />
        <Route path="affiliations" element={<CoachAffiliations />} />
        <Route path="financials" element={<CoachFinancials />} />
        <Route path="settings" element={<CoachSettings />} />
        <Route path="inbox" element={<CoachInbox />} />
        <Route path="crm" element={<CoachCRM />} />
      </Route>
      <Route path="/event-portal" element={<ProtectedRoute><EventPortalLayout /></ProtectedRoute>}>
        <Route index element={<EventDashboard />} />
        <Route path="events" element={<EventsManagement />} />
        <Route path="divisions" element={<EventDivisions />} />
        <Route path="registrations" element={<EventRegistrations />} />
        <Route path="workouts" element={<EventWorkouts />} />
        <Route path="classes" element={<EventClassesWorkouts />} />
        <Route path="schedule" element={<EventSchedule />} />
        <Route path="scoring" element={<EventScoring />} />
        <Route path="leaderboards" element={<EventLeaderboards />} />
        <Route path="checkin" element={<EventCheckin />} />
        <Route path="checkin-station" element={<EventCheckinStation />} />
        <Route path="staff" element={<EventStaff />} />
        <Route path="communications" element={<EventCommunications />} />
        <Route path="branding" element={<EventBranding />} />
        <Route path="reports" element={<EventReports />} />
        <Route path="settings" element={<EventSettings />} />
        <Route path="inbox" element={<EventInbox />} />
        <Route path="crm" element={<EventCRM />} />
      </Route>
      <Route path="/run-club-portal" element={<ProtectedRoute><RunClubPortalLayout /></ProtectedRoute>}>
        <Route index element={<RunClubDashboard />} />
        <Route path="dashboard" element={<RunClubDashboard />} />
        <Route path="inbox" element={<RunClubInbox />} />
        <Route path="crm" element={<RunClubCRM />} />
        <Route path="members" element={<RunClubMembers />} />
        <Route path="runs" element={<RunClubRuns />} />
        <Route path="attendance" element={<RunClubAttendance />} />
        <Route path="events" element={<RunClubEvents />} />
        <Route path="announcements" element={<RunClubAnnouncements />} />
        <Route path="financials" element={<RunClubFinancials />} />
        <Route path="profile" element={<RunClubProfile />} />
        <Route path="settings" element={<RunClubSettings />} />
      </Route>
      <Route path="/admin-portal" element={<ProtectedRoute><AdminPortalLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:userId" element={<AdminUserDetail />} />
        <Route path="uac" element={<AdminUAC />} />
        <Route path="gyms" element={<AdminGyms />} />
        <Route path="coaches" element={<AdminCoaches />} />
        <Route path="events" element={<AdminEvents />} />
        <Route path="run-clubs" element={<AdminRunClubs />} />
        <Route path="workouts" element={<AdminWorkouts />} />
        <Route path="workout-moderation" element={<AdminWorkoutModeration />} />
        <Route path="split-moderation" element={<AdminSplitModeration />} />
        <Route path="exercises" element={<AdminExercises />} />
        <Route path="playlists" element={<AdminPlaylists />} />
        <Route path="billing" element={<AdminBilling />} />
        <Route path="social" element={<AdminSocial />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="imports" element={<AdminImports />} />
        <Route path="logs" element={<AdminLogs />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="inbox" element={<AdminInbox />} />
        <Route path="registrations" element={<AdminRegistrations />} />
        <Route path="email-diagnostics" element={<AdminEmailDiagnostics />} />
        <Route path="rewards" element={<AdminRewards />} />
        <Route path="supplier-submissions" element={<AdminSupplierSubmissions />} />
        <Route path="exercise-submissions" element={<AdminExerciseSubmissions />} />
        <Route path="nutrition" element={<AdminNutrition />} />
        <Route path="external-gym-submissions" element={<AdminExternalGymSubmissions />} />
      </Route>
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/workout/:id/active" element={<ProtectedRoute><ActiveWorkout /></ProtectedRoute>} />
      <Route path="/workout/template/:templateId/active" element={<ProtectedRoute><ActiveWorkout /></ProtectedRoute>} />
      <Route path="/workout/split/:splitId/:workoutId/active" element={<ProtectedRoute><ActiveWorkout /></ProtectedRoute>} />
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
