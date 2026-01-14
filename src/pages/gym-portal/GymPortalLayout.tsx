import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CalendarCheck,
  UserCog,
  Clock,
  Wallet,
  BarChart3,
  Building2,
  Settings,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Layers,
  MapPin,
  ScanLine
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRoles } from "@/hooks/useRoles";
import { useOwnedGyms } from "@/hooks/useOwnedGyms";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  capability?: string;
}

const navItems: NavItem[] = [
  { to: "/gym-portal/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/gym-portal/checkin-station", icon: ScanLine, label: "Check-in Station" },
  { to: "/gym-portal/members", icon: Users, label: "Members" },
  { to: "/gym-portal/membership-levels", icon: Layers, label: "Membership Levels" },
  { to: "/gym-portal/spaces", icon: MapPin, label: "Spaces" },
  { to: "/gym-portal/classes", icon: Calendar, label: "Classes & Schedule" },
  { to: "/gym-portal/bookings", icon: CalendarCheck, label: "Bookings" },
  { to: "/gym-portal/staff", icon: UserCog, label: "Staff" },
  { to: "/gym-portal/rotas", icon: Clock, label: "Rotas" },
  { to: "/gym-portal/payments", icon: Wallet, label: "Payments & Refunds" },
  { to: "/gym-portal/reports", icon: BarChart3, label: "Reports" },
  { to: "/gym-portal/profile", icon: Building2, label: "Gym Profile" },
  { to: "/gym-portal/settings", icon: Settings, label: "Settings" },
];

export default function GymPortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { roles, isAdmin } = useRoles();
  const { gyms: ownedGyms, isLoading: gymsLoading } = useOwnedGyms();
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);

  // Get all gyms user has access to
  const managedGymIds = roles
    .filter(r => r.role === 'gym_manager' || r.role === 'gym_staff')
    .map(r => r.scope_id)
    .filter(Boolean) as string[];

  const accessibleGyms = ownedGyms;

  // Select first gym on load
  useEffect(() => {
    if (accessibleGyms.length > 0 && !selectedGymId) {
      setSelectedGymId(accessibleGyms[0].id);
    }
  }, [accessibleGyms, selectedGymId]);

  // Check access
  const hasPortalAccess = isAdmin() || accessibleGyms.length > 0 || managedGymIds.length > 0;

  if (!hasPortalAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">You don't have permission to access the Gym Portal.</p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const selectedGym = accessibleGyms.find(g => g.id === selectedGymId);

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
            <span className="font-semibold text-lg">Gym Portal</span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Gym Selector */}
        {accessibleGyms.length > 0 && (
          <div className="p-3 border-b border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors",
                  !sidebarOpen && "justify-center"
                )}>
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  {sidebarOpen && (
                    <>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium text-sm truncate">
                          {selectedGym?.name || "Select Gym"}
                        </p>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {accessibleGyms.map((gym) => (
                  <DropdownMenuItem
                    key={gym.id}
                    onClick={() => setSelectedGymId(gym.id)}
                    className={cn(selectedGymId === gym.id && "bg-accent")}
                  >
                    {gym.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
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

        {/* User Menu */}
        <div className="p-3 border-t border-border">
          <button
            onClick={() => navigate("/")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground",
              !sidebarOpen && "justify-center"
            )}
          >
            <LogOut className="h-5 w-5" />
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
          <span className="font-semibold text-lg">Gym Portal</span>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Gym Selector (Mobile) */}
        {accessibleGyms.length > 0 && (
          <div className="p-3 border-b border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-sm truncate">
                      {selectedGym?.name || "Select Gym"}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {accessibleGyms.map((gym) => (
                  <DropdownMenuItem
                    key={gym.id}
                    onClick={() => setSelectedGymId(gym.id)}
                    className={cn(selectedGymId === gym.id && "bg-accent")}
                  >
                    {gym.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
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
            <LogOut className="h-5 w-5" />
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
              {navItems.find(item => location.pathname === item.to)?.label || "Gym Portal"}
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
          <Outlet context={{ selectedGymId, selectedGym }} />
        </main>
      </div>
    </div>
  );
}
