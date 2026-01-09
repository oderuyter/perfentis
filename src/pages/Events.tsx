import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Calendar, MapPin, Filter, List, CalendarDays, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserEvents } from "@/hooks/useUserEvents";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EventCalendarView } from "@/components/events/EventCalendarView";
import { EventDetailSheet } from "@/components/events/EventDetailSheet";
import { MyEventsSection } from "@/components/events/MyEventsSection";
import { cn } from "@/lib/utils";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  image_url: string | null;
  hero_image_url: string | null;
  status: string;
  event_mode: string | null;
  event_type: string | null;
  rules: string | null;
}

export default function Events() {
  const { user } = useAuth();
  const { registrations, refetch: refetchRegistrations } = useUserEvents();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "calendar" | "my">("list");
  const [filterMode, setFilterMode] = useState<"all" | "in-person" | "online" | "hybrid">("all");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("status", "published")
      .order("start_date", { ascending: true });

    if (!error && data) {
      setEvents(data);
    }
    setLoading(false);
  };

  const isRegistered = (eventId: string) => 
    registrations.some((r) => r.event_id === eventId);

  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterMode === "all" || event.event_mode === filterMode;
    return matchesSearch && matchesFilter;
  });

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-safe px-4 pb-4 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-page pt-safe px-4 pb-24">
      {/* Header */}
      <header className="pt-6 pb-6">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold tracking-tight"
        >
          Events
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-muted-foreground text-sm mt-1"
        >
          Competitions & challenges
        </motion.p>
      </header>

      {/* View Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-1 p-1.5 bg-muted/60 backdrop-blur-sm rounded-2xl mb-6 shadow-card"
      >
        {[
          { id: "list", icon: List, label: "Browse" },
          { id: "calendar", icon: CalendarDays, label: "Calendar" },
          { id: "my", icon: Calendar, label: "My Events" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id as typeof viewMode)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-xl transition-all duration-200",
              viewMode === tab.id
                ? "bg-card shadow-card text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Search & Filters (for list/calendar view) */}
      {viewMode !== "my" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-3 mb-4"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {["all", "in-person", "online", "hybrid"].map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode as typeof filterMode)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200",
                  filterMode === mode
                    ? "bg-primary text-primary-foreground shadow-card"
                    : "bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {mode === "all" ? "All" : mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-4">
          {filteredEvents.map((event, idx) => (
            <motion.button
              key={event.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.03 }}
              onClick={() => handleEventClick(event)}
              className="w-full gradient-card rounded-2xl shadow-card border border-border/30 overflow-hidden text-left hover:shadow-soft transition-shadow duration-300"
            >
              {(event.hero_image_url || event.image_url) && (
                <div className="h-32 bg-muted relative overflow-hidden">
                  <img
                    src={event.hero_image_url || event.image_url || ""}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{event.title}</h3>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                      {(event.start_date || event.event_date) && (
                        <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-lg">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(event.start_date || event.event_date || ""), "MMM d, yyyy")}
                        </span>
                      )}
                      {event.location && (
                        <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-lg">
                          <MapPin className="h-3.5 w-3.5" />
                          {event.location}
                        </span>
                      )}
                      {event.event_mode && (
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded-lg capitalize font-medium">
                          {event.event_mode}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                </div>
                {isRegistered(event.id) && (
                  <span className="inline-flex items-center mt-3 px-3 py-1 bg-success/15 text-success rounded-xl text-xs font-medium">
                    ✓ Registered
                  </span>
                )}
              </div>
            </motion.button>
          ))}

          {filteredEvents.length === 0 && (
            <div className="gradient-card rounded-2xl p-8 shadow-card border border-border/30 text-center">
              <p className="text-muted-foreground">No events found</p>
            </div>
          )}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <EventCalendarView events={filteredEvents} onEventClick={handleEventClick} />
        </motion.div>
      )}

      {/* My Events View */}
      {viewMode === "my" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <MyEventsSection onEventClick={(id) => {
            const event = events.find(e => e.id === id);
            if (event) handleEventClick(event);
          }} />
        </motion.div>
      )}

      {/* Event Detail Sheet */}
      <EventDetailSheet
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        isRegistered={selectedEvent ? isRegistered(selectedEvent.id) : false}
        onRegistrationChange={refetchRegistrations}
      />

    </div>
  );
}
