import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Calendar,
  Plus,
  Clock,
  Users,
  MoreHorizontal,
  Loader2,
  Edit,
  Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ContextType {
  selectedGymId: string | null;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function GymClasses() {
  const { selectedGymId } = useOutletContext<ContextType>();
  const [classes, setClasses] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddClass, setShowAddClass] = useState(false);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [newClass, setNewClass] = useState({ name: "", description: "", duration: 60, capacity: 20 });
  const [newSchedule, setNewSchedule] = useState({ classId: "", dayOfWeek: 1, startTime: "09:00", endTime: "10:00" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (selectedGymId) {
      fetchData();
    }
  }, [selectedGymId]);

  const fetchData = async () => {
    if (!selectedGymId) return;
    setIsLoading(true);

    try {
      const { data: classData } = await supabase
        .from("gym_classes")
        .select("*")
        .eq("gym_id", selectedGymId)
        .eq("is_active", true);

      setClasses(classData || []);

      const { data: scheduleData } = await supabase
        .from("class_schedules")
        .select(`
          *,
          gym_classes!inner(name, gym_id)
        `)
        .eq("gym_classes.gym_id", selectedGymId)
        .eq("is_active", true)
        .order("day_of_week");

      setSchedules(scheduleData || []);
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddClass = async () => {
    if (!selectedGymId || !newClass.name) return;
    setAdding(true);

    try {
      await supabase.from("gym_classes").insert({
        gym_id: selectedGymId,
        name: newClass.name,
        description: newClass.description || null,
        duration_minutes: newClass.duration,
        capacity: newClass.capacity
      });

      toast.success("Class created");
      setShowAddClass(false);
      setNewClass({ name: "", description: "", duration: 60, capacity: 20 });
      fetchData();
    } catch (error) {
      toast.error("Failed to create class");
    } finally {
      setAdding(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!newSchedule.classId) return;
    setAdding(true);

    try {
      await supabase.from("class_schedules").insert({
        class_id: newSchedule.classId,
        day_of_week: newSchedule.dayOfWeek,
        start_time: newSchedule.startTime,
        end_time: newSchedule.endTime
      });

      toast.success("Schedule added");
      setShowAddSchedule(false);
      setNewSchedule({ classId: "", dayOfWeek: 1, startTime: "09:00", endTime: "10:00" });
      fetchData();
    } catch (error) {
      toast.error("Failed to add schedule");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    try {
      await supabase.from("gym_classes").update({ is_active: false }).eq("id", classId);
      toast.success("Class deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete class");
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
          <h2 className="text-2xl font-semibold">Classes & Schedule</h2>
          <p className="text-muted-foreground">Manage your class offerings and timetable</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddSchedule(true)}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted"
          >
            <Calendar className="h-4 w-4" />
            Add Schedule
          </button>
          <button
            onClick={() => setShowAddClass(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
          >
            <Plus className="h-4 w-4" />
            New Class
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Classes List */}
          <div className="bg-card rounded-xl border border-border shadow-card">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold">Class Types</h3>
            </div>
            <div className="p-4 space-y-3">
              {classes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No classes created yet</p>
              ) : (
                classes.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {c.duration_minutes}min
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {c.capacity} max
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 hover:bg-muted rounded-lg">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteClass(c.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Weekly Schedule */}
          <div className="bg-card rounded-xl border border-border shadow-card">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold">Weekly Schedule</h3>
            </div>
            <div className="p-4 space-y-3">
              {schedules.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No schedules set</p>
              ) : (
                DAYS.map((day, index) => {
                  const daySchedules = schedules.filter(s => s.day_of_week === index);
                  if (daySchedules.length === 0) return null;
                  return (
                    <div key={day}>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-2">{day}</p>
                      <div className="space-y-2">
                        {daySchedules.map((s) => (
                          <div key={s.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                            <span className="font-medium">{s.gym_classes?.name}</span>
                            <span className="text-muted-foreground">
                              {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Class Dialog */}
      <Dialog open={showAddClass} onOpenChange={setShowAddClass}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Class</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Class Name *</Label>
              <Input
                value={newClass.name}
                onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                placeholder="e.g., HIIT Training"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newClass.description}
                onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                placeholder="Class description..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={newClass.duration}
                  onChange={(e) => setNewClass({ ...newClass, duration: parseInt(e.target.value) || 60 })}
                />
              </div>
              <div>
                <Label>Capacity</Label>
                <Input
                  type="number"
                  value={newClass.capacity}
                  onChange={(e) => setNewClass({ ...newClass, capacity: parseInt(e.target.value) || 20 })}
                />
              </div>
            </div>
            <button
              onClick={handleAddClass}
              disabled={adding || !newClass.name}
              className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Create Class"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Schedule Dialog */}
      <Dialog open={showAddSchedule} onOpenChange={setShowAddSchedule}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Class</Label>
              <Select value={newSchedule.classId} onValueChange={(v) => setNewSchedule({ ...newSchedule, classId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Day</Label>
              <Select
                value={String(newSchedule.dayOfWeek)}
                onValueChange={(v) => setNewSchedule({ ...newSchedule, dayOfWeek: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day, i) => (
                    <SelectItem key={day} value={String(i)}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={newSchedule.startTime}
                  onChange={(e) => setNewSchedule({ ...newSchedule, startTime: e.target.value })}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={newSchedule.endTime}
                  onChange={(e) => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
                />
              </div>
            </div>
            <button
              onClick={handleAddSchedule}
              disabled={adding || !newSchedule.classId}
              className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Add Schedule"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
