import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { format, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from "date-fns";
import { useUserEvents } from "@/hooks/useUserEvents";
import { cn } from "@/lib/utils";

export function NextEventCard() {
  const { nextEvent, isLoading } = useUserEvents();
  const [countdown, setCountdown] = useState<string>("");

  useEffect(() => {
    if (!nextEvent) return;

    const eventDate = nextEvent.event?.start_date || nextEvent.event?.event_date;
    if (!eventDate) return;

    const updateCountdown = () => {
      const now = new Date();
      const target = new Date(eventDate);
      
      if (target <= now) {
        setCountdown("Now!");
        return;
      }

      const days = differenceInDays(target, now);
      const hours = differenceInHours(target, now) % 24;
      const minutes = differenceInMinutes(target, now) % 60;

      if (days > 0) {
        setCountdown(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m`);
      } else {
        const seconds = differenceInSeconds(target, now) % 60;
        setCountdown(`${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextEvent]);

  if (isLoading || !nextEvent) return null;

  const eventDate = nextEvent.event?.start_date || nextEvent.event?.event_date;
  const daysUntil = eventDate ? differenceInDays(new Date(eventDate), new Date()) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Link to="/events" className="block">
        <div className="bg-card rounded-xl p-4 shadow-card border border-accent/30 hover:border-accent/50 transition-colors relative overflow-hidden">
          {/* Gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent to-primary" />
          
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-accent uppercase tracking-wide">
                Next Event
              </p>
              <h3 className="font-semibold mt-1 truncate">{nextEvent.event?.title}</h3>
              
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                {eventDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(eventDate), "MMM d")}
                  </span>
                )}
                {nextEvent.event?.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {nextEvent.event.location}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <div className={cn(
                "px-3 py-1.5 rounded-lg text-center",
                daysUntil !== null && daysUntil <= 3 
                  ? "bg-accent text-accent-foreground" 
                  : "bg-muted"
              )}>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span className="text-sm font-bold tabular-nums">{countdown}</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
