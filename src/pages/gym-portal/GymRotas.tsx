import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Copy,
  Repeat,
  Trash2,
  Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ContextType {
  selectedGymId: string | null;
}

interface StaffMember {
  id: string;
  user_id: string;
  position: string | null;
  name: string | null;
  profiles: {
    display_name: string | null;
  } | null;
}

interface ShiftPattern {
  id: string;
  name: string;
  pattern: { day: number; start_time: string; end_time: string }[];
}

interface Shift {
  id: string;
  staff_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  gym_staff: {
    name: string | null;
    profiles: {
      display_name: string | null;
    } | null;
  } | null;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function GymRotas() {
  const { selectedGymId } = useOutletContext<ContextType>();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [rotas, setRotas] = useState<Shift[]>([]);
  const [patterns, setPatterns] = useState<ShiftPattern[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showAddShift, setShowAddShift] = useState(false);
  const [showAddPattern, setShowAddPattern] = useState(false);
  const [showCloneWeek, setShowCloneWeek] = useState(false);
  const [newShift, setNewShift] = useState({
    staffId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "17:00",
    notes: ""
  });
  const [newPattern, setNewPattern] = useState({
    name: "",
    staffId: ""
  });
  const [cloneTargetWeeks, setCloneTargetWeeks] = useState<number[]>([1]);
  const [adding, setAdding] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [activeTab, setActiveTab] = useState("schedule");

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
      const { data: staffData, error: staffError } = await (supabase as any)
        .from("gym_staff")
        .select("id, user_id, position, name")
        .eq("gym_id", selectedGymId)
        .eq("is_active", true);

      if (staffError) throw staffError;
      
      // Fetch profiles for staff
      const staffWithProfiles = await Promise.all((staffData || []).map(async (s: any) => {
        if (s.user_id) {
          const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", s.user_id).single();
          return { ...s, profiles: profile };
        }
        return { ...s, profiles: null };
      }));
      setStaff(staffWithProfiles as StaffMember[]);

      // Fetch rotas for the week
      const weekEnd = addDays(weekStart, 6);
      const { data: rotaData, error: rotaError } = await (supabase as any)
        .from("staff_rotas")
        .select("*, gym_staff!inner(name)")
        .eq("gym_id", selectedGymId)
        .gte("shift_date", format(weekStart, "yyyy-MM-dd"))
        .lte("shift_date", format(weekEnd, "yyyy-MM-dd"));

      if (rotaError) throw rotaError;
      setRotas((rotaData || []).map((r: any) => ({ ...r, gym_staff: { ...r.gym_staff, profiles: null } })) as Shift[]);

      // Fetch shift patterns
      const { data: patternData } = await (supabase as any)
        .from("staff_shift_patterns")
        .select("*")
        .eq("gym_id", selectedGymId)
        .eq("is_active", true);

      const mappedPatterns = (patternData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        pattern: p.pattern_data || []
      }));
      setPatterns(mappedPatterns);
    } catch (error) {
      console.error("Error fetching rotas:", error);
      toast.error("Failed to load schedule");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddShift = async () => {
    if (!selectedGymId || !newShift.staffId) return;
    setAdding(true);

    try {
      const { error } = await supabase.from("staff_rotas").insert({
        gym_id: selectedGymId,
        staff_id: newShift.staffId,
        shift_date: newShift.date,
        start_time: newShift.startTime,
        end_time: newShift.endTime,
        notes: newShift.notes || null
      });

      if (error) throw error;

      toast.success("Shift added");
      setShowAddShift(false);
      setNewShift({
        staffId: "",
        date: format(new Date(), "yyyy-MM-dd"),
        startTime: "09:00",
        endTime: "17:00",
        notes: ""
      });
      fetchData();
    } catch (error) {
      toast.error("Failed to add shift");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    try {
      const { error } = await supabase
        .from("staff_rotas")
        .delete()
        .eq("id", shiftId);

      if (error) throw error;
      toast.success("Shift removed");
      fetchData();
    } catch (error) {
      toast.error("Failed to remove shift");
    }
  };

  const handleCloneWeek = async () => {
    if (!selectedGymId || cloneTargetWeeks.length === 0) return;
    setCloning(true);

    try {
      const allShifts: any[] = [];
      
      for (const weekOffset of cloneTargetWeeks) {
        const shiftsToClone = rotas.map(shift => ({
          gym_id: selectedGymId,
          staff_id: shift.staff_id,
          shift_date: format(addWeeks(new Date(shift.shift_date), weekOffset), "yyyy-MM-dd"),
          start_time: shift.start_time,
          end_time: shift.end_time,
          notes: shift.notes
        }));
        allShifts.push(...shiftsToClone);
      }

      if (allShifts.length === 0) {
        toast.error("No shifts to clone");
        return;
      }

      const { error } = await supabase
        .from("staff_rotas")
        .insert(allShifts);

      if (error) throw error;

      toast.success(`Cloned ${rotas.length} shifts to ${cloneTargetWeeks.length} week(s)`);
      setShowCloneWeek(false);
      setCloneTargetWeeks([1]);
    } catch (error) {
      toast.error("Failed to clone shifts");
    } finally {
      setCloning(false);
    }
  };

  const handleCreatePattern = async () => {
    if (!selectedGymId || !newPattern.name) return;
    setAdding(true);

    try {
      // Create pattern from current week's shifts for selected staff
      const staffShifts = newPattern.staffId && newPattern.staffId !== "all"
        ? rotas.filter(r => r.staff_id === newPattern.staffId)
        : rotas;

      const patternData = staffShifts.map(shift => ({
        day: new Date(shift.shift_date).getDay(),
        start_time: shift.start_time,
        end_time: shift.end_time
      }));

      const { error } = await supabase.from("staff_shift_patterns").insert({
        gym_id: selectedGymId,
        name: newPattern.name,
        pattern_data: patternData
      });

      if (error) throw error;

      toast.success("Shift pattern created");
      setShowAddPattern(false);
      setNewPattern({ name: "", staffId: "" });
      fetchData();
    } catch (error) {
      toast.error("Failed to create pattern");
    } finally {
      setAdding(false);
    }
  };

  const applyPattern = async (pattern: ShiftPattern, staffId: string) => {
    if (!selectedGymId) return;

    try {
      const shifts = pattern.pattern.map(p => {
        // Find the date in the current week for this day
        const dayOffset = p.day === 0 ? 6 : p.day - 1; // Adjust for Monday start
        return {
          gym_id: selectedGymId,
          staff_id: staffId,
          shift_date: format(addDays(weekStart, dayOffset), "yyyy-MM-dd"),
          start_time: p.start_time,
          end_time: p.end_time
        };
      });

      const { error } = await supabase.from("staff_rotas").insert(shifts);

      if (error) throw error;

      toast.success("Pattern applied");
      fetchData();
    } catch (error) {
      toast.error("Failed to apply pattern");
    }
  };

  const getShiftsForDay = (dayIndex: number) => {
    const date = format(addDays(weekStart, dayIndex), "yyyy-MM-dd");
    return rotas.filter(r => r.shift_date === date);
  };

  const getStaffName = (staffMember: StaffMember) => {
    return staffMember.profiles?.display_name || staffMember.name || "Staff";
  };

  const getShiftStaffName = (shift: Shift) => {
    return shift.gym_staff?.profiles?.display_name || shift.gym_staff?.name || "Staff";
  };

  const toggleCloneWeek = (weekOffset: number) => {
    setCloneTargetWeeks(prev => 
      prev.includes(weekOffset) 
        ? prev.filter(w => w !== weekOffset)
        : [...prev, weekOffset].sort((a, b) => a - b)
    );
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
        <div className="flex gap-2">
          <button
            onClick={() => setShowCloneWeek(true)}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted"
          >
            <Copy className="h-4 w-4" />
            Clone Week
          </button>
          <button
            onClick={() => setShowAddShift(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Shift
          </button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="schedule">Weekly Schedule</TabsTrigger>
          <TabsTrigger value="patterns">Shift Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4 mt-4">
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
                            className="p-2 bg-primary/10 rounded-lg text-xs group relative"
                          >
                            <button
                              onClick={() => handleDeleteShift(shift.id)}
                              className="absolute top-1 right-1 p-0.5 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 rounded text-destructive transition-opacity"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                            <p className="font-medium truncate pr-4">
                              {getShiftStaffName(shift)}
                            </p>
                            <p className="text-muted-foreground">
                              {shift.start_time?.slice(0, 5)} - {shift.end_time?.slice(0, 5)}
                            </p>
                            {shift.notes && (
                              <p className="text-muted-foreground mt-1 truncate">{shift.notes}</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddPattern(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
            >
              <Plus className="h-4 w-4" />
              Save Current as Pattern
            </button>
          </div>

          {patterns.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-8 text-center">
              <Repeat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No Shift Patterns</h3>
              <p className="text-muted-foreground mb-4">
                Create patterns to quickly apply recurring schedules.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {patterns.map((pattern) => (
                <div key={pattern.id} className="bg-card rounded-xl border border-border p-4">
                  <h3 className="font-medium mb-2">{pattern.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {pattern.pattern?.length || 0} shifts
                  </p>
                  
                  {staff.length > 0 && (
                    <Select onValueChange={(staffId) => applyPattern(pattern, staffId)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Apply to staff member..." />
                      </SelectTrigger>
                      <SelectContent>
                        {staff.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {getStaffName(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

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
                      {getStaffName(s)}
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
            <div>
              <Label>Notes (optional)</Label>
              <Input
                value={newShift.notes}
                onChange={(e) => setNewShift({ ...newShift, notes: e.target.value })}
                placeholder="Any notes for this shift..."
              />
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

      {/* Create Pattern Dialog */}
      <Dialog open={showAddPattern} onOpenChange={setShowAddPattern}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Shift Pattern</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Save the current week's schedule as a reusable pattern.
            </p>
            <div>
              <Label>Pattern Name</Label>
              <Input
                value={newPattern.name}
                onChange={(e) => setNewPattern({ ...newPattern, name: e.target.value })}
                placeholder="e.g., Standard Week, Holiday Schedule"
              />
            </div>
            <div>
              <Label>Staff Member (optional - leave empty for all staff)</Label>
              <Select 
                value={newPattern.staffId || "all"} 
                onValueChange={(v) => setNewPattern({ ...newPattern, staffId: v === "all" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All staff</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {getStaffName(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              onClick={handleCreatePattern}
              disabled={adding || !newPattern.name}
              className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Save Pattern"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clone Week Dialog */}
      <Dialog open={showCloneWeek} onOpenChange={setShowCloneWeek}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Clone Week
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Clone all {rotas.length} shifts from the current week to selected future weeks.
            </p>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              <Label>Select target weeks:</Label>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(weekOffset => {
                const targetWeekStart = addWeeks(weekStart, weekOffset);
                return (
                  <label key={weekOffset} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted">
                    <Checkbox
                      checked={cloneTargetWeeks.includes(weekOffset)}
                      onCheckedChange={() => toggleCloneWeek(weekOffset)}
                    />
                    <div>
                      <p className="font-medium text-sm">
                        {format(targetWeekStart, "MMM d")} - {format(addDays(targetWeekStart, 6), "MMM d, yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {weekOffset === 1 ? "Next week" : `${weekOffset} weeks from now`}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCloneWeek(false)}
                className="flex-1 py-2 border border-border rounded-lg font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleCloneWeek}
                disabled={cloning || cloneTargetWeeks.length === 0 || rotas.length === 0}
                className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
              >
                {cloning ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : `Clone to ${cloneTargetWeeks.length} Week(s)`}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
