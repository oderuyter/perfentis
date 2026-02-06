import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { useOwnedEvents } from "@/hooks/useOwnedEvents";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Dumbbell,
  Clock,
  Target,
  Trophy,
  UserCheck,
  Mail,
  Palette,
  FileText,
  Settings,
  ChevronDown,
  ChevronLeft,
  Plus,
  Menu,
  X,
  Inbox,
  UserPlus,
  ScanLine,
  QrCode,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/useProfile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { motion } from "framer-motion";

interface Event {
  id: string;
  title: string;
  status: string;
  start_date: string | null;
}

const navItems = [
  { to: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "inbox", icon: Inbox, label: "Inbox" },
  { to: "crm", icon: UserPlus, label: "CRM" },
  { to: "events", icon: Calendar, label: "Events" },
  { to: "divisions", icon: Users, label: "Categories / Divisions" },
  { to: "registrations", icon: UserCheck, label: "Registration & Teams" },
  { to: "checkin", icon: QrCode, label: "Check-In" },
  { to: "checkin-station", icon: ScanLine, label: "Check-In Station" },
  { to: "workouts", icon: Dumbbell, label: "Workouts" },
  { to: "classes", icon: Calendar, label: "Classes & Schedule" },
  { to: "schedule", icon: Clock, label: "Heats" },
  { to: "scoring", icon: Target, label: "Live Scoring" },
  { to: "leaderboards", icon: Trophy, label: "Leaderboards" },
  { to: "staff", icon: UserCheck, label: "Volunteers & Staff" },
  { to: "communications", icon: Mail, label: "Communications" },
  { to: "branding", icon: Palette, label: "Branding & Sponsors" },
  { to: "reports", icon: FileText, label: "Reports / Exports" },
  { to: "settings", icon: Settings, label: "Settings" },
];

export default function EventPortalLayout() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasAnyRole, isAdmin, isLoading: isRolesLoading } = useRoles();
  const { hasEventAccess, isLoading: isEventAccessLoading } = useOwnedEvents();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const hasAccess = isAdmin() || hasAnyRole(['event_organiser', 'gym_manager', 'gym_staff']) || hasEventAccess;
  const isCheckingAccess = isRolesLoading || isEventAccessLoading;

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  // Redirect unauthorized users
  useEffect(() => {
    if (!isCheckingAccess && !hasAccess) {
      navigate("/", { replace: true });
    }
  }, [isCheckingAccess, hasAccess, navigate]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, status, start_date")
        .eq("organiser_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEvents(data || []);
      if (data && data.length > 0 && !selectedEventId) {
        setSelectedEventId(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId);
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {(sidebarOpen || isMobile) && (
          <span className="font-semibold text-lg">Event Portal</span>
        )}
        {isMobile ? (
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Event Selector */}
      {events.length > 0 && (sidebarOpen || isMobile) && (
        <div className="p-3 border-b border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Trophy className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium text-sm truncate">
                    {selectedEvent?.title || "Select Event"}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-popover">
              {events.map((event) => (
                <DropdownMenuItem
                  key={event.id}
                  onClick={() => handleEventChange(event.id)}
                  className={cn(selectedEventId === event.id && "bg-accent")}
                >
                  {event.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => isMobile && setMobileSidebarOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mb-1",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                !sidebarOpen && !isMobile && "justify-center"
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {(sidebarOpen || isMobile) && <span className="font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Back to App */}
      <div className="p-3 border-t border-border">
        <button
          onClick={() => navigate("/")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground",
            !sidebarOpen && !isMobile && "justify-center"
          )}
        >
          <ChevronLeft className="h-5 w-5" />
          {(sidebarOpen || isMobile) && <span className="text-sm">Back to App</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col border-r border-border bg-card transition-all duration-300",
        sidebarOpen ? "w-64" : "w-20"
      )}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <motion.aside
        initial={{ x: "-100%" }}
        animate={{ x: mobileSidebarOpen ? 0 : "-100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed left-0 top-0 bottom-0 w-72 bg-card z-50 lg:hidden flex flex-col border-r border-border"
      >
        <SidebarContent isMobile />
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 hover:bg-muted rounded-lg transition-colors lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="font-semibold text-lg hidden sm:block">
              {selectedEvent?.title || "Event Portal"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => navigate("/event-portal/events/new")}
            >
              <Plus className="h-4 w-4 mr-1" />
              New Event
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      {profile?.display_name?.[0] || user?.email?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/")}>
                  Back to App
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut()}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet context={{ selectedEventId, selectedEvent, events, refreshEvents: fetchEvents }} />
        </main>
      </div>
    </div>
  );
}
