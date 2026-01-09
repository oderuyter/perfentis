import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Building2,
  GraduationCap,
  Flag,
  CreditCard,
  MessageCircle,
  AlertTriangle,
  Plus,
  UserPlus,
  Send,
  FileUp,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";
import { format } from "date-fns";

interface DashboardStats {
  totalUsers: number;
  newUsers7d: number;
  newUsers30d: number;
  activeGyms: number;
  totalMemberships: number;
  activeCoaches: number;
  activeClients: number;
  upcomingEvents: number;
  liveEvents: number;
  flaggedPosts: number;
  systemErrors: number;
}

interface AuditLogEntry {
  id: string;
  created_at: string;
  action: string;
  message: string;
  category: string;
  severity: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    newUsers7d: 0,
    newUsers30d: 0,
    activeGyms: 0,
    totalMemberships: 0,
    activeCoaches: 0,
    activeClients: 0,
    upcomingEvents: 0,
    liveEvents: 0,
    flaggedPosts: 0,
    systemErrors: 0,
  });
  const [recentLogs, setRecentLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Fetch all stats in parallel
      const [
        profilesRes,
        profiles7dRes,
        profiles30dRes,
        gymsRes,
        membershipsRes,
        coachesRes,
        coachClientsRes,
        upcomingEventsRes,
        liveEventsRes,
        flaggedPostsRes,
        errorsRes,
        logsRes,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("created_at", sevenDaysAgo.toISOString()),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("created_at", thirtyDaysAgo.toISOString()),
        supabase
          .from("gyms")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabase.from("memberships").select("id", { count: "exact", head: true }),
        supabase.from("coaches").select("id", { count: "exact", head: true }),
        supabase
          .from("coach_clients")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("status", "published")
          .gte("start_date", now.toISOString()),
        supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("status", "live"),
        supabase
          .from("social_posts")
          .select("id", { count: "exact", head: true })
          .eq("is_flagged", true)
          .eq("is_removed", false),
        supabase
          .from("audit_logs")
          .select("id", { count: "exact", head: true })
          .eq("severity", "error")
          .gte("created_at", sevenDaysAgo.toISOString()),
        supabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      setStats({
        totalUsers: profilesRes.count || 0,
        newUsers7d: profiles7dRes.count || 0,
        newUsers30d: profiles30dRes.count || 0,
        activeGyms: gymsRes.count || 0,
        totalMemberships: membershipsRes.count || 0,
        activeCoaches: coachesRes.count || 0,
        activeClients: coachClientsRes.count || 0,
        upcomingEvents: upcomingEventsRes.count || 0,
        liveEvents: liveEventsRes.count || 0,
        flaggedPosts: flaggedPostsRes.count || 0,
        systemErrors: errorsRes.count || 0,
      });

      if (logsRes.data) {
        setRecentLogs(logsRes.data as AuditLogEntry[]);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    trend,
    trendLabel,
    onClick,
  }: {
    title: string;
    value: number;
    icon: React.ElementType;
    trend?: "up" | "down";
    trendLabel?: string;
    onClick?: () => void;
  }) => (
    <Card
      className={onClick ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        {trendLabel && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            {trend === "up" ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : trend === "down" ? (
              <TrendingDown className="h-3 w-3 text-red-500" />
            ) : null}
            {trendLabel}
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and quick actions</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          trend="up"
          trendLabel={`+${stats.newUsers7d} this week`}
          onClick={() => navigate("/admin/users")}
        />
        <StatCard
          title="Active Gyms"
          value={stats.activeGyms}
          icon={Building2}
          trendLabel={`${stats.totalMemberships} memberships`}
          onClick={() => navigate("/admin/gyms")}
        />
        <StatCard
          title="Coaches"
          value={stats.activeCoaches}
          icon={GraduationCap}
          trendLabel={`${stats.activeClients} active clients`}
          onClick={() => navigate("/admin/coaches")}
        />
        <StatCard
          title="Upcoming Events"
          value={stats.upcomingEvents}
          icon={Flag}
          trendLabel={`${stats.liveEvents} live now`}
          onClick={() => navigate("/admin/events")}
        />
        <StatCard
          title="Flagged Content"
          value={stats.flaggedPosts}
          icon={MessageCircle}
          onClick={() => navigate("/admin/social")}
        />
        <StatCard
          title="System Errors"
          value={stats.systemErrors}
          icon={AlertTriangle}
          trendLabel="Last 7 days"
          onClick={() => navigate("/admin/logs?severity=error")}
        />
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-2"
              onClick={() => navigate("/admin/users?action=invite")}
            >
              <UserPlus className="h-5 w-5" />
              <span className="text-xs">Invite User</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-2"
              onClick={() => navigate("/admin/users?action=assign-role")}
            >
              <Users className="h-5 w-5" />
              <span className="text-xs">Assign Role</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-2"
              onClick={() => navigate("/admin/gyms?action=create")}
            >
              <Building2 className="h-5 w-5" />
              <span className="text-xs">Create Gym</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-2"
              onClick={() => navigate("/admin/events?action=create")}
            >
              <Flag className="h-5 w-5" />
              <span className="text-xs">Create Event</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-2"
              onClick={() => navigate("/admin/notifications?action=create")}
            >
              <Send className="h-5 w-5" />
              <span className="text-xs">Send Notification</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-2"
              onClick={() => navigate("/admin/imports")}
            >
              <FileUp className="h-5 w-5" />
              <span className="text-xs">Import CSV</span>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Admin Actions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Admin Actions</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/logs")}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No recent activity
              </p>
            ) : (
              <div className="space-y-3">
                {recentLogs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 text-sm"
                  >
                    <Activity className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{log.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <Badge
                      variant={
                        log.severity === "error"
                          ? "destructive"
                          : log.severity === "warn"
                          ? "secondary"
                          : "outline"
                      }
                      className="shrink-0"
                    >
                      {log.category}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Revenue Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Revenue tracking coming soon</p>
            <p className="text-sm">Integrate with payment provider to view metrics</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
