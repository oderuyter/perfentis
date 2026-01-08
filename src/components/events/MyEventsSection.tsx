import { motion } from "framer-motion";
import { Calendar, MapPin, Users, ChevronRight, Clock } from "lucide-react";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { useUserEvents } from "@/hooks/useUserEvents";
import { cn } from "@/lib/utils";

interface MyEventsSectionProps {
  onEventClick: (eventId: string) => void;
}

export function MyEventsSection({ onEventClick }: MyEventsSectionProps) {
  const { upcomingEvents, pastEvents, isLoading } = useUserEvents();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-20 bg-muted animate-pulse rounded-xl" />
        <div className="h-20 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (upcomingEvents.length === 0 && pastEvents.length === 0) {
    return (
      <div className="bg-card rounded-xl p-6 border border-border/50 text-center">
        <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
        <p className="font-medium">No Events Yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Browse events and register to compete!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Upcoming</h3>
          {upcomingEvents.map((reg, idx) => {
            const eventDate = reg.event?.start_date || reg.event?.event_date;
            const daysUntil = eventDate ? differenceInDays(new Date(eventDate), new Date()) : null;

            return (
              <motion.button
                key={reg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => onEventClick(reg.event_id)}
                className="w-full bg-card rounded-xl p-4 border border-border/50 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{reg.event?.title}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {eventDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(eventDate), "MMM d")}
                        </span>
                      )}
                      {reg.division && (
                        <span className="px-1.5 py-0.5 bg-muted rounded">
                          {reg.division.name}
                        </span>
                      )}
                      {reg.team && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {reg.team.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {daysUntil !== null && daysUntil >= 0 && (
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-full font-medium",
                        daysUntil <= 7 ? "bg-accent/20 text-accent-foreground" : "bg-muted"
                      )}>
                        {daysUntil === 0 ? "Today" : `${daysUntil}d`}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Past</h3>
          {pastEvents.slice(0, 3).map((reg, idx) => {
            const eventDate = reg.event?.end_date || reg.event?.event_date;

            return (
              <motion.button
                key={reg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => onEventClick(reg.event_id)}
                className="w-full bg-card rounded-xl p-3 border border-border/50 text-left hover:bg-muted/30 transition-colors opacity-75"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{reg.event?.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      {eventDate && (
                        <span>{format(new Date(eventDate), "MMM d, yyyy")}</span>
                      )}
                      {reg.division && (
                        <span>• {reg.division.name}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
