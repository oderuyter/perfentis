import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  BarChart3,
  Users,
  TrendingUp,
  Calendar,
  Download,
  PoundSterling
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface ContextType {
  selectedGymId: string | null;
}

// Mock data for charts
const membershipGrowthData = [
  { month: "Jan", members: 120, new: 15, churned: 5 },
  { month: "Feb", members: 130, new: 18, churned: 8 },
  { month: "Mar", members: 138, new: 12, churned: 4 },
  { month: "Apr", members: 145, new: 14, churned: 7 },
  { month: "May", members: 150, new: 10, churned: 5 },
  { month: "Jun", members: 156, new: 12, churned: 6 }
];

const revenueData = [
  { month: "Jan", revenue: 6500 },
  { month: "Feb", revenue: 7200 },
  { month: "Mar", revenue: 7000 },
  { month: "Apr", revenue: 7500 },
  { month: "May", revenue: 7800 },
  { month: "Jun", revenue: 7850 }
];

const classAttendanceData = [
  { name: "HIIT", attendance: 145 },
  { name: "Yoga", attendance: 120 },
  { name: "Spin", attendance: 98 },
  { name: "Weights", attendance: 85 },
  { name: "Boxing", attendance: 72 }
];

const checkinDistributionData = [
  { hour: "6am", checkins: 25 },
  { hour: "8am", checkins: 45 },
  { hour: "10am", checkins: 32 },
  { hour: "12pm", checkins: 38 },
  { hour: "2pm", checkins: 22 },
  { hour: "4pm", checkins: 35 },
  { hour: "6pm", checkins: 55 },
  { hour: "8pm", checkins: 42 },
  { hour: "10pm", checkins: 18 }
];

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function GymReports() {
  const { selectedGymId } = useOutletContext<ContextType>();
  const [period, setPeriod] = useState("month");

  // Mock data
  const reports = {
    members: { total: 156, new: 12, churned: 3, growth: 5.8 },
    revenue: { total: 7849.50, thisMonth: 2499.50, growth: 12.3 },
    classes: { total: 48, attendance: 412, avgAttendance: 8.6 },
    checkins: { total: 892, daily: 32, peakHour: "6:00 PM" }
  };

  if (!selectedGymId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a gym.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Reports</h2>
          <p className="text-muted-foreground">Analytics and insights for your gym</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm text-green-600 font-medium">+{reports.members.growth}%</span>
          </div>
          <p className="text-2xl font-semibold">{reports.members.total}</p>
          <p className="text-sm text-muted-foreground">Total Members</p>
          <div className="mt-3 pt-3 border-t border-border flex justify-between text-sm">
            <span className="text-green-600">+{reports.members.new} new</span>
            <span className="text-red-600">-{reports.members.churned} left</span>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <PoundSterling className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-sm text-green-600 font-medium">+{reports.revenue.growth}%</span>
          </div>
          <p className="text-2xl font-semibold">£{reports.revenue.thisMonth.toFixed(0)}</p>
          <p className="text-sm text-muted-foreground">Revenue This Month</p>
          <div className="mt-3 pt-3 border-t border-border text-sm text-muted-foreground">
            Total: £{reports.revenue.total.toFixed(0)}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-semibold">{reports.classes.total}</p>
          <p className="text-sm text-muted-foreground">Classes This Month</p>
          <div className="mt-3 pt-3 border-t border-border text-sm text-muted-foreground">
            Avg. {reports.classes.avgAttendance} per class
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
          </div>
          <p className="text-2xl font-semibold">{reports.checkins.total}</p>
          <p className="text-sm text-muted-foreground">Check-ins This Month</p>
          <div className="mt-3 pt-3 border-t border-border text-sm text-muted-foreground">
            Peak: {reports.checkins.peakHour}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Membership Growth Chart */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold mb-4">Membership Growth</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={membershipGrowthData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="members" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                  name="Total Members"
                />
                <Line 
                  type="monotone" 
                  dataKey="new" 
                  stroke="hsl(142, 76%, 36%)" 
                  strokeWidth={2}
                  name="New"
                />
                <Line 
                  type="monotone" 
                  dataKey="churned" 
                  stroke="hsl(0, 84%, 60%)" 
                  strokeWidth={2}
                  name="Churned"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Trend Chart */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold mb-4">Revenue Trend (£)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(value) => `£${value}`} />
                <Tooltip 
                  formatter={(value: number) => [`£${value}`, 'Revenue']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="revenue" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Class Attendance Chart */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold mb-4">Class Attendance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={classAttendanceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="attendance"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {classAttendanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Check-in Distribution Chart */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold mb-4">Check-in Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={checkinDistributionData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="hour" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="checkins" 
                  fill="hsl(var(--chart-2))" 
                  radius={[4, 4, 0, 0]}
                  name="Check-ins"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
