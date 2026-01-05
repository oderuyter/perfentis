import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WorkoutCalendarProps {
  workoutDates: Date[];
  onDayClick: (date: Date, hasWorkouts: boolean) => void;
}

export const WorkoutCalendar = ({ workoutDates, onDayClick }: WorkoutCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const hasWorkout = (date: Date) => {
    return workoutDates.some(workoutDate => isSameDay(workoutDate, date));
  };

  const getWorkoutCount = (date: Date) => {
    return workoutDates.filter(workoutDate => isSameDay(workoutDate, date)).length;
  };

  const isToday = (date: Date) => isSameDay(date, new Date());

  return (
    <div className="bg-card rounded-2xl p-4 border border-border/50">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold text-foreground">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const inCurrentMonth = isSameMonth(day, currentMonth);
          const dayHasWorkout = hasWorkout(day);
          const workoutCount = getWorkoutCount(day);
          const dayIsToday = isToday(day);

          return (
            <button
              key={index}
              onClick={() => dayHasWorkout && onDayClick(day, dayHasWorkout)}
              disabled={!dayHasWorkout}
              className={cn(
                "relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all",
                !inCurrentMonth && "text-muted-foreground/40",
                inCurrentMonth && !dayHasWorkout && "text-foreground",
                dayHasWorkout && "cursor-pointer hover:bg-primary/10",
                dayIsToday && "ring-2 ring-primary ring-offset-1 ring-offset-background"
              )}
            >
              <span className={cn(
                "font-medium",
                dayHasWorkout && inCurrentMonth && "text-primary"
              )}>
                {format(day, "d")}
              </span>
              {dayHasWorkout && inCurrentMonth && (
                <div className="flex gap-0.5 mt-0.5">
                  {Array.from({ length: Math.min(workoutCount, 3) }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-primary"
                    />
                  ))}
                  {workoutCount > 3 && (
                    <span className="text-[8px] text-primary font-bold">+</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
