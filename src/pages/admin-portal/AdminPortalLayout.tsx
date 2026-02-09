import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRoles } from "@/hooks/useRoles";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Users,
  Shield,
  Building2,
  GraduationCap,
  Flag,
  Dumbbell,
  BookOpen,
  CreditCard,
  MessageCircle,
  Bell,
  FileUp,
  FileText,
  Settings,
  Search,
  Menu,
  X,
  ChevronLeft,
  LogOut,
  User,
  Music,
  Inbox,
  Mail,
  Footprints,
  Gift,
  Package,
  Apple,
  Radio,
} from "lucide-react";

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

const navItems: NavItem[] = [
  { to: "/admin-portal", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin-portal/inbox", icon: Inbox, label: "Support Inbox" },
  { to: "/admin-portal/registrations", icon: FileUp, label: "Registrations" },
  { to: "/admin-portal/users", icon: Users, label: "Users & Roles" },
  { to: "/admin-portal/uac", icon: Shield, label: "UAC & Groups" },
  { to: "/admin-portal/gyms", icon: Building2, label: "Gyms" },
  { to: "/admin-portal/coaches", icon: GraduationCap, label: "Coaches" },
  { to: "/admin-portal/events", icon: Flag, label: "Events" },
  { to: "/admin-portal/run-clubs", icon: Footprints, label: "Run Clubs" },
  { to: "/admin-portal/workouts", icon: Dumbbell, label: "Workouts & Programs" },
  { to: "/admin-portal/exercises", icon: BookOpen, label: "Exercise Library" },
  { to: "/admin-portal/playlists", icon: Music, label: "Playlists" },
  { to: "/admin-portal/rewards", icon: Gift, label: "Rewards & Offers" },
  { to: "/admin-portal/exercise-submissions", icon: Dumbbell, label: "Exercise Submissions" },
  { to: "/admin-portal/external-gym-submissions", icon: CreditCard, label: "External Gym Submissions" },
  { to: "/admin-portal/supplier-submissions", icon: Package, label: "Supplier Submissions" },
  { to: "/admin-portal/nutrition", icon: Apple, label: "Nutrition" },
  { to: "/admin-portal/billing", icon: CreditCard, label: "Billing" },
  { to: "/admin-portal/social", icon: MessageCircle, label: "Social Moderation" },
  { to: "/admin-portal/notifications", icon: Bell, label: "Notifications" },
  { to: "/admin-portal/imports", icon: FileUp, label: "Imports & Exports" },
  { to: "/admin-portal/logs", icon: FileText, label: "Logs & Audit" },
  { to: "/admin-portal/email-diagnostics", icon: Mail, label: "Email Diagnostics" },
  { to: "/admin-portal/connected-devices", icon: Radio, label: "Connected Devices" },
  { to: "/admin-portal/settings", icon: Settings, label: "Settings" },
];

export default function AdminPortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, isLoading: rolesLoading } = useRoles();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Check admin access
  useEffect(() => {
    if (!rolesLoading && !isAdmin()) {
      navigate("/");
    }
  }, [rolesLoading, isAdmin, navigate]);

  if (rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin()) {
    return null;
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/admin-portal/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const isActive = (path: string) => {
    if (path === "/admin-portal") {
      return location.pathname === "/admin-portal";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-border bg-card transition-all duration-300",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center px-4 border-b border-border">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          {sidebarOpen && (
            <span className="ml-3 font-bold text-lg">Admin Portal</span>
          )}
        </div>

        {/* Admin Identity */}
        {sidebarOpen && (
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-medium text-sm truncate">
                  {profile?.display_name || user?.email?.split("@")[0]}
                </p>
                <p className="text-xs text-muted-foreground">Administrator</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          {navItems.map((item) => (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors mb-1",
                isActive(item.to)
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground",
                !sidebarOpen && "justify-center"
              )}
              title={!sidebarOpen ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {sidebarOpen && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Back to App */}
        <div className="p-2 border-t border-border">
          <button
            onClick={() => navigate("/")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors",
              !sidebarOpen && "justify-center"
            )}
            title={!sidebarOpen ? "Back to App" : undefined}
          >
            <ChevronLeft className="h-5 w-5 shrink-0" />
            {sidebarOpen && (
              <span className="text-sm font-medium">Back to App</span>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border z-50 lg:hidden flex flex-col"
            >
              <div className="h-16 flex items-center justify-between px-4 border-b border-border">
                <span className="font-bold text-lg">Admin Portal</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Admin Identity (Mobile) */}
              <div className="p-3 border-b border-border">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-sm truncate">
                      {profile?.display_name || user?.email?.split("@")[0]}
                    </p>
                    <p className="text-xs text-muted-foreground">Administrator</p>
                  </div>
                </div>
              </div>

              <nav className="flex-1 overflow-y-auto p-2">
                {navItems.map((item) => (
                  <button
                    key={item.to}
                    onClick={() => {
                      navigate(item.to);
                      setMobileMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors mb-1",
                      isActive(item.to)
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                ))}
              </nav>
              <div className="p-2 border-t border-border">
                <button
                  onClick={() => navigate("/")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">Back to App</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 flex items-center gap-4 px-4 lg:px-6 border-b border-border bg-card">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Global Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search users, gyms, events, coaches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50"
              />
            </div>
          </form>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Admin Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden sm:block">
                  {profile?.display_name || user?.email?.split("@")[0]}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover">
              <DropdownMenuLabel>Admin Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User className="h-4 w-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/admin-portal/settings")}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
