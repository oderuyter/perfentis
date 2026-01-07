import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  Mail,
  Calendar,
  ClipboardCheck,
  TrendingUp,
  DollarSign,
  Clock,
  AlertCircle,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Coach {
  id: string;
  display_name: string;
}

interface DashboardStats {
  activeClients: number;
  pendingInvites: number;
  upcomingAppointments: number;
  overdueCheckins: number;
  activePlans: number;
  monthlyRevenue: number;
}

export default function CoachDashboard() {
  const { coach } = useOutletContext<{ coach: Coach }>();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    activeClients: 0,
    pendingInvites: 0,
    upcomingAppointments: 0,
    overdueCheckins: 0,
    activePlans: 0,
    monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (coach?.id) {
      fetchStats();
    }
  }, [coach?.id]);

  const fetchStats = async () => {
    if (!coach?.id) return;

    try {
      // Fetch active clients
      const { count: clientCount } = await supabase
        .from("coach_clients")
        .select("*", { count: "exact", head: true })
        .eq("coach_id", coach.id)
        .eq("status", "active");

      // Fetch pending invitations
      const { count: inviteCount } = await supabase
        .from("coach_invitations")
        .select("*", { count: "exact", head: true })
        .eq("coach_id", coach.id)
        .eq("status", "pending");

      // Fetch upcoming appointments (next 7 days)
      const { count: appointmentCount } = await supabase
        .from("coach_appointments")
        .select("*", { count: "exact", head: true })
        .eq("coach_id", coach.id)
        .eq("status", "scheduled")
        .gte("start_time", new Date().toISOString())
        .lte("start_time", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

      // Fetch overdue check-ins
      const { count: checkinCount } = await supabase
        .from("client_checkins")
        .select("*, coach_clients!inner(coach_id)", { count: "exact", head: true })
        .eq("coach_clients.coach_id", coach.id)
        .eq("status", "overdue");

      // Fetch active plans
      const { count: planCount } = await supabase
        .from("client_plan_assignments")
        .select("*, coach_clients!inner(coach_id)", { count: "exact", head: true })
        .eq("coach_clients.coach_id", coach.id)
        .eq("status", "active");

      // Fetch monthly revenue (paid invoices this month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: revenueData } = await supabase
        .from("coach_invoices")
        .select("amount")
        .eq("coach_id", coach.id)
        .eq("status", "paid")
        .gte("paid_at", startOfMonth.toISOString());

      const monthlyRevenue = revenueData?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;

      setStats({
        activeClients: clientCount || 0,
        pendingInvites: inviteCount || 0,
        upcomingAppointments: appointmentCount || 0,
        overdueCheckins: checkinCount || 0,
        activePlans: planCount || 0,
        monthlyRevenue,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Active Clients",
      value: stats.activeClients,
      icon: Users,
      to: "/coach-portal/clients",
      color: "text-blue-500",
    },
    {
      title: "Pending Invites",
      value: stats.pendingInvites,
      icon: Mail,
      to: "/coach-portal/invitations",
      color: "text-amber-500",
    },
    {
      title: "Upcoming Appointments",
      value: stats.upcomingAppointments,
      icon: Calendar,
      to: "/coach-portal/calendar",
      color: "text-green-500",
    },
    {
      title: "Overdue Check-ins",
      value: stats.overdueCheckins,
      icon: AlertCircle,
      to: "/coach-portal/checkins",
      color: "text-red-500",
    },
    {
      title: "Active Plans",
      value: stats.activePlans,
      icon: TrendingUp,
      to: "/coach-portal/plans",
      color: "text-purple-500",
    },
    {
      title: "Revenue (MTD)",
      value: `$${stats.monthlyRevenue.toLocaleString()}`,
      icon: DollarSign,
      to: "/coach-portal/financials",
      color: "text-emerald-500",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-2xl font-semibold">
          Welcome back, {coach?.display_name?.split(" ")[0] || "Coach"}
        </h2>
        <p className="text-muted-foreground mt-1">
          Here's your coaching overview for today
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, idx) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(card.to)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-semibold mt-1">{card.value}</p>
                  </div>
                  <div className={`h-10 w-10 rounded-full bg-muted flex items-center justify-center ${card.color}`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              onClick={() => navigate("/coach-portal/invitations")}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <span>Invite New Client</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => navigate("/coach-portal/calendar")}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span>Schedule Appointment</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => navigate("/coach-portal/plans")}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <span>Create Training Plan</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}