import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Calendar, 
  MapPin, 
  Users,
  Trophy,
  ChevronRight,
  X,
  Plus,
  ClipboardList
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Event {
  id: string;
  organiser_id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  image_url: string | null;
  status: string;
}

interface EventEntry {
  id: string;
  event_id: string;
  status: string;
}

// Mock events for demo
const mockEvents: Event[] = [
  {
    id: "1",
    organiser_id: "o1",
    title: "Summer Strength Challenge",
    description: "A 4-week online competition testing your strength across classic lifts. Open to all levels.",
    event_date: "2024-07-15",
    location: "Online",
    image_url: null,
    status: "published",
  },
  {
    id: "2",
    organiser_id: "o2",
    title: "City CrossFit Open",
    description: "Annual CrossFit competition with scaled and RX divisions. Compete locally, rank globally.",
    event_date: "2024-08-20",
    location: "Downtown Fitness Center",
    image_url: null,
    status: "published",
  },
  {
    id: "3",
    organiser_id: "o3",
    title: "Endurance Challenge 5K/10K",
    description: "Community running event with 5K and 10K options. All paces welcome!",
    event_date: "2024-09-01",
    location: "Central Park",
    image_url: null,
    status: "published",
  },
];

const mockLeaderboard = [
  { rank: 1, name: "Alex Johnson", score: 1250 },
  { rank: 2, name: "Sarah Chen", score: 1180 },
  { rank: 3, name: "Mike Williams", score: 1095 },
  { rank: 4, name: "Emma Davis", score: 1020 },
  { rank: 5, name: "Chris Lee", score: 985 },
];

const mockWorkouts = [
  { id: "w1", title: "Workout 1: For Time", description: "21-15-9 Thrusters and Pull-ups" },
  { id: "w2", title: "Workout 2: AMRAP 12", description: "10 Box Jumps, 10 KB Swings, 10 Burpees" },
];

export default function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>(mockEvents);
  const [myEntries, setMyEntries] = useState<EventEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [activeView, setActiveView] = useState<"browse" | "organiser">("browse");
  const [isOrganiser, setIsOrganiser] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [eventsRes, entriesRes, organisedRes] = await Promise.all([
      supabase.from("events").select("*").eq("status", "published"),
      supabase.from("event_entries").select("*").eq("user_id", user.id),
      supabase.from("events").select("id").eq("organiser_id", user.id),
    ]);

    if (eventsRes.data && eventsRes.data.length > 0) {
      setEvents(eventsRes.data);
    }
    
    setMyEntries(entriesRes.data || []);
    setIsOrganiser((organisedRes.data || []).length > 0);
    setLoading(false);
  };

  const handleEnterEvent = async (eventId: string) => {
    if (!user) return;

    const { error } = await supabase.from("event_entries").insert({
      event_id: eventId,
      user_id: user.id,
      status: "registered",
    });

    if (error) {
      toast.error("Failed to enter event");
    } else {
      toast.success("Successfully entered!");
      fetchData();
    }
  };

  const isEntered = (eventId: string) => myEntries.some((e) => e.event_id === eventId);

  const filteredEvents = events.filter((event) =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen pt-safe px-4 pb-4 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-safe px-4 pb-24">
      {/* Header */}
      <header className="pt-6 pb-4">
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

      {/* View Toggle (if organiser) */}
      {isOrganiser && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 mt-4"
        >
          <button
            onClick={() => setActiveView("browse")}
            className={cn(
              "flex-1 py-2 rounded-full text-sm font-medium transition-colors",
              activeView === "browse"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            Browse Events
          </button>
          <button
            onClick={() => setActiveView("organiser")}
            className={cn(
              "flex-1 py-2 rounded-full text-sm font-medium transition-colors",
              activeView === "organiser"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            Organiser
          </button>
        </motion.div>
      )}

      {/* Browse View */}
      {activeView === "browse" && (
        <>
          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4"
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
          </motion.div>

          {/* Event Cards */}
          <div className="mt-6 space-y-4">
            {filteredEvents.map((event, idx) => (
              <motion.button
                key={event.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + idx * 0.05 }}
                onClick={() => setSelectedEvent(event)}
                className="w-full bg-card rounded-xl shadow-card border border-border/50 overflow-hidden text-left"
              >
                {event.image_url && (
                  <div className="h-32 bg-muted">
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{event.title}</h3>
                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        {event.event_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(event.event_date), "MMM d, yyyy")}
                          </span>
                        )}
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                  {isEntered(event.id) && (
                    <span className="inline-block mt-3 px-2 py-0.5 bg-primary/20 text-accent-foreground rounded-full text-xs font-medium">
                      Entered
                    </span>
                  )}
                </div>
              </motion.button>
            ))}

            {filteredEvents.length === 0 && (
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 text-center">
                <p className="text-muted-foreground">No events found</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Organiser View */}
      {activeView === "organiser" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6"
        >
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button className="bg-card rounded-xl p-4 shadow-card border border-border/50 text-left">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-medium">Create Event</p>
              <p className="text-xs text-muted-foreground">New competition</p>
            </button>
            <button className="bg-card rounded-xl p-4 shadow-card border border-border/50 text-left">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-medium">Manage Entries</p>
              <p className="text-xs text-muted-foreground">View participants</p>
            </button>
            <button className="bg-card rounded-xl p-4 shadow-card border border-border/50 text-left">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                <ClipboardList className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-medium">Workouts</p>
              <p className="text-xs text-muted-foreground">Publish workouts</p>
            </button>
            <button className="bg-card rounded-xl p-4 shadow-card border border-border/50 text-left">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                <Trophy className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-medium">Leaderboard</p>
              <p className="text-xs text-muted-foreground">Update scores</p>
            </button>
          </div>

          <div className="bg-card rounded-xl p-4 shadow-card border border-border/50">
            <p className="text-sm text-muted-foreground text-center py-4">
              Organiser tools will appear here when you create events
            </p>
          </div>
        </motion.div>
      )}

      {/* Event Detail Sheet */}
      <AnimatePresence>
        {selectedEvent && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[69]"
              onClick={() => setSelectedEvent(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-[70] shadow-elevated max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-4 pb-0 relative flex-shrink-0">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="absolute right-4 top-4 p-2 rounded-full bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-6 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
                <h2 className="text-xl font-semibold mb-2">{selectedEvent.title}</h2>
                
                <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                  {selectedEvent.event_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(selectedEvent.event_date), "MMMM d, yyyy")}
                    </span>
                  )}
                  {selectedEvent.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {selectedEvent.location}
                    </span>
                  )}
                </div>

                {selectedEvent.description && (
                  <p className="text-sm text-muted-foreground mb-6">{selectedEvent.description}</p>
                )}

                {!isEntered(selectedEvent.id) ? (
                  <Button
                    onClick={() => handleEnterEvent(selectedEvent.id)}
                    className="w-full mb-6"
                  >
                    Enter Event
                  </Button>
                ) : (
                  <div className="bg-primary/10 rounded-xl p-4 mb-6 text-center">
                    <p className="font-medium text-accent-foreground">You're entered!</p>
                    <p className="text-sm text-muted-foreground mt-1">Good luck!</p>
                  </div>
                )}

                {/* Workouts Section */}
                <div className="mb-6">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" /> Workouts
                  </h3>
                  <div className="space-y-2">
                    {mockWorkouts.map((workout) => (
                      <div
                        key={workout.id}
                        className="bg-muted rounded-xl p-3"
                      >
                        <p className="font-medium text-sm">{workout.title}</p>
                        <p className="text-xs text-muted-foreground">{workout.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Leaderboard Section */}
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Trophy className="h-4 w-4" /> Leaderboard
                  </h3>
                  <div className="bg-muted rounded-xl overflow-hidden">
                    {mockLeaderboard.map((entry, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-center justify-between px-4 py-3",
                          idx !== mockLeaderboard.length - 1 && "border-b border-border/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                              entry.rank === 1 && "bg-yellow-500 text-yellow-950",
                              entry.rank === 2 && "bg-gray-300 text-gray-700",
                              entry.rank === 3 && "bg-amber-600 text-amber-950",
                              entry.rank > 3 && "bg-muted-foreground/20"
                            )}
                          >
                            {entry.rank}
                          </span>
                          <span className="text-sm font-medium">{entry.name}</span>
                        </div>
                        <span className="text-sm font-semibold">{entry.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
