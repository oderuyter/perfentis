import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  TrendingUp,
  TrendingDown,
  CalendarCheck,
  CreditCard,
  Activity,
  Clock,
  DollarSign
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

interface ContextType {
  selectedGymId: string | null;
  selectedGym: { id: string; name: string } | undefined;
}

interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  newMembersThisMonth: number;
  todayCheckins: number;
  classesToday: number;
  pendingPayments: number;
}

export default function GymDashboard() {
  const { selectedGymId, selectedGym } = useOutletContext<ContextType>();
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeMembers: 0,
    newMembersThisMonth: 0,
    todayCheckins: 0,
    classesToday: 0,
    pendingPayments: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!selectedGymId) return;
    fetchDashboardData();
  }, [selectedGymId]);

  const fetchDashboardData = async () => {
    if (!selectedGymId) return;
    setIsLoading(true);

    try {
      // Fetch membership stats
      const { data: memberships } = await supabase
        .from("memberships")
        .select("id, status, created_at, payment_status")
        .eq("gym_id", selectedGymId);

      const today = new Date();
      const monthStart = startOfMonth(today);

      const totalMembers = memberships?.length || 0;
      const activeMembers = memberships?.filter(m => m.status === "active").length || 0;
      const newMembersThisMonth = memberships?.filter(
        m => new Date(m.created_at) >= monthStart
      ).length || 0;
      const pendingPayments = memberships?.filter(
        m => m.payment_status === "pending"
      ).length || 0;

      // Fetch today's check-ins
      const todayStart = format(today, "yyyy-MM-dd");
      const { count: todayCheckins } = await supabase
        .from("membership_checkins")
        .select("id, memberships!inner(gym_id)", { count: "exact", head: true })
        .eq("memberships.gym_id", selectedGymId)
        .gte("checked_in_at", todayStart);

      // Fetch today's class count
      const dayOfWeek = today.getDay();
      const { count: classesToday } = await supabase
        .from("class_schedules")
        .select("id, gym_classes!inner(gym_id)", { count: "exact", head: true })
        .eq("gym_classes.gym_id", selectedGymId)
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true);

      setStats({
        totalMembers,
        activeMembers,
        newMembersThisMonth,
        todayCheckins: todayCheckins || 0,
        classesToday: classesToday || 0,
        pendingPayments
      });

      // Recent activity (last 10 checkins)
      const { data: recentCheckins } = await supabase
        .from("membership_checkins")
        .select(`
          id,
          checked_in_at,
          memberships!inner(
            gym_id,
            membership_number,
            profiles:user_id(display_name)
          )
        `)
        .eq("memberships.gym_id", selectedGymId)
        .order("checked_in_at", { ascending: false })
        .limit(10);

      setRecentActivity(recentCheckins || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      label: "Total Members",
      value: stats.totalMembers,
      icon: Users,
      color: "bg-primary/10 text-primary"
    },
    {
      label: "Active Members",
      value: stats.activeMembers,
      icon: Activity,
      color: "bg-green-500/10 text-green-600"
    },
    {
      label: "New This Month",
      value: stats.newMembersThisMonth,
      icon: TrendingUp,
      color: "bg-blue-500/10 text-blue-600"
    },
    {
      label: "Today's Check-ins",
      value: stats.todayCheckins,
      icon: CalendarCheck,
      color: "bg-orange-500/10 text-orange-600"
    },
    {
      label: "Classes Today",
      value: stats.classesToday,
      icon: Clock,
      color: "bg-purple-500/10 text-purple-600"
    },
    {
      label: "Pending Payments",
      value: stats.pendingPayments,
      icon: CreditCard,
      color: "bg-red-500/10 text-red-600"
    }
  ];

  if (!selectedGymId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a gym to view the dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h2 className="text-2xl font-semibold">
          Welcome back{selectedGym ? `, ${selectedGym.name}` : ""}
        </h2>
        <p className="text-muted-foreground mt-1">
          Here's what's happening at your gym today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card rounded-xl p-4 border border-border shadow-card"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-semibold">{isLoading ? "—" : stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Check-ins */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-xl border border-border shadow-card"
        >
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Recent Check-ins</h3>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-2">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {activity.memberships?.profiles?.display_name || "Member"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          #{activity.memberships?.membership_number}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(activity.checked_in_at), "h:mm a")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No check-ins today
              </p>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-xl border border-border shadow-card"
        >
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Quick Actions</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            <button className="p-4 bg-muted/50 hover:bg-muted rounded-lg text-left transition-colors">
              <Users className="h-5 w-5 mb-2 text-primary" />
              <p className="font-medium text-sm">Add Member</p>
              <p className="text-xs text-muted-foreground">Onboard new member</p>
            </button>
            <button className="p-4 bg-muted/50 hover:bg-muted rounded-lg text-left transition-colors">
              <CalendarCheck className="h-5 w-5 mb-2 text-primary" />
              <p className="font-medium text-sm">Manual Check-in</p>
              <p className="text-xs text-muted-foreground">Check in a member</p>
            </button>
            <button className="p-4 bg-muted/50 hover:bg-muted rounded-lg text-left transition-colors">
              <Clock className="h-5 w-5 mb-2 text-primary" />
              <p className="font-medium text-sm">Add Class</p>
              <p className="text-xs text-muted-foreground">Schedule a class</p>
            </button>
            <button className="p-4 bg-muted/50 hover:bg-muted rounded-lg text-left transition-colors">
              <DollarSign className="h-5 w-5 mb-2 text-primary" />
              <p className="font-medium text-sm">Process Payment</p>
              <p className="text-xs text-muted-foreground">Record a payment</p>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
