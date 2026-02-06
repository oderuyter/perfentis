import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CalendarCheck,
  MessageSquare,
  UserPlus,
  Settings,
  Menu,
  X,
  ChevronDown,
  ChevronLeft,
  Footprints,
  Megaphone,
  Trophy,
  ClipboardCheck,
  Building2,
  Inbox
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { useOwnedRunClubs, RunClub } from "@/hooks/useRunClubs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2 } from "lucide-react";

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

const navItems: NavItem[] = [
  { to: "/run-club-portal/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/run-club-portal/inbox", icon: Inbox, label: "Inbox" },
  { to: "/run-club-portal/crm", icon: UserPlus, label: "CRM" },
  { to: "/run-club-portal/members", icon: Users, label: "Members" },
  { to: "/run-club-portal/runs", icon: Calendar, label: "Runs" },
  { to: "/run-club-portal/attendance", icon: ClipboardCheck, label: "Attendance" },
  { to: "/run-club-portal/events", icon: Trophy, label: "Events & Races" },
  { to: "/run-club-portal/announcements", icon: Megaphone, label: "Announcements" },
  { to: "/run-club-portal/financials", icon: Building2, label: "Financials" },
  { to: "/run-club-portal/profile", icon: Footprints, label: "Club Profile" },
  { to: "/run-club-portal/settings", icon: Settings, label: "Settings" },
];

export default function RunClubPortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { clubs, isLoading, hasRunClubAccess, refetch } = useOwnedRunClubs();
  const { hasAnyRole, isAdmin, isLoading: isRolesLoading } = useRoles();

  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const hasAccess = isAdmin() || hasAnyRole(['run_club_organiser']) || hasRunClubAccess;
  const isCheckingAccess = isLoading || isRolesLoading;

  // Set first club as selected when clubs load
  useEffect(() => {
    if (clubs.length > 0 && !selectedClubId) {
      setSelectedClubId(clubs[0].id);
    }
  }, [clubs, selectedClubId]);

  // Redirect unauthorized users
  useEffect(() => {
    if (!isCheckingAccess && !hasAccess) {
      navigate("/", { replace: true });
    }
  }, [isCheckingAccess, hasAccess, navigate]);

  const selectedClub = clubs.find((c) => c.id === selectedClubId) || null;

  const isActive = (path: string) => location.pathname === path;

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

  // No clubs - show create prompt
  if (clubs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Footprints className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Start Your Run Club</h1>
          <p className="text-muted-foreground mb-6">
            Create your first run club to start managing members, runs, and events.
          </p>
          <Button onClick={() => navigate("/run-clubs")}>
            Create Run Club
          </Button>
          <Button variant="ghost" className="ml-2" onClick={() => navigate("/")}>
            Back to App
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-border bg-card transition-all duration-300",
          sidebarOpen ? "w-64" : "w-20"
        )}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {sidebarOpen && (
            <span className="font-semibold text-lg">Run Club Portal</span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Club Selector */}
        {clubs.length > 0 && (
          <div className="p-3 border-b border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors",
                    !sidebarOpen && "justify-center"
                  )}
                >
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Footprints className="h-4 w-4 text-primary" />
                  </div>
                  {sidebarOpen && (
                    <>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium text-sm truncate">
                          {selectedClub?.name || "Select Club"}
                        </p>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-popover">
                {clubs.map((club) => (
                  <DropdownMenuItem
                    key={club.id}
                    onClick={() => setSelectedClubId(club.id)}
                    className={cn(selectedClubId === club.id && "bg-accent")}
                  >
                    {club.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.to);
            return (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-foreground",
                  !sidebarOpen && "justify-center"
                )}
                title={!sidebarOpen ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Back to App */}
        <div className="p-3 border-t border-border">
          <button
            onClick={() => navigate("/")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground",
              !sidebarOpen && "justify-center"
            )}
          >
            <ChevronLeft className="h-5 w-5" />
            {sidebarOpen && <span className="text-sm">Back to App</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-card border-r border-border z-50 lg:hidden flex flex-col"
            >
              <div className="h-16 flex items-center justify-between px-4 border-b border-border">
                <span className="font-semibold text-lg">Run Club Portal</span>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-2 hover:bg-muted rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Club Selector */}
              {clubs.length > 0 && (
                <div className="p-3 border-b border-border">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Footprints className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="font-medium text-sm truncate">
                            {selectedClub?.name || "Select Club"}
                          </p>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 bg-popover">
                      {clubs.map((club) => (
                        <DropdownMenuItem
                          key={club.id}
                          onClick={() => setSelectedClubId(club.id)}
                          className={cn(selectedClubId === club.id && "bg-accent")}
                        >
                          {club.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const active = isActive(item.to);
                  return (
                    <button
                      key={item.to}
                      onClick={() => {
                        navigate(item.to);
                        setMobileSidebarOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="p-3 border-t border-border">
                <button
                  onClick={() => navigate("/")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                >
                  <ChevronLeft className="h-5 w-5" />
                  <span className="text-sm">Back to App</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 hover:bg-muted rounded-lg lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-semibold truncate">{selectedClub?.name}</h1>
              <p className="text-sm text-muted-foreground capitalize">
                {selectedClub?.status}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/run-clubs")}
          >
            <Footprints className="h-4 w-4 mr-2" />
            New Club
          </Button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet
            context={{
              selectedClubId,
              selectedClub,
              refetchClubs: refetch,
            }}
          />
        </main>
      </div>
    </div>
  );
}
