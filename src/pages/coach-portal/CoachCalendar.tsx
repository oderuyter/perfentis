import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Clock, MapPin, Video, User, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, isToday, parseISO, setHours, setMinutes } from "date-fns";

interface Coach {
  id: string;
  user_id: string;
  display_name: string;
}

interface Appointment {
  id: string;
  coach_id: string;
  client_id: string | null;
  title: string | null;
  appointment_type: string;
  mode: string;
  start_time: string;
  duration_minutes: number;
  location: string | null;
  notes: string | null;
  status: string;
  client?: {
    id: string;
    profiles?: {
      display_name: string | null;
    };
  };
}

interface Client {
  id: string;
  client_user_id: string;
  status: string;
  profiles?: {
    display_name: string | null;
  };
}

type ViewType = "month" | "week" | "day";

export default function CoachCalendar() {
  const { coach } = useOutletContext<{ coach: Coach }>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewType>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [form, setForm] = useState({
    client_id: "",
    title: "",
    appointment_type: "session",
    mode: "online",
    date: "",
    time: "09:00",
    duration_minutes: "60",
    location: "",
    notes: ""
  });

  useEffect(() => {
    if (coach?.id) {
      fetchData();
    }
  }, [coach?.id, currentDate, view]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch clients
      const { data: clientsData } = await supabase
        .from("coach_clients")
        .select("id, client_user_id, status")
        .eq("coach_id", coach.id)
        .eq("status", "active");

      if (clientsData && clientsData.length > 0) {
        const clientUserIds = clientsData.map(c => c.client_user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", clientUserIds);

        const clientsWithProfiles = clientsData.map(client => ({
          ...client,
          profiles: profilesData?.find(p => p.user_id === client.client_user_id)
        }));
        setClients(clientsWithProfiles);
      }

      // Fetch appointments
      const { data: appointmentsData } = await supabase
        .from("coach_appointments")
        .select("*")
        .eq("coach_id", coach.id)
        .order("start_time", { ascending: true });

      if (appointmentsData && clientsData) {
        const appointmentsWithClients = appointmentsData.map(apt => ({
          ...apt,
          client: clientsData.find(c => c.id === apt.client_id)
        }));

        // Fetch profiles for clients in appointments
        const clientUserIds = clientsData.map(c => c.client_user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", clientUserIds);

        const appointmentsWithProfiles = appointmentsWithClients.map(apt => ({
          ...apt,
          client: apt.client ? {
            ...apt.client,
            profiles: profilesData?.find(p => p.user_id === apt.client?.client_user_id)
          } : undefined
        }));

        setAppointments(appointmentsWithProfiles as Appointment[]);
      } else {
        setAppointments(appointmentsData || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAppointment = async () => {
    if (!form.date || !form.time) {
      toast.error("Please select date and time");
      return;
    }

    try {
      const startTime = new Date(`${form.date}T${form.time}:00`);

      const { error } = await supabase.from("coach_appointments").insert({
        coach_id: coach.id,
        client_id: form.client_id || null,
        title: form.title || null,
        appointment_type: form.appointment_type,
        mode: form.mode,
        start_time: startTime.toISOString(),
        duration_minutes: parseInt(form.duration_minutes),
        location: form.location || null,
        notes: form.notes || null,
        status: "scheduled"
      });

      if (error) throw error;
      
      toast.success("Appointment created!");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error creating appointment:", error);
      toast.error("Failed to create appointment");
    }
  };

  const handleUpdateStatus = async (appointmentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("coach_appointments")
        .update({ status })
        .eq("id", appointmentId);

      if (error) throw error;
      
      toast.success(`Appointment ${status}`);
      setDetailDialogOpen(false);
      setSelectedAppointment(null);
      fetchData();
    } catch (error) {
      console.error("Error updating appointment:", error);
      toast.error("Failed to update appointment");
    }
  };

  const resetForm = () => {
    setForm({
      client_id: "",
      title: "",
      appointment_type: "session",
      mode: "online",
      date: "",
      time: "09:00",
      duration_minutes: "60",
      location: "",
      notes: ""
    });
  };

  const navigatePrevious = () => {
    if (view === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const navigateNext = () => {
    if (view === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(apt => isSameDay(parseISO(apt.start_time), date));
  };

  const openNewAppointmentDialog = (date?: Date) => {
    if (date) {
      setForm(prev => ({ ...prev, date: format(date, "yyyy-MM-dd") }));
    }
    setDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500/10 text-green-500";
      case "cancelled": return "bg-red-500/10 text-red-500";
      case "no_show": return "bg-orange-500/10 text-orange-500";
      default: return "bg-blue-500/10 text-blue-500";
    }
  };

  const getModeIcon = (mode: string) => {
    return mode === "online" ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />;
  };

  // Render calendar views
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="grid grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">{day}</div>
        ))}
        {days.map(day => {
          const dayAppointments = getAppointmentsForDay(day);
          return (
            <div
              key={day.toISOString()}
              className={`min-h-24 p-1 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                !isSameMonth(day, currentDate) ? "opacity-40" : ""
              } ${isToday(day) ? "border-primary" : "border-border"}`}
              onClick={() => openNewAppointmentDialog(day)}
            >
              <div className={`text-sm font-medium mb-1 ${isToday(day) ? "text-primary" : ""}`}>
                {format(day, "d")}
              </div>
              <div className="space-y-1">
                {dayAppointments.slice(0, 2).map(apt => (
                  <div
                    key={apt.id}
                    className={`text-xs p-1 rounded truncate ${getStatusColor(apt.status)}`}
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedAppointment(apt);
                      setDetailDialogOpen(true);
                    }}
                  >
                    {format(parseISO(apt.start_time), "HH:mm")} {apt.client?.profiles?.display_name || apt.title || apt.appointment_type}
                  </div>
                ))}
                {dayAppointments.length > 2 && (
                  <div className="text-xs text-muted-foreground">+{dayAppointments.length - 2} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart) });
    const hours = Array.from({ length: 14 }, (_, i) => i + 6); // 6am to 7pm

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-8 border-b">
            <div className="p-2" />
            {days.map(day => (
              <div key={day.toISOString()} className={`p-2 text-center border-l ${isToday(day) ? "bg-primary/5" : ""}`}>
                <div className="text-sm text-muted-foreground">{format(day, "EEE")}</div>
                <div className={`text-lg font-medium ${isToday(day) ? "text-primary" : ""}`}>{format(day, "d")}</div>
              </div>
            ))}
          </div>
          <div className="relative">
            {hours.map(hour => (
              <div key={hour} className="grid grid-cols-8 border-b min-h-16">
                <div className="p-1 text-xs text-muted-foreground text-right pr-2">{`${hour}:00`}</div>
                {days.map(day => {
                  const dayAppointments = getAppointmentsForDay(day).filter(apt => {
                    const aptHour = parseISO(apt.start_time).getHours();
                    return aptHour === hour;
                  });
                  return (
                    <div 
                      key={`${day.toISOString()}-${hour}`} 
                      className="border-l relative hover:bg-muted/30 cursor-pointer"
                      onClick={() => {
                        const newDate = setMinutes(setHours(day, hour), 0);
                        setForm(prev => ({ 
                          ...prev, 
                          date: format(newDate, "yyyy-MM-dd"),
                          time: format(newDate, "HH:mm")
                        }));
                        setDialogOpen(true);
                      }}
                    >
                      {dayAppointments.map(apt => (
                        <div
                          key={apt.id}
                          className={`absolute left-0 right-0 mx-0.5 p-1 rounded text-xs ${getStatusColor(apt.status)} cursor-pointer hover:opacity-80`}
                          style={{
                            top: `${(parseISO(apt.start_time).getMinutes() / 60) * 100}%`,
                            height: `${Math.min((apt.duration_minutes / 60) * 100, 100)}%`,
                            minHeight: "20px"
                          }}
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedAppointment(apt);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <div className="flex items-center gap-1 truncate">
                            {getModeIcon(apt.mode)}
                            <span className="truncate">{apt.client?.profiles?.display_name || apt.title || apt.appointment_type}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 14 }, (_, i) => i + 6);
    const dayAppointments = getAppointmentsForDay(currentDate);

    return (
      <div className="space-y-2">
        <div className={`text-center p-4 rounded-lg ${isToday(currentDate) ? "bg-primary/5" : "bg-muted/30"}`}>
          <div className="text-lg font-medium">{format(currentDate, "EEEE")}</div>
          <div className="text-3xl font-bold">{format(currentDate, "d MMMM yyyy")}</div>
        </div>
        <div className="relative">
          {hours.map(hour => {
            const hourAppointments = dayAppointments.filter(apt => parseISO(apt.start_time).getHours() === hour);
            return (
              <div 
                key={hour} 
                className="flex border-b min-h-20 hover:bg-muted/30 cursor-pointer"
                onClick={() => {
                  const newDate = setMinutes(setHours(currentDate, hour), 0);
                  setForm(prev => ({ 
                    ...prev, 
                    date: format(newDate, "yyyy-MM-dd"),
                    time: format(newDate, "HH:mm")
                  }));
                  setDialogOpen(true);
                }}
              >
                <div className="w-20 p-2 text-sm text-muted-foreground text-right shrink-0">{`${hour}:00`}</div>
                <div className="flex-1 relative p-1">
                  {hourAppointments.map(apt => (
                    <Card
                      key={apt.id}
                      className={`mb-1 cursor-pointer ${apt.status === "cancelled" ? "opacity-50" : ""}`}
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedAppointment(apt);
                        setDetailDialogOpen(true);
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getModeIcon(apt.mode)}
                            <span className="font-medium">{apt.client?.profiles?.display_name || apt.title || "No title"}</span>
                          </div>
                          <Badge className={getStatusColor(apt.status)}>{apt.status}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(parseISO(apt.start_time), "HH:mm")} - {apt.duration_minutes}min
                          </span>
                          <span className="capitalize">{apt.appointment_type}</span>
                          {apt.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />{apt.location}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Calendar</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />New Appointment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Appointment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Client (optional)</Label>
                <Select value={form.client_id} onValueChange={v => setForm(p => ({ ...p, client_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select client or leave empty" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No client (blocked time)</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.profiles?.display_name || "Unknown Client"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Appointment title" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.appointment_type} onValueChange={v => setForm(p => ({ ...p, appointment_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="session">Training Session</SelectItem>
                      <SelectItem value="check_in">Check-in</SelectItem>
                      <SelectItem value="consultation">Consultation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mode</Label>
                  <Select value={form.mode} onValueChange={v => setForm(p => ({ ...p, mode: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="in_person">In-Person</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Select value={form.duration_minutes} onValueChange={v => setForm(p => ({ ...p, duration_minutes: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">60 min</SelectItem>
                      <SelectItem value="90">90 min</SelectItem>
                      <SelectItem value="120">120 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.mode === "in_person" && (
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Location" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Notes (internal)</Label>
                <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Internal notes..." />
              </div>
              <Button onClick={handleCreateAppointment} className="w-full">Create Appointment</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendar Controls */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={navigatePrevious}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={navigateNext}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="ghost" onClick={() => setCurrentDate(new Date())}>Today</Button>
              <span className="font-medium ml-2">
                {view === "month" && format(currentDate, "MMMM yyyy")}
                {view === "week" && `Week of ${format(startOfWeek(currentDate), "MMM d, yyyy")}`}
                {view === "day" && format(currentDate, "MMMM d, yyyy")}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant={view === "month" ? "default" : "ghost"} size="sm" onClick={() => setView("month")}>Month</Button>
              <Button variant={view === "week" ? "default" : "ghost"} size="sm" onClick={() => setView("week")}>Week</Button>
              <Button variant={view === "day" ? "default" : "ghost"} size="sm" onClick={() => setView("day")}>Day</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      <Card>
        <CardContent className="p-4">
          {view === "month" && renderMonthView()}
          {view === "week" && renderWeekView()}
          {view === "day" && renderDayView()}
        </CardContent>
      </Card>

      {/* Appointment Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">{selectedAppointment.client?.profiles?.display_name || selectedAppointment.title || "No client"}</span>
                </div>
                <Badge className={getStatusColor(selectedAppointment.status)}>{selectedAppointment.status}</Badge>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  <span>{format(parseISO(selectedAppointment.start_time), "EEEE, MMMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{format(parseISO(selectedAppointment.start_time), "HH:mm")} - {selectedAppointment.duration_minutes} minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  {getModeIcon(selectedAppointment.mode)}
                  <span className="capitalize">{selectedAppointment.mode.replace("_", " ")}</span>
                  {selectedAppointment.location && <span>• {selectedAppointment.location}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="capitalize">{selectedAppointment.appointment_type.replace("_", " ")}</span>
                </div>
              </div>

              {selectedAppointment.notes && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Notes</p>
                  <p className="text-sm text-muted-foreground">{selectedAppointment.notes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {selectedAppointment.status === "scheduled" && (
                  <>
                    <Button onClick={() => handleUpdateStatus(selectedAppointment.id, "completed")} className="flex-1">
                      <CheckCircle2 className="w-4 h-4 mr-2" />Complete
                    </Button>
                    <Button variant="outline" onClick={() => handleUpdateStatus(selectedAppointment.id, "cancelled")}>
                      <X className="w-4 h-4 mr-2" />Cancel
                    </Button>
                    <Button variant="ghost" onClick={() => handleUpdateStatus(selectedAppointment.id, "no_show")}>
                      No Show
                    </Button>
                  </>
                )}
                {selectedAppointment.status !== "scheduled" && (
                  <Button variant="outline" onClick={() => handleUpdateStatus(selectedAppointment.id, "scheduled")} className="w-full">
                    Reschedule
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
