import { useState } from "react";
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
  endOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DayFlags } from "@/hooks/useProgressData";

interface ActivityCalendarProps {
  monthDate: Date;
  onMonthChange: (date: Date) => void;
  dayFlags: DayFlags[];
  onDayClick: (date: Date) => void;
}

// Segment colors keyed to activity type
const SEGMENTS = [
  { key: "hasWorkout", color: "hsl(var(--accent-primary))" },
  { key: "hasRun", color: "hsl(var(--status-success))" },
  { key: "hasHabit", color: "hsl(var(--status-warning))" },
  { key: "hasFood", color: "hsl(270 60% 58%)" },
  { key: "hasPhoto", color: "hsl(340 65% 55%)" },
] as const;

const SegmentedRing = ({ flags, size = 36, strokeWidth = 3 }: { flags: DayFlags | undefined; size?: number; strokeWidth?: number }) => {
  if (!flags) return null;

  const activeSegments = SEGMENTS.filter((s) => flags[s.key as keyof DayFlags]);
  if (activeSegments.length === 0) return null;

  const r = (size - strokeWidth - 2) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const gap = activeSegments.length > 1 ? 3 : 0;
  const totalGap = gap * activeSegments.length;
  const segmentLength = (circumference - totalGap) / activeSegments.length;

  return (
    <svg
      width={size}
      height={size}
      className="absolute inset-0"
      style={{ transform: "rotate(-90deg)" }}
    >
      {activeSegments.map((seg, i) => {
        const offset = i * (segmentLength + gap);
        return (
          <circle
            key={seg.key}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
};

export const ActivityCalendar = ({
  monthDate,
  onMonthChange,
  dayFlags,
  onDayClick,
}: ActivityCalendarProps) => {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  const getFlagsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return dayFlags.find((f) => f.date === dateStr);
  };

  const hasAnyActivity = (flags: DayFlags | undefined) => {
    if (!flags) return false;
    return flags.hasWorkout || flags.hasRun || flags.hasHabit || flags.hasFood || flags.hasPhoto;
  };

  const isToday = (date: Date) => isSameDay(date, new Date());

  return (
    <div className="card-glass rounded-2xl p-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMonthChange(subMonths(monthDate, 1))}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold text-foreground">{format(monthDate, "MMMM yyyy")}</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMonthChange(addMonths(monthDate, 1))}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const inMonth = isSameMonth(day, monthDate);
          const flags = getFlagsForDay(day);
          const active = hasAnyActivity(flags);
          const today = isToday(day);

          return (
            <button
              key={i}
              onClick={() => onDayClick(day)}
              className={cn(
                "relative aspect-square flex items-center justify-center rounded-lg text-sm transition-all",
                !inMonth && "text-muted-foreground/30",
                inMonth && "text-foreground",
                active && "cursor-pointer",
                today && "font-bold"
              )}
            >
              <SegmentedRing flags={flags} size={36} strokeWidth={3.5} />
              <span
                className={cn(
                  "relative z-10",
                  today && "text-primary"
                )}
              >
                {format(day, "d")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-border/30">
        {SEGMENTS.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-[10px] text-muted-foreground capitalize">
              {s.key.replace("has", "")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
