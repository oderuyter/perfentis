import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  X, 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Trophy, 
  ClipboardList,
  Lock,
  ChevronRight
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EventRegistrationSheet } from "./EventRegistrationSheet";

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

interface Division {
  id: string;
  name: string;
  description: string | null;
  capacity: number | null;
  team_size: number | null;
  difficulty_level: string | null;
}

interface Workout {
  id: string;
  title: string;
  description: string | null;
  workout_type: string | null;
  time_cap_seconds: number | null;
  is_published: boolean | null;
  released_at: string | null;
}

interface EventDetailSheetProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  isRegistered?: boolean;
  onRegistrationChange?: () => void;
}

export function EventDetailSheet({ 
  event, 
  isOpen, 
  onClose, 
  isRegistered = false,
  onRegistrationChange 
}: EventDetailSheetProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"info" | "workouts" | "leaderboard">("info");
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);

  useEffect(() => {
    if (event && isOpen) {
      fetchEventDetails();
    }
  }, [event, isOpen]);

  const fetchEventDetails = async () => {
    if (!event) return;
    setIsLoadingDetails(true);

    try {
      const [divisionsRes, workoutsRes] = await Promise.all([
        supabase
          .from("event_divisions")
          .select("*")
          .eq("event_id", event.id)
          .eq("is_active", true)
          .order("display_order"),
        supabase
          .from("event_workouts")
          .select("*")
          .eq("event_id", event.id)
          .order("display_order"),
      ]);

      setDivisions(divisionsRes.data || []);
      setWorkouts(workoutsRes.data || []);
    } catch (error) {
      console.error("Error fetching event details:", error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const eventDate = event?.start_date || event?.event_date;
  const isUpcoming = eventDate && new Date(eventDate) > new Date();

  if (!event) return null;

  if (!isOpen) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[69]"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-[70] shadow-elevated h-[85vh] overflow-hidden flex flex-col"
      >
            {/* Header with close button */}
            <div className="relative flex-shrink-0">
              {/* Drag handle */}
              <div className="flex justify-center py-3">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              
              <button
                onClick={onClose}
                className="absolute right-4 top-3 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Title section */}
              <div className="px-4 pb-2">
                <h2 className="text-xl font-semibold pr-10 mb-2">{event.title}</h2>
                
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {eventDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(eventDate), "MMM d, yyyy")}
                    </span>
                  )}
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </span>
                  )}
                  {event.event_mode && (
                    <span className="px-2 py-0.5 bg-muted rounded-full text-xs capitalize">
                      {event.event_mode}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-4">
                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-muted rounded-lg mb-4">
                  {["info", "workouts", "leaderboard"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab as typeof activeTab)}
                      className={cn(
                        "flex-1 py-2 text-sm font-medium rounded-md transition-colors capitalize",
                        activeTab === tab
                          ? "bg-card shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="pb-[calc(env(safe-area-inset-bottom)+6rem)]">
                  {activeTab === "info" && (
                    <div className="space-y-4">
                      {event.description && (
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      )}

                      {divisions.length > 0 && (
                        <div>
                          <h3 className="font-medium mb-2 flex items-center gap-2">
                            <Users className="h-4 w-4" /> Divisions
                          </h3>
                          <div className="space-y-2">
                            {divisions.map((division) => (
                              <div
                                key={division.id}
                                className="bg-muted rounded-xl p-3"
                              >
                                <div className="flex items-center justify-between">
                                  <p className="font-medium text-sm">{division.name}</p>
                                  {division.difficulty_level && (
                                    <span className="text-xs px-2 py-0.5 bg-background rounded-full">
                                      {division.difficulty_level}
                                    </span>
                                  )}
                                </div>
                                {division.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {division.description}
                                  </p>
                                )}
                                {division.team_size && division.team_size > 1 && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Team of {division.team_size}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {event.rules && (
                        <div>
                          <h3 className="font-medium mb-2">Rules & Standards</h3>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {event.rules}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "workouts" && (
                    <div className="space-y-2">
                      {workouts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Workouts not yet released</p>
                        </div>
                      ) : (
                        workouts.map((workout) => {
                          const isReleased = workout.is_published && 
                            (!workout.released_at || new Date(workout.released_at) <= new Date());

                          return (
                            <div
                              key={workout.id}
                              className={cn(
                                "bg-muted rounded-xl p-3",
                                !isReleased && "opacity-60"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {!isReleased && <Lock className="h-4 w-4" />}
                                  <p className="font-medium text-sm">{workout.title}</p>
                                </div>
                                {workout.workout_type && (
                                  <span className="text-xs px-2 py-0.5 bg-background rounded-full capitalize">
                                    {workout.workout_type}
                                  </span>
                                )}
                              </div>
                              {isReleased && workout.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {workout.description}
                                </p>
                              )}
                              {!isReleased && workout.released_at && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Releases {formatDistanceToNow(new Date(workout.released_at), { addSuffix: true })}
                                </p>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {activeTab === "leaderboard" && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Leaderboard available during event</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Registration CTA */}
            <div className="flex-shrink-0 p-4 border-t border-border bg-card pb-safe">
              {isRegistered ? (
                <div className="bg-accent/10 rounded-xl p-3 text-center">
                  <p className="font-medium text-accent-foreground">You're registered!</p>
                  <p className="text-sm text-muted-foreground">
                    {isUpcoming ? "Good luck!" : "Thanks for participating"}
                  </p>
                </div>
              ) : isUpcoming ? (
                <Button 
                  className="w-full"
                  onClick={() => setShowRegistration(true)}
                >
                  Register Now
                </Button>
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  Registration closed
                </div>
              )}
            </div>
          </motion.div>

      {/* Registration Sheet - rendered inside the detail sheet */}
      <EventRegistrationSheet
        eventId={event.id}
        eventTitle={event.title}
        isOpen={showRegistration}
        onClose={() => setShowRegistration(false)}
        onSuccess={() => {
          onRegistrationChange?.();
          setShowRegistration(false);
        }}
      />
    </>
  );
}
