import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  BarChart3,
  Users,
  TrendingUp,
  Calendar,
  Download,
  DollarSign
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ContextType {
  selectedGymId: string | null;
}

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
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-sm text-green-600 font-medium">+{reports.revenue.growth}%</span>
          </div>
          <p className="text-2xl font-semibold">${reports.revenue.thisMonth.toFixed(0)}</p>
          <p className="text-sm text-muted-foreground">Revenue This Month</p>
          <div className="mt-3 pt-3 border-t border-border text-sm text-muted-foreground">
            Total: ${reports.revenue.total.toFixed(0)}
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

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold mb-4">Membership Growth</h3>
          <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-2" />
              <p>Chart visualization</p>
              <p className="text-sm">Coming soon</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold mb-4">Revenue Trend</h3>
          <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-2" />
              <p>Chart visualization</p>
              <p className="text-sm">Coming soon</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold mb-4">Class Attendance</h3>
          <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-2" />
              <p>Chart visualization</p>
              <p className="text-sm">Coming soon</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold mb-4">Check-in Distribution</h3>
          <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-2" />
              <p>Chart visualization</p>
              <p className="text-sm">Coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
