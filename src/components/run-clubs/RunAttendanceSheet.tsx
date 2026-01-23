import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Users,
  CalendarIcon,
  CheckCircle2,
  Circle,
  Loader2,
  Save,
  Search,
  Cloud,
  Sun,
  CloudRain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RunClubRun, RunClubMember } from "@/hooks/useRunClubs";
import { RunInstance, AttendanceRecord } from "@/hooks/useRunClubAttendance";
import { toast } from "sonner";

interface RunAttendanceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  run: RunClubRun | null;
  members: RunClubMember[];
  instance?: RunInstance | null;
  existingAttendance?: AttendanceRecord[];
  onCreateInstance: (runId: string, date: string, time?: string) => Promise<any>;
  onRecordAttendance: (
    instanceId: string,
    runId: string,
    records: Array<{ userId: string; attended: boolean; notes?: string }>
  ) => Promise<void>;
  onCompleteInstance: (instanceId: string, notes?: string, weather?: string) => Promise<void>;
}

const WEATHER_OPTIONS = [
  { value: "sunny", label: "Sunny", icon: Sun },
  { value: "cloudy", label: "Cloudy", icon: Cloud },
  { value: "rainy", label: "Rainy", icon: CloudRain },
];

export function RunAttendanceSheet({
  open,
  onOpenChange,
  run,
  members,
  instance,
  existingAttendance = [],
  onCreateInstance,
  onRecordAttendance,
  onCompleteInstance,
}: RunAttendanceSheetProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [sessionNotes, setSessionNotes] = useState("");
  const [weather, setWeather] = useState<string>("sunny");
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [creatingInstance, setCreatingInstance] = useState(false);
  const [currentInstance, setCurrentInstance] = useState<RunInstance | null>(instance || null);

  // Initialize attendance from existing records
  useMemo(() => {
    if (existingAttendance.length > 0) {
      const map: Record<string, boolean> = {};
      const notes: Record<string, string> = {};
      existingAttendance.forEach(record => {
        map[record.user_id] = record.attended ?? false;
        if (record.notes) notes[record.user_id] = record.notes;
      });
      setAttendanceMap(map);
      setNotesMap(notes);
    }
  }, [existingAttendance]);

  // Filter active members only
  const activeMembers = members.filter(m => m.status === "active");

  // Filter by search
  const filteredMembers = useMemo(() => {
    if (!searchQuery) return activeMembers;
    const query = searchQuery.toLowerCase();
    return activeMembers.filter(m =>
      m.profile?.display_name?.toLowerCase().includes(query) ||
      m.profile?.email?.toLowerCase().includes(query)
    );
  }, [activeMembers, searchQuery]);

  const attendedCount = Object.values(attendanceMap).filter(Boolean).length;

  const handleToggleAttendance = (userId: string) => {
    setAttendanceMap(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleSelectAll = () => {
    const allSelected = filteredMembers.every(m => attendanceMap[m.user_id]);
    const newMap = { ...attendanceMap };
    filteredMembers.forEach(m => {
      newMap[m.user_id] = !allSelected;
    });
    setAttendanceMap(newMap);
  };

  const handleCreateAndRecord = async () => {
    if (!run || !selectedDate) return;

    try {
      setCreatingInstance(true);

      // Create instance if needed
      let instanceToUse = currentInstance;
      if (!instanceToUse) {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        instanceToUse = await onCreateInstance(run.id, dateStr, run.start_time || undefined);
        setCurrentInstance(instanceToUse);
      }

      if (!instanceToUse) {
        throw new Error("Failed to create run instance");
      }

      // Record attendance
      const records = Object.entries(attendanceMap).map(([userId, attended]) => ({
        userId,
        attended,
        notes: notesMap[userId]
      }));

      await onRecordAttendance(instanceToUse.id, run.id, records);

      // Complete the instance
      await onCompleteInstance(instanceToUse.id, sessionNotes, weather);

      toast.success(`Attendance recorded for ${attendedCount} members`);
      onOpenChange(false);
    } catch (error) {
      console.error("Error recording attendance:", error);
      toast.error("Failed to record attendance");
    } finally {
      setCreatingInstance(false);
    }
  };

  const handleSaveAttendance = async () => {
    if (!run || !currentInstance) return;

    try {
      setSaving(true);

      const records = Object.entries(attendanceMap).map(([userId, attended]) => ({
        userId,
        attended,
        notes: notesMap[userId]
      }));

      await onRecordAttendance(currentInstance.id, run.id, records);
      toast.success("Attendance updated");
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  if (!run) return null;

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-hidden flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Record Attendance
          </SheetTitle>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{run.title}</p>
            <p>
              {run.day_of_week !== null ? days[run.day_of_week] : ""}
              {run.start_time && ` at ${run.start_time.slice(0, 5)}`}
              {run.meeting_point && ` • ${run.meeting_point}`}
            </p>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
          {/* Date and Weather Selection */}
          {!currentInstance && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Session Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Weather</Label>
                <div className="flex gap-2">
                  {WEATHER_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    return (
                      <Button
                        key={opt.value}
                        variant={weather === opt.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setWeather(opt.value)}
                        className="flex-1"
                      >
                        <Icon className="h-4 w-4 mr-1" />
                        {opt.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Separator />
            </div>
          )}

          {/* Instance Info */}
          {currentInstance && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-medium">
                {format(new Date(currentInstance.scheduled_date), "EEEE, MMMM d, yyyy")}
              </p>
              <Badge variant={currentInstance.status === "completed" ? "default" : "secondary"}>
                {currentInstance.status}
              </Badge>
            </div>
          )}

          {/* Search and Select All */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              {filteredMembers.every(m => attendanceMap[m.user_id]) ? "Deselect All" : "Select All"}
            </Button>
          </div>

          {/* Attendance Count */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {filteredMembers.length} members
            </span>
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {attendedCount} attending
            </Badge>
          </div>

          {/* Member List */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-2">
              {filteredMembers.map(member => {
                const isAttending = attendanceMap[member.user_id] ?? false;
                return (
                  <div
                    key={member.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      isAttending
                        ? "bg-primary/5 border-primary/30"
                        : "bg-background hover:bg-muted/50"
                    )}
                    onClick={() => handleToggleAttendance(member.user_id)}
                  >
                    <Checkbox
                      checked={isAttending}
                      onCheckedChange={() => handleToggleAttendance(member.user_id)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {member.profile?.display_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {member.profile?.display_name || "Unknown"}
                      </p>
                      {member.profile?.email && (
                        <p className="text-xs text-muted-foreground truncate">
                          {member.profile.email}
                        </p>
                      )}
                    </div>
                    {isAttending ? (
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                );
              })}

              {filteredMembers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No members found" : "No active members"}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Session Notes */}
          <div className="space-y-2 flex-shrink-0">
            <Label>Session Notes (optional)</Label>
            <Textarea
              placeholder="Any notes about this session..."
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          {currentInstance ? (
            <Button
              onClick={handleSaveAttendance}
              disabled={saving}
              className="flex-1"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          ) : (
            <Button
              onClick={handleCreateAndRecord}
              disabled={creatingInstance || !selectedDate}
              className="flex-1"
            >
              {creatingInstance ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Record Attendance
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
