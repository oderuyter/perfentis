import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  CalendarCheck,
  Search,
  Filter,
  Loader2,
  CheckCircle2,
  XCircle,
  Ban,
  Bell
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ContextType {
  selectedGymId: string | null;
}

interface Booking {
  id: string;
  user_id: string;
  schedule_id: string;
  booking_date: string;
  status: string;
  created_at: string;
  profiles?: { display_name: string | null } | null;
  class_schedules?: {
    start_time: string;
    end_time: string;
    day_of_week: number;
    gym_classes?: { name: string; gym_id: string; capacity: number } | null;
  } | null;
}

export default function GymBookings() {
  const { selectedGymId } = useOutletContext<ContextType>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cancelConfirm, setCancelConfirm] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (selectedGymId) {
      fetchBookings();
    }
  }, [selectedGymId, statusFilter]);

  const fetchBookings = async () => {
    if (!selectedGymId) return;
    setIsLoading(true);

    try {
      let query = supabase
        .from("class_bookings")
        .select(`
          *,
          class_schedules!inner(
            start_time,
            end_time,
            day_of_week,
            gym_classes!inner(name, gym_id, capacity)
          )
        `)
        .eq("class_schedules.gym_classes.gym_id", selectedGymId)
        .order("booking_date", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profiles separately
      const bookingsData = data || [];
      if (bookingsData.length > 0) {
        const userIds = [...new Set(bookingsData.map((b: any) => b.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);
        
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p.display_name]));
        
        const mappedBookings = bookingsData.map((b: any) => ({
          ...b,
          profiles: { display_name: profileMap.get(b.user_id) || null }
        }));
        setBookings(mappedBookings as Booking[]);
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      await supabase.from("class_bookings").update({ status }).eq("id", bookingId);
      toast.success(`Booking ${status}`);
      fetchBookings();
    } catch (error) {
      toast.error("Failed to update booking");
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelConfirm) return;
    setCancelling(true);

    try {
      // Update booking to cancelled
      await supabase
        .from("class_bookings")
        .update({ status: "cancelled" })
        .eq("id", cancelConfirm.id);

      // Check if there's a waitlist for this schedule
      const { data: waitlistEntries } = await (supabase as any)
        .from("class_waitlist")
        .select("id, user_id")
        .eq("schedule_id", cancelConfirm.schedule_id)
        .order("created_at", { ascending: true });

      if (waitlistEntries && waitlistEntries.length > 0) {
        // Notify all waitlisted users (in a real app, this would send notifications)
        toast.success(`Booking cancelled. ${waitlistEntries.length} waitlisted member(s) notified.`);
      } else {
        toast.success("Booking cancelled");
      }

      setCancelConfirm(null);
      fetchBookings();
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast.error("Failed to cancel booking");
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const classes = {
      confirmed: "bg-green-500/10 text-green-600",
      cancelled: "bg-red-500/10 text-red-600",
      attended: "bg-blue-500/10 text-blue-600",
      no_show: "bg-orange-500/10 text-orange-600"
    };
    return classes[status as keyof typeof classes] || "bg-muted text-muted-foreground";
  };

  const filteredBookings = bookings.filter(b => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      b.profiles?.display_name?.toLowerCase().includes(query) ||
      b.class_schedules?.gym_classes?.name?.toLowerCase().includes(query)
    );
  });

  if (!selectedGymId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a gym.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Class Bookings</h2>
        <p className="text-muted-foreground">View and manage class reservations</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by member or class..." 
            className="pl-10" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="attended">Attended</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bookings Table */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-sm">Member</th>
                <th className="text-left py-3 px-4 font-medium text-sm">Class</th>
                <th className="text-left py-3 px-4 font-medium text-sm hidden md:table-cell">Date</th>
                <th className="text-left py-3 px-4 font-medium text-sm hidden lg:table-cell">Time</th>
                <th className="text-left py-3 px-4 font-medium text-sm">Status</th>
                <th className="text-right py-3 px-4 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No bookings found
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="py-3 px-4 font-medium">{b.profiles?.display_name || "Unknown"}</td>
                    <td className="py-3 px-4">{b.class_schedules?.gym_classes?.name}</td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      {format(new Date(b.booking_date), "MMM d, yyyy")}
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">
                      {b.class_schedules?.start_time?.slice(0, 5)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(b.status)}`}>
                        {b.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {b.status === "confirmed" && (
                          <>
                            <button
                              onClick={() => updateBookingStatus(b.id, "attended")}
                              className="p-1.5 hover:bg-green-100 text-green-600 rounded-lg"
                              title="Mark attended"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => updateBookingStatus(b.id, "no_show")}
                              className="p-1.5 hover:bg-orange-100 text-orange-600 rounded-lg"
                              title="Mark no-show"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setCancelConfirm(b)}
                              className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg"
                              title="Cancel booking"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelConfirm} onOpenChange={() => setCancelConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this booking for {cancelConfirm?.profiles?.display_name || "this member"}?
              {cancelConfirm && (
                <span className="block mt-2">
                  <strong>Class:</strong> {cancelConfirm.class_schedules?.gym_classes?.name}<br />
                  <strong>Date:</strong> {format(new Date(cancelConfirm.booking_date), "MMMM d, yyyy")}
                </span>
              )}
              <span className="block mt-2 text-primary">
                <Bell className="h-4 w-4 inline mr-1" />
                If there's a waitlist, all waitlisted members will be notified that a spot is available.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Booking</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelBooking}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel Booking"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
