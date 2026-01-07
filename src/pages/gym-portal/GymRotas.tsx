import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function GymRotas() {
  const { selectedGymId } = useOutletContext<ContextType>();
  const [staff, setStaff] = useState<any[]>([]);
  const [rotas, setRotas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showAddShift, setShowAddShift] = useState(false);
  const [newShift, setNewShift] = useState({
    staffId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "17:00"
  });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (selectedGymId) {
      fetchData();
    }
  }, [selectedGymId, weekStart]);

  const fetchData = async () => {
    if (!selectedGymId) return;
    setIsLoading(true);

    try {
      // Fetch staff
      const { data: staffData } = await supabase
        .from("gym_staff")
        .select("*, profiles:user_id(display_name)")
        .eq("gym_id", selectedGymId)
        .eq("is_active", true);

      setStaff(staffData || []);

      // Fetch rotas for the week
      const weekEnd = addDays(weekStart, 6);
      const { data: rotaData } = await supabase
        .from("staff_rotas")
        .select("*, gym_staff!inner(profiles:user_id(display_name))")
        .eq("gym_id", selectedGymId)
        .gte("shift_date", format(weekStart, "yyyy-MM-dd"))
        .lte("shift_date", format(weekEnd, "yyyy-MM-dd"));

      setRotas(rotaData || []);
    } catch (error) {
      console.error("Error fetching rotas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddShift = async () => {
    if (!selectedGymId || !newShift.staffId) return;
    setAdding(true);

    try {
      await supabase.from("staff_rotas").insert({
        gym_id: selectedGymId,
        staff_id: newShift.staffId,
        shift_date: newShift.date,
        start_time: newShift.startTime,
        end_time: newShift.endTime
      });

      toast.success("Shift added");
      setShowAddShift(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to add shift");
    } finally {
      setAdding(false);
    }
  };

  const getShiftsForDay = (dayIndex: number) => {
    const date = format(addDays(weekStart, dayIndex), "yyyy-MM-dd");
    return rotas.filter(r => r.shift_date === date);
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
          <h2 className="text-2xl font-semibold">Staff Rotas</h2>
          <p className="text-muted-foreground">Manage staff schedules and shifts</p>
        </div>
        <button
          onClick={() => setShowAddShift(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
        >
          <Plus className="h-4 w-4" />
          Add Shift
        </button>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-card rounded-xl border border-border p-4">
        <button
          onClick={() => setWeekStart(subWeeks(weekStart, 1))}
          className="p-2 hover:bg-muted rounded-lg"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="font-semibold">
            {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </p>
        </div>
        <button
          onClick={() => setWeekStart(addWeeks(weekStart, 1))}
          className="p-2 hover:bg-muted rounded-lg"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Weekly Rota Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {DAYS.map((day, i) => (
              <div key={day} className="p-3 text-center border-r border-border last:border-0">
                <p className="font-medium text-sm">{day}</p>
                <p className="text-xs text-muted-foreground">
                  {format(addDays(weekStart, i), "d")}
                </p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 min-h-[300px]">
            {DAYS.map((_, i) => {
              const shifts = getShiftsForDay(i);
              return (
                <div key={i} className="p-2 border-r border-border last:border-0 space-y-1">
                  {shifts.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">—</p>
                  ) : (
                    shifts.map((shift) => (
                      <div
                        key={shift.id}
                        className="p-2 bg-primary/10 rounded-lg text-xs"
                      >
                        <p className="font-medium truncate">
                          {shift.gym_staff?.profiles?.display_name || "Staff"}
                        </p>
                        <p className="text-muted-foreground">
                          {shift.start_time?.slice(0, 5)} - {shift.end_time?.slice(0, 5)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Shift Dialog */}
      <Dialog open={showAddShift} onOpenChange={setShowAddShift}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Staff Member</Label>
              <Select value={newShift.staffId} onValueChange={(v) => setNewShift({ ...newShift, staffId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.profiles?.display_name || "Staff"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={newShift.date}
                onChange={(e) => setNewShift({ ...newShift, date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={newShift.startTime}
                  onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={newShift.endTime}
                  onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                />
              </div>
            </div>
            <button
              onClick={handleAddShift}
              disabled={adding || !newShift.staffId}
              className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Add Shift"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
