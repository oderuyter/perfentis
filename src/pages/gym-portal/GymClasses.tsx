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
  Trash2,
  MapPin,
  User,
  UserPlus,
  X
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

interface Staff {
  id: string;
  user_id: string;
  position: string | null;
  name: string | null;
  profile: { display_name: string | null } | null;
}

interface GymSpace {
  id: string;
  name: string;
}

interface GymClass {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  capacity: number | null;
  is_active: boolean;
}

interface ClassSchedule {
  id: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  instructor_id: string | null;
  space_id: string | null;
  gym_classes?: { name: string; gym_id: string; capacity: number } | null;
  gym_spaces?: { name: string } | null;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6am to 8pm

export default function GymClasses() {
  const { selectedGymId } = useOutletContext<ContextType>();
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [spaces, setSpaces] = useState<GymSpace[]>([]);
  const [members, setMembers] = useState<{ id: string; user_id: string; display_name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddClass, setShowAddClass] = useState(false);
  const [showEditClass, setShowEditClass] = useState<GymClass | null>(null);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [showScheduleDetail, setShowScheduleDetail] = useState<ClassSchedule | null>(null);
  const [waitlistEntries, setWaitlistEntries] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [addingToType, setAddingToType] = useState<"booking" | "waitlist">("booking");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  
  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<{ type: "class" | "schedule"; id: string } | null>(null);
  
  const [newClass, setNewClass] = useState({ name: "", description: "", duration: 60, capacity: 20 });
  const [editClassData, setEditClassData] = useState({ name: "", description: "", duration: 60, capacity: 20 });
  const [newSchedule, setNewSchedule] = useState({ 
    classId: "", 
    dayOfWeek: 1, 
    startTime: "09:00", 
    endTime: "10:00",
    instructorId: "",
    spaceId: ""
  });
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState<"list" | "calendar">("list");

  useEffect(() => {
    if (selectedGymId) {
      fetchData();
    }
  }, [selectedGymId]);

  const fetchData = async () => {
    if (!selectedGymId) return;
    setIsLoading(true);

    try {
      // Fetch classes
      const { data: classData } = await supabase
        .from("gym_classes")
        .select("*")
        .eq("gym_id", selectedGymId)
        .eq("is_active", true);

      setClasses(classData || []);

      // Fetch schedules with instructor and space info
      const { data: scheduleData } = await supabase
        .from("class_schedules")
        .select(`
          *,
          gym_classes!inner(name, gym_id, capacity),
          gym_spaces(name)
        `)
        .eq("gym_classes.gym_id", selectedGymId)
        .eq("is_active", true)
        .order("day_of_week");

      setSchedules((scheduleData || []) as ClassSchedule[]);

      // Fetch staff for instructor selection
      const { data: staffData } = await supabase
        .from("gym_staff")
        .select("id, user_id, position, name")
        .eq("gym_id", selectedGymId)
        .eq("is_active", true);

      if (staffData && staffData.length > 0) {
        const userIds = staffData.filter(s => s.user_id).map(s => s.user_id);
        let profileMap = new Map<string, string>();
        
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name")
            .in("user_id", userIds);
          
          profileMap = new Map((profiles || []).map(p => [p.user_id, p.display_name || ""]));
        }
        
        setStaff(staffData.map(s => ({
          ...s,
          profile: { display_name: s.user_id ? profileMap.get(s.user_id) || s.name : s.name }
        })));
      } else {
        setStaff([]);
      }

      // Fetch spaces
      const { data: spacesData } = await supabase
        .from("gym_spaces")
        .select("id, name")
        .eq("gym_id", selectedGymId)
        .eq("is_active", true);

      setSpaces(spacesData || []);

      // Fetch members for adding to bookings
      const { data: memberData } = await supabase
        .from("memberships")
        .select("id, user_id")
        .eq("gym_id", selectedGymId)
        .eq("status", "active");

      if (memberData && memberData.length > 0) {
        const memberUserIds = memberData.map(m => m.user_id);
        const { data: memberProfiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", memberUserIds);

        const profileMap = new Map((memberProfiles || []).map(p => [p.user_id, p.display_name || "Unknown"]));
        
        setMembers(memberData.map(m => ({
          id: m.id,
          user_id: m.user_id,
          display_name: profileMap.get(m.user_id) || "Unknown"
        })));
      }

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

  const handleEditClass = async () => {
    if (!showEditClass) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("gym_classes")
        .update({
          name: editClassData.name,
          description: editClassData.description || null,
          duration_minutes: editClassData.duration,
          capacity: editClassData.capacity
        })
        .eq("id", showEditClass.id);

      if (error) throw error;

      toast.success("Class updated");
      setShowEditClass(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to update class");
    } finally {
      setSaving(false);
    }
  };

  const openEditClass = (cls: GymClass) => {
    setEditClassData({
      name: cls.name,
      description: cls.description || "",
      duration: cls.duration_minutes,
      capacity: cls.capacity || 20
    });
    setShowEditClass(cls);
  };

  const handleAddSchedule = async () => {
    if (!newSchedule.classId) return;
    setAdding(true);

    try {
      await supabase.from("class_schedules").insert({
        class_id: newSchedule.classId,
        day_of_week: newSchedule.dayOfWeek,
        start_time: newSchedule.startTime,
        end_time: newSchedule.endTime,
        instructor_id: newSchedule.instructorId || null,
        space_id: newSchedule.spaceId || null
      });

      toast.success("Schedule added");
      setShowAddSchedule(false);
      setNewSchedule({ classId: "", dayOfWeek: 1, startTime: "09:00", endTime: "10:00", instructorId: "", spaceId: "" });
      fetchData();
    } catch (error) {
      toast.error("Failed to add schedule");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!confirmDelete || confirmDelete.type !== "class") return;
    
    try {
      await supabase.from("gym_classes").update({ is_active: false }).eq("id", confirmDelete.id);
      toast.success("Class deleted");
      setConfirmDelete(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete class");
    }
  };

  const handleDeleteSchedule = async () => {
    if (!confirmDelete || confirmDelete.type !== "schedule") return;
    
    try {
      await supabase.from("class_schedules").update({ is_active: false }).eq("id", confirmDelete.id);
      toast.success("Schedule removed");
      setConfirmDelete(null);
      setShowScheduleDetail(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete schedule");
    }
  };

  const openScheduleDetail = async (schedule: ClassSchedule) => {
    setShowScheduleDetail(schedule);
    setWaitlistLoading(true);

    try {
      // Fetch bookings for this schedule
      const { data: bookingData } = await supabase
        .from("class_bookings")
        .select("*")
        .eq("schedule_id", schedule.id)
        .order("created_at", { ascending: false });

      // Fetch profiles for bookings
      if (bookingData && bookingData.length > 0) {
        const userIds = bookingData.map(b => b.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);
        
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
        setBookings(bookingData.map(b => ({ ...b, profiles: profileMap.get(b.user_id) })));
      } else {
        setBookings([]);
      }

      // Fetch waitlist
      const { data: waitlistData } = await supabase
        .from("class_waitlist")
        .select("*")
        .eq("schedule_id", schedule.id)
        .order("created_at", { ascending: true });

      if (waitlistData && waitlistData.length > 0) {
        const userIds = waitlistData.map(w => w.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);
        
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
        setWaitlistEntries(waitlistData.map(w => ({ ...w, profiles: profileMap.get(w.user_id) })));
      } else {
        setWaitlistEntries([]);
      }
    } catch (error) {
      console.error("Error fetching schedule details:", error);
    } finally {
      setWaitlistLoading(false);
    }
  };

  const handleAddMemberToClass = async () => {
    if (!showScheduleDetail || !selectedMemberId) return;
    setAddingMember(true);

    try {
      const member = members.find(m => m.id === selectedMemberId);
      if (!member) throw new Error("Member not found");

      if (addingToType === "booking") {
        const { error } = await supabase.from("class_bookings").insert({
          schedule_id: showScheduleDetail.id,
          user_id: member.user_id,
          booking_date: new Date().toISOString().split("T")[0],
          status: "confirmed"
        });
        if (error) throw error;
        toast.success("Member added to class");
      } else {
        const { error } = await supabase.from("class_waitlist").insert({
          schedule_id: showScheduleDetail.id,
          user_id: member.user_id,
          booking_date: new Date().toISOString().split("T")[0],
          status: "waiting"
        });
        if (error) throw error;
        toast.success("Member added to waitlist");
      }

      setShowAddMemberDialog(false);
      setSelectedMemberId("");
      openScheduleDetail(showScheduleDetail);
    } catch (error: any) {
      toast.error(error.message || "Failed to add member");
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveBooking = async (bookingId: string) => {
    try {
      await supabase.from("class_bookings").delete().eq("id", bookingId);
      toast.success("Booking removed");
      if (showScheduleDetail) {
        openScheduleDetail(showScheduleDetail);
      }
    } catch (error) {
      toast.error("Failed to remove booking");
    }
  };

  const handleRemoveFromWaitlist = async (waitlistId: string) => {
    try {
      await supabase.from("class_waitlist").delete().eq("id", waitlistId);
      toast.success("Removed from waitlist");
      if (showScheduleDetail) {
        openScheduleDetail(showScheduleDetail);
      }
    } catch (error) {
      toast.error("Failed to remove from waitlist");
    }
  };

  const getInstructorName = (instructorId: string | null) => {
    if (!instructorId) return null;
    const instructor = staff.find(s => s.user_id === instructorId);
    return instructor?.profile?.display_name || instructor?.name || "Unknown";
  };

  const getSpaceName = (spaceId: string | null) => {
    if (!spaceId) return null;
    const space = spaces.find(s => s.id === spaceId);
    return space?.name || null;
  };

  const getScheduleForCalendar = (dayIndex: number, hour: number) => {
    return schedules.filter(s => {
      const scheduleHour = parseInt(s.start_time.split(":")[0]);
      return s.day_of_week === dayIndex && scheduleHour === hour;
    });
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
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "list" | "calendar")}>
          <TabsList>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
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
                            <DropdownMenuItem onClick={() => openEditClass(c)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setConfirmDelete({ type: "class", id: c.id })} className="text-destructive">
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
                              <div 
                                key={s.id} 
                                className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm cursor-pointer hover:bg-muted"
                                onClick={() => openScheduleDetail(s)}
                              >
                                <div>
                                  <span className="font-medium">{s.gym_classes?.name}</span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {s.instructor_id && (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        {getInstructorName(s.instructor_id)}
                                      </span>
                                    )}
                                    {s.space_id && (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {getSpaceName(s.space_id)}
                                      </span>
                                    )}
                                  </div>
                                </div>
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
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="py-2 px-3 text-left text-xs font-medium w-16">Time</th>
                      {DAYS.map(day => (
                        <th key={day} className="py-2 px-3 text-center text-xs font-medium">{day}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {HOURS.map(hour => (
                      <tr key={hour} className="border-b border-border last:border-0">
                        <td className="py-2 px-3 text-xs text-muted-foreground">
                          {hour.toString().padStart(2, "0")}:00
                        </td>
                        {DAYS.map((day, dayIndex) => {
                          const daySchedules = getScheduleForCalendar(dayIndex, hour);
                          return (
                            <td key={day} className="py-1 px-1 align-top min-h-[50px]">
                              {daySchedules.map(s => (
                                <div 
                                  key={s.id} 
                                  className="text-xs p-1.5 bg-primary/10 text-primary rounded mb-1 cursor-pointer hover:bg-primary/20"
                                  onClick={() => openScheduleDetail(s)}
                                >
                                  <p className="font-medium truncate">{s.gym_classes?.name}</p>
                                  <p className="text-[10px] opacity-75">
                                    {s.start_time.slice(0, 5)}
                                    {s.instructor_id && ` • ${getInstructorName(s.instructor_id)}`}
                                  </p>
                                </div>
                              ))}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
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

      {/* Edit Class Dialog */}
      <Dialog open={!!showEditClass} onOpenChange={() => setShowEditClass(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Class Name *</Label>
              <Input
                value={editClassData.name}
                onChange={(e) => setEditClassData({ ...editClassData, name: e.target.value })}
                placeholder="e.g., HIIT Training"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={editClassData.description}
                onChange={(e) => setEditClassData({ ...editClassData, description: e.target.value })}
                placeholder="Class description..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={editClassData.duration}
                  onChange={(e) => setEditClassData({ ...editClassData, duration: parseInt(e.target.value) || 60 })}
                />
              </div>
              <div>
                <Label>Capacity</Label>
                <Input
                  type="number"
                  value={editClassData.capacity}
                  onChange={(e) => setEditClassData({ ...editClassData, capacity: parseInt(e.target.value) || 20 })}
                />
              </div>
            </div>
            <button
              onClick={handleEditClass}
              disabled={saving || !editClassData.name}
              className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Save Changes"}
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
              <Label>Class *</Label>
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
              <Label>Instructor</Label>
              <Select value={newSchedule.instructorId || "none"} onValueChange={(v) => setNewSchedule({ ...newSchedule, instructorId: v === "none" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select instructor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No instructor</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.user_id || s.id}>
                      {s.profile?.display_name || s.name || "Unknown"} {s.position && `(${s.position})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {spaces.length > 0 && (
              <div>
                <Label>Space/Room</Label>
                <Select value={newSchedule.spaceId || "none"} onValueChange={(v) => setNewSchedule({ ...newSchedule, spaceId: v === "none" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select space (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific space</SelectItem>
                    {spaces.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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

      {/* Schedule Detail Sheet */}
      <Sheet open={!!showScheduleDetail} onOpenChange={() => setShowScheduleDetail(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {showScheduleDetail?.gym_classes?.name}
            </SheetTitle>
          </SheetHeader>

          {showScheduleDetail && (
            <div className="mt-6 space-y-6">
              {/* Schedule Info */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Day</span>
                  <span className="font-medium">{DAYS[showScheduleDetail.day_of_week]}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">
                    {showScheduleDetail.start_time.slice(0, 5)} - {showScheduleDetail.end_time.slice(0, 5)}
                  </span>
                </div>
                {showScheduleDetail.instructor_id && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Instructor</span>
                    <span className="font-medium flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {getInstructorName(showScheduleDetail.instructor_id)}
                    </span>
                  </div>
                )}
                {showScheduleDetail.space_id && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {getSpaceName(showScheduleDetail.space_id)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="font-medium">{showScheduleDetail.gym_classes?.capacity || "—"}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setAddingToType("booking");
                    setShowAddMemberDialog(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
                >
                  <UserPlus className="h-4 w-4" />
                  Add to Booking
                </button>
                <button
                  onClick={() => setConfirmDelete({ type: "schedule", id: showScheduleDetail.id })}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Tabs for Bookings and Waitlist */}
              <Tabs defaultValue="bookings">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="bookings">
                    Booked ({bookings.filter(b => b.status === 'confirmed').length})
                  </TabsTrigger>
                  <TabsTrigger value="waitlist">
                    Waitlist ({waitlistEntries.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="bookings" className="mt-4">
                  {waitlistLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : bookings.filter(b => b.status === 'confirmed').length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No bookings yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {bookings.filter(b => b.status === 'confirmed').map((booking) => (
                        <div key={booking.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-medium">{booking.profiles?.display_name || "Unknown"}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveBooking(booking.id)}
                            className="p-1.5 text-destructive hover:bg-destructive/10 rounded"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="waitlist" className="mt-4">
                  <div className="flex justify-end mb-3">
                    <button
                      onClick={() => {
                        setAddingToType("waitlist");
                        setShowAddMemberDialog(true);
                      }}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Add to Waitlist
                    </button>
                  </div>
                  {waitlistLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : waitlistEntries.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No one on the waitlist
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {waitlistEntries.map((entry, index) => (
                        <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-muted-foreground w-6">#{index + 1}</span>
                            <span className="font-medium">{entry.profiles?.display_name || "Unknown"}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveFromWaitlist(entry.id)}
                            className="p-1.5 text-destructive hover:bg-destructive/10 rounded"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-4">
                    When a spot opens, all waitlisted members are notified. First to book gets the spot.
                  </p>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Member to Booking/Waitlist Dialog */}
      <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add Member to {addingToType === "booking" ? "Booking" : "Waitlist"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Select Member</Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a member..." />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              onClick={handleAddMemberToClass}
              disabled={addingMember || !selectedMemberId}
              className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
            >
              {addingMember ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : `Add to ${addingToType === "booking" ? "Booking" : "Waitlist"}`}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {confirmDelete?.type === "class" ? "Class" : "Schedule"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.type === "class" 
                ? "This will remove the class and all associated schedules. This action cannot be undone."
                : "This will remove this schedule instance. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete?.type === "class" ? handleDeleteClass : handleDeleteSchedule}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
