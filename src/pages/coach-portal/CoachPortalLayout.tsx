import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Mail,
  Calendar,
  ClipboardCheck,
  FileText,
  TrendingUp,
  Building2,
  Wallet,
  Settings,
  Menu,
  X,
  ChevronLeft,
  Briefcase,
  User,
  Inbox,
  UserPlus,
  Monitor,
  ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

const navItems: NavItem[] = [
  { to: "/coach-portal", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/coach-portal/inbox", icon: Inbox, label: "Inbox" },
  { to: "/coach-portal/crm", icon: UserPlus, label: "CRM" },
  { to: "/coach-portal/profile", icon: User, label: "My Profile" },
  { to: "/coach-portal/services", icon: Briefcase, label: "Services" },
  { to: "/coach-portal/clients", icon: Users, label: "Clients" },
  { to: "/coach-portal/invitations", icon: Mail, label: "Invitations" },
  { to: "/coach-portal/plans", icon: FileText, label: "Plans & Programs" },
  { to: "/coach-portal/checkins", icon: ClipboardCheck, label: "Check-ins" },
  { to: "/coach-portal/calendar", icon: Calendar, label: "Calendar" },
  { to: "/coach-portal/progress", icon: TrendingUp, label: "Progress" },
  { to: "/coach-portal/affiliations", icon: Building2, label: "Gym Affiliations" },
  { to: "/coach-portal/financials", icon: Wallet, label: "Financials" },
  { to: "/coach-portal/displays", icon: Monitor, label: "Displays" },
  { to: "/coach-portal/signage", icon: ImageIcon, label: "Signage" },
  { to: "/coach-portal/settings", icon: Settings, label: "Settings" },
];

interface Coach {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export default function CoachPortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [coach, setCoach] = useState<Coach | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCoach();
    }
  }, [user]);

  const fetchCoach = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("coaches")
      .select("id, display_name, avatar_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error fetching coach:", error);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      setCoach(data[0]);
    }
    setLoading(false);
  };

  // Show access denied if not a coach
  if (!loading && !coach) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Coach Portal Access</h1>
          <p className="text-muted-foreground mb-4">
            You need to be registered as a coach to access this portal.
          </p>
          <button
            onClick={() => navigate("/find-coach")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
          >
            Become a Coach
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentNavItem = navItems.find(item => 
    location.pathname === item.to || 
    (item.to !== "/coach-portal" && location.pathname.startsWith(item.to))
  ) || navItems[0];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-border bg-card transition-all duration-300",
          sidebarOpen ? "w-64" : "w-20"
        )}
      >
        {/* Logo / Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {sidebarOpen && (
            <span className="font-semibold text-lg">Coach Portal</span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Coach Identity */}
        {coach && (
          <div className="p-3 border-b border-border">
            <div className={cn(
              "flex items-center gap-2 p-2 rounded-lg bg-muted/50",
              !sidebarOpen && "justify-center"
            )}>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                {coach.avatar_url ? (
                  <img
                    src={coach.avatar_url}
                    alt={coach.display_name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4 text-primary" />
                )}
              </div>
              {sidebarOpen && (
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium text-sm truncate">
                    {coach.display_name}
                  </p>
                  <p className="text-xs text-muted-foreground">Coach</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to || 
              (item.to !== "/coach-portal" && location.pathname.startsWith(item.to));
            return (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-foreground",
                  !sidebarOpen && "justify-center"
                )}
                title={!sidebarOpen ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
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
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <span className="font-semibold text-lg">Coach Portal</span>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Coach Identity (Mobile) */}
        {coach && (
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                {coach.avatar_url ? (
                  <img
                    src={coach.avatar_url}
                    alt={coach.display_name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-medium text-sm truncate">
                  {coach.display_name}
                </p>
                <p className="text-xs text-muted-foreground">Coach</p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to ||
              (item.to !== "/coach-portal" && location.pathname.startsWith(item.to));
            return (
              <button
                key={item.to}
                onClick={() => {
                  navigate(item.to);
                  setMobileSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  isActive
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 hover:bg-muted rounded-lg transition-colors lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold">
              {currentNavItem?.label || "Coach Portal"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet context={{ coach }} />
        </main>
      </div>
    </div>
  );
}
