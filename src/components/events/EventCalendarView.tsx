import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar, MapPin } from "lucide-react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek
} from "date-fns";
import { cn } from "@/lib/utils";

interface Event {
  id: string;
  title: string;
  event_date: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  status: string;
}

interface EventCalendarViewProps {
  events: Event[];
  onEventClick: (event: Event) => void;
}

export function EventCalendarView({ events, onEventClick }: EventCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const eventsOnDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = event.start_date || event.event_date;
      return eventDate && isSameDay(new Date(eventDate), date);
    });
  };

  const upcomingEventsThisMonth = useMemo(() => {
    return events
      .filter(event => {
        const eventDate = event.start_date || event.event_date;
        if (!eventDate) return false;
        const date = new Date(eventDate);
        return isSameMonth(date, currentMonth) && date >= new Date();
      })
      .sort((a, b) => {
        const dateA = a.start_date || a.event_date || '';
        const dateB = b.start_date || b.event_date || '';
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      });
  }, [events, currentMonth]);

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="font-semibold">{format(currentMonth, "MMMM yyyy")}</h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-border/50">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
            <div key={idx} className="py-2 text-center text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dayEvents = eventsOnDate(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());
            const hasEvents = dayEvents.length > 0;

            return (
              <button
                key={idx}
                onClick={() => hasEvents && onEventClick(dayEvents[0])}
                disabled={!hasEvents}
                className={cn(
                  "relative py-3 text-center text-sm transition-colors",
                  !isCurrentMonth && "text-muted-foreground/40",
                  isToday && "font-bold",
                  hasEvents && "cursor-pointer hover:bg-muted"
                )}
              >
                <span className={cn(
                  "inline-flex items-center justify-center w-7 h-7 rounded-full",
                  isToday && "bg-primary text-primary-foreground"
                )}>
                  {format(day, "d")}
                </span>
                {hasEvents && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {dayEvents.slice(0, 3).map((_, i) => (
                      <div key={i} className="w-1 h-1 rounded-full bg-accent" />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events This Month */}
      {upcomingEventsThisMonth.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">This Month</h4>
          {upcomingEventsThisMonth.map((event) => (
            <motion.button
              key={event.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => onEventClick(event)}
              className="w-full bg-card rounded-xl p-3 border border-border/50 text-left flex items-center gap-3 hover:bg-muted/50 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{event.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {format(new Date(event.start_date || event.event_date || ''), "MMM d")}
                  </span>
                  {event.location && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
