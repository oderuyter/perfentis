import { useState, useEffect } from "react";
import { Search, Loader2, CheckCircle, CalendarCheck, Users, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface ClassCheckinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gymId: string;
  onSuccess?: () => void;
}

interface TodaySchedule {
  id: string;
  start_time: string;
  end_time: string;
  gym_classes: { id: string; name: string };
}

interface ClassBooking {
  id: string;
  status: string;
  user_id: string;
  profiles: { display_name: string } | null;
}

export function ClassCheckinDialog({ 
  open, 
  onOpenChange, 
  gymId,
  onSuccess 
}: ClassCheckinDialogProps) {
  const [todaySchedules, setTodaySchedules] = useState<TodaySchedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [bookings, setBookings] = useState<ClassBooking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState<string | null>(null);
  const [checkedInCount, setCheckedInCount] = useState(0);

  useEffect(() => {
    if (open && gymId) {
      fetchTodaySchedules();
    }
  }, [open, gymId]);

  useEffect(() => {
    if (selectedScheduleId) {
      fetchBookings();
    }
  }, [selectedScheduleId]);

  const fetchTodaySchedules = async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      const dayOfWeek = today.getDay();
      
      const { data, error } = await supabase
        .from("class_schedules")
        .select(`
          id,
          start_time,
          end_time,
          gym_classes!inner(id, name, gym_id)
        `)
        .eq("gym_classes.gym_id", gymId)
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true)
        .order("start_time");

      if (error) throw error;
      setTodaySchedules((data || []) as unknown as TodaySchedule[]);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      toast.error("Failed to load today's classes");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBookings = async () => {
    if (!selectedScheduleId) return;
    
    setIsLoading(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("class_bookings")
        .select("id, status, user_id")
        .eq("schedule_id", selectedScheduleId)
        .eq("booking_date", today)
        .neq("status", "cancelled");

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = (data || []).map(b => b.user_id);
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);
        profiles = profileData || [];
      }

      const bookingsWithProfiles = (data || []).map((booking) => ({
        id: booking.id,
        status: booking.status,
        user_id: booking.user_id,
        profiles: profiles.find(p => p.id === booking.user_id) || null
      }));

      setBookings(bookingsWithProfiles as ClassBooking[]);
      setCheckedInCount(bookingsWithProfiles.filter(b => b.status === "attended").length);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckin = async (booking: ClassBooking) => {
    setIsCheckingIn(booking.id);
    try {
      const { error } = await supabase
        .from("class_bookings")
        .update({ status: "attended" })
        .eq("id", booking.id);

      if (error) throw error;

      toast.success(`${booking.profiles?.display_name || "Member"} checked in`);
      setBookings(prev => prev.map(b => 
        b.id === booking.id ? { ...b, status: "attended" } : b
      ));
      setCheckedInCount(prev => prev + 1);
      onSuccess?.();
    } catch (error) {
      console.error("Error checking in:", error);
      toast.error("Failed to check in member");
    } finally {
      setIsCheckingIn(null);
    }
  };

  const handleCheckAll = async () => {
    const pendingBookings = bookings.filter(b => b.status === "booked");
    if (pendingBookings.length === 0) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("class_bookings")
        .update({ status: "attended" })
        .in("id", pendingBookings.map(b => b.id));

      if (error) throw error;

      toast.success(`${pendingBookings.length} members checked in`);
      setBookings(prev => prev.map(b => ({ ...b, status: "attended" })));
      setCheckedInCount(bookings.length);
      onSuccess?.();
    } catch (error) {
      console.error("Error checking in all:", error);
      toast.error("Failed to check in members");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedSchedule = todaySchedules.find(s => s.id === selectedScheduleId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Class Check-in</DialogTitle>
          <DialogDescription>
            Check in members for today's classes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Class Selection */}
          <div className="space-y-2">
            <Label>Select Today's Class</Label>
            <Select value={selectedScheduleId} onValueChange={setSelectedScheduleId}>
              <SelectTrigger>
                <SelectValue placeholder={
                  isLoading ? "Loading..." : 
                  todaySchedules.length === 0 ? "No classes today" : 
                  "Select a class"
                } />
              </SelectTrigger>
              <SelectContent>
                {todaySchedules.map((schedule) => (
                  <SelectItem key={schedule.id} value={schedule.id}>
                    <div className="flex items-center gap-2">
                      <span>{schedule.gym_classes.name}</span>
                      <span className="text-muted-foreground">
                        {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Class Info */}
          {selectedSchedule && (
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{selectedSchedule.gym_classes.name}</h4>
                <span className="text-sm text-muted-foreground">
                  {selectedSchedule.start_time.slice(0, 5)} - {selectedSchedule.end_time.slice(0, 5)}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {bookings.length} booked
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  {checkedInCount} attended
                </span>
              </div>
            </div>
          )}

          {/* Bookings List */}
          {selectedScheduleId && (
            <>
              {bookings.length > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={handleCheckAll}
                    disabled={isLoading || bookings.every(b => b.status === "attended")}
                    className="text-sm text-primary hover:underline disabled:opacity-50"
                  >
                    Check in all ({bookings.filter(b => b.status === "booked").length})
                  </button>
                </div>
              )}

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : bookings.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <CalendarCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No bookings for this class</p>
                </div>
              ) : (
                <div className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-y-auto">
                  {bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">{booking.profiles?.display_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                          Booked
                        </p>
                      </div>
                      {booking.status === "attended" ? (
                        <span className="flex items-center gap-1 text-sm text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          Attended
                        </span>
                      ) : (
                        <button
                          onClick={() => handleCheckin(booking)}
                          disabled={isCheckingIn === booking.id}
                          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                        >
                          {isCheckingIn === booking.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Check In"
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}