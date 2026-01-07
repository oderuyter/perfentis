import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Wallet,
  Search,
  Download,
  RefreshCcw,
  Loader2,
  DollarSign,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { Input } from "@/components/ui/input";
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

// Mock payment data
const mockPayments = [
  { id: "1", member: "John Smith", amount: 49.99, type: "subscription", status: "completed", date: "2026-01-07" },
  { id: "2", member: "Jane Doe", amount: 79.99, type: "subscription", status: "completed", date: "2026-01-06" },
  { id: "3", member: "Mike Johnson", amount: 49.99, type: "subscription", status: "pending", date: "2026-01-05" },
  { id: "4", member: "Sarah Wilson", amount: -25.00, type: "refund", status: "completed", date: "2026-01-04" },
];

export default function GymPayments() {
  const { selectedGymId } = useOutletContext<ContextType>();
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const stats = {
    totalRevenue: 2499.50,
    thisMonth: 849.97,
    refunds: 25.00,
    pending: 49.99
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
          <h2 className="text-2xl font-semibold">Payments & Refunds</h2>
          <p className="text-muted-foreground">Track revenue and process refunds</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted">
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">${stats.totalRevenue.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">${stats.thisMonth.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">This Month</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">${stats.refunds.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Refunds</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">${stats.pending.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="subscription">Subscription</SelectItem>
            <SelectItem value="refund">Refund</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payments Table */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-sm">Member</th>
                <th className="text-left py-3 px-4 font-medium text-sm">Amount</th>
                <th className="text-left py-3 px-4 font-medium text-sm hidden md:table-cell">Type</th>
                <th className="text-left py-3 px-4 font-medium text-sm">Status</th>
                <th className="text-left py-3 px-4 font-medium text-sm hidden lg:table-cell">Date</th>
                <th className="text-right py-3 px-4 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockPayments.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="py-3 px-4 font-medium">{p.member}</td>
                  <td className={`py-3 px-4 font-medium ${p.amount < 0 ? "text-red-600" : "text-green-600"}`}>
                    {p.amount < 0 ? "-" : "+"}${Math.abs(p.amount).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell capitalize">{p.type}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      p.status === "completed" ? "bg-green-500/10 text-green-600" :
                      p.status === "pending" ? "bg-orange-500/10 text-orange-600" :
                      "bg-red-500/10 text-red-600"
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">{p.date}</td>
                  <td className="py-3 px-4 text-right">
                    {p.type !== "refund" && p.status === "completed" && (
                      <button className="text-sm text-primary hover:underline">
                        Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
