import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CreditCard,
  Search,
  Plus,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ContextType {
  selectedGymId: string | null;
}

export default function GymMemberships() {
  const { selectedGymId } = useOutletContext<ContextType>();
  const [memberships, setMemberships] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (selectedGymId) {
      fetchMemberships();
    }
  }, [selectedGymId, statusFilter]);

  const fetchMemberships = async () => {
    if (!selectedGymId) return;
    setIsLoading(true);

    try {
      let query = supabase
        .from("memberships")
        .select(`
          *,
          profiles:user_id(display_name)
        `)
        .eq("gym_id", selectedGymId)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMemberships(data || []);
    } catch (error) {
      console.error("Error fetching memberships:", error);
      toast.error("Failed to load memberships");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenew = async (membershipId: string) => {
    try {
      const nextPayment = new Date();
      nextPayment.setMonth(nextPayment.getMonth() + 1);

      await supabase
        .from("memberships")
        .update({
          status: "active",
          next_payment_date: nextPayment.toISOString().split("T")[0],
          payment_status: "paid"
        })
        .eq("id", membershipId);

      toast.success("Membership renewed");
      fetchMemberships();
    } catch (error) {
      toast.error("Failed to renew membership");
    }
  };

  const handleCancel = async (membershipId: string) => {
    try {
      await supabase
        .from("memberships")
        .update({ status: "cancelled" })
        .eq("id", membershipId);

      toast.success("Membership cancelled");
      fetchMemberships();
    } catch (error) {
      toast.error("Failed to cancel membership");
    }
  };

  const filteredMemberships = memberships.filter((m) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      m.profiles?.display_name?.toLowerCase().includes(query) ||
      m.membership_number?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    const classes = {
      active: "bg-green-500/10 text-green-600",
      suspended: "bg-orange-500/10 text-orange-600",
      cancelled: "bg-red-500/10 text-red-600"
    };
    return classes[status as keyof typeof classes] || "bg-muted text-muted-foreground";
  };

  const getPaymentBadge = (status: string | null) => {
    const classes = {
      paid: "bg-green-500/10 text-green-600",
      pending: "bg-orange-500/10 text-orange-600",
      overdue: "bg-red-500/10 text-red-600"
    };
    return classes[status as keyof typeof classes] || "bg-muted text-muted-foreground";
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
          <h2 className="text-2xl font-semibold">Memberships</h2>
          <p className="text-muted-foreground">Manage subscription plans and renewals</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium">
          <Plus className="h-4 w-4" />
          New Signup
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-sm">Member</th>
                <th className="text-left py-3 px-4 font-medium text-sm hidden md:table-cell">Member #</th>
                <th className="text-left py-3 px-4 font-medium text-sm">Status</th>
                <th className="text-left py-3 px-4 font-medium text-sm hidden lg:table-cell">Tier</th>
                <th className="text-left py-3 px-4 font-medium text-sm hidden lg:table-cell">Payment</th>
                <th className="text-left py-3 px-4 font-medium text-sm hidden xl:table-cell">Next Payment</th>
                <th className="text-right py-3 px-4 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : filteredMemberships.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    No memberships found
                  </td>
                </tr>
              ) : (
                filteredMemberships.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="py-3 px-4 font-medium">{m.profiles?.display_name || "Unknown"}</td>
                    <td className="py-3 px-4 hidden md:table-cell font-mono text-sm">{m.membership_number || "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(m.status)}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell capitalize">{m.tier || "Standard"}</td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getPaymentBadge(m.payment_status)}`}>
                        {m.payment_status || "pending"}
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden xl:table-cell text-muted-foreground text-sm">
                      {m.next_payment_date ? format(new Date(m.next_payment_date), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 hover:bg-muted rounded-lg">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRenew(m.id)}>
                            <RefreshCcw className="h-4 w-4 mr-2" />
                            Renew
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCancel(m.id)} className="text-destructive">
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
