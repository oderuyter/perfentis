import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Wallet,
  Search,
  Download,
  Loader2,
  PoundSterling,
  TrendingUp,
  TrendingDown,
  Calendar
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

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
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const [exportOptions, setExportOptions] = useState({
    startDate: "",
    endDate: "",
    includeCompleted: true,
    includePending: true,
    includeRefunds: true,
    includeMemberDetails: true,
    includePaymentMethod: false
  });

  const stats = {
    totalRevenue: 2499.50,
    thisMonth: 849.97,
    refunds: 25.00,
    pending: 49.99
  };

  const handleExport = async () => {
    if (!exportOptions.startDate || !exportOptions.endDate) {
      toast.error("Please select date range");
      return;
    }

    setIsExporting(true);
    try {
      // Build CSV data
      const headers = ["Date", "Member", "Amount (£)", "Type", "Status"];
      if (exportOptions.includeMemberDetails) {
        headers.push("Email");
      }
      if (exportOptions.includePaymentMethod) {
        headers.push("Payment Method");
      }

      let filteredPayments = mockPayments.filter(p => {
        const date = new Date(p.date);
        const start = new Date(exportOptions.startDate);
        const end = new Date(exportOptions.endDate);
        if (date < start || date > end) return false;
        if (p.status === "completed" && !exportOptions.includeCompleted) return false;
        if (p.status === "pending" && !exportOptions.includePending) return false;
        if (p.type === "refund" && !exportOptions.includeRefunds) return false;
        return true;
      });

      const rows = filteredPayments.map(p => {
        const row = [p.date, p.member, Math.abs(p.amount).toFixed(2), p.type, p.status];
        if (exportOptions.includeMemberDetails) {
          row.push(`${p.member.toLowerCase().replace(' ', '.')}@example.com`);
        }
        if (exportOptions.includePaymentMethod) {
          row.push("Card");
        }
        return row;
      });

      const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payments-${exportOptions.startDate}-to-${exportOptions.endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${filteredPayments.length} payments`);
      setShowExportDialog(false);
    } catch (error) {
      toast.error("Failed to export");
    } finally {
      setIsExporting(false);
    }
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
        <button 
          onClick={() => setShowExportDialog(true)}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <PoundSterling className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">£{stats.totalRevenue.toFixed(2)}</p>
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
              <p className="text-2xl font-semibold">£{stats.thisMonth.toFixed(2)}</p>
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
              <p className="text-2xl font-semibold">£{stats.refunds.toFixed(2)}</p>
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
              <p className="text-2xl font-semibold">£{stats.pending.toFixed(2)}</p>
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
                    {p.amount < 0 ? "-" : "+"}£{Math.abs(p.amount).toFixed(2)}
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

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Payments</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={exportOptions.startDate}
                  onChange={(e) => setExportOptions({ ...exportOptions, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={exportOptions.endDate}
                  onChange={(e) => setExportOptions({ ...exportOptions, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Include Payment Types</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={exportOptions.includeCompleted}
                    onCheckedChange={(checked) => setExportOptions({ ...exportOptions, includeCompleted: !!checked })}
                  />
                  <span className="text-sm">Completed payments</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={exportOptions.includePending}
                    onCheckedChange={(checked) => setExportOptions({ ...exportOptions, includePending: !!checked })}
                  />
                  <span className="text-sm">Pending payments</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={exportOptions.includeRefunds}
                    onCheckedChange={(checked) => setExportOptions({ ...exportOptions, includeRefunds: !!checked })}
                  />
                  <span className="text-sm">Refunds</span>
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Additional Data</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={exportOptions.includeMemberDetails}
                    onCheckedChange={(checked) => setExportOptions({ ...exportOptions, includeMemberDetails: !!checked })}
                  />
                  <span className="text-sm">Member email addresses</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={exportOptions.includePaymentMethod}
                    onCheckedChange={(checked) => setExportOptions({ ...exportOptions, includePaymentMethod: !!checked })}
                  />
                  <span className="text-sm">Payment method</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => setShowExportDialog(false)}
                className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export CSV
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
