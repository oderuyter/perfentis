import { format, addDays, subDays, isSameDay, isToday } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NutritionDay } from "@/hooks/useNutrition";

interface DateStripProps {
  selectedDate: Date;
  weekData: NutritionDay[];
  calorieGoal: number;
  onDateSelect: (date: Date) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function DateStrip({
  selectedDate,
  weekData,
  calorieGoal,
  onDateSelect,
  onPrev,
  onNext,
}: DateStripProps) {
  const days = Array.from({ length: 7 }, (_, i) => subDays(selectedDate, 3 - i));

  const getGoalPct = (date: Date) => {
    const dayData = weekData.find((d) => d.date === format(date, "yyyy-MM-dd"));
    if (!dayData || calorieGoal <= 0) return 0;
    return Math.min(Number(dayData.total_calories) / calorieGoal, 1);
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onPrev}
        className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex-1 flex justify-between gap-0.5">
        {days.map((date) => {
          const selected = isSameDay(date, selectedDate);
          const today = isToday(date);
          const pct = getGoalPct(date);

          return (
            <button
              key={date.toISOString()}
              onClick={() => onDateSelect(date)}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg transition-all",
                selected
                  ? "bg-primary/10"
                  : "hover:bg-muted/30"
              )}
            >
              <span
                className={cn(
                  "text-[9px] uppercase font-medium",
                  selected ? "text-primary" : "text-muted-foreground"
                )}
              >
                {format(date, "EEE")}
              </span>
              <span
                className={cn(
                  "text-xs font-semibold tabular-nums",
                  selected ? "text-primary" : today ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {format(date, "d")}
              </span>
              {/* Mini progress dot */}
              <div className="h-1 w-5 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    pct >= 0.9
                      ? "bg-[hsl(var(--status-success))]"
                      : pct > 0.5
                      ? "bg-[hsl(var(--status-warning))]"
                      : pct > 0
                      ? "bg-primary"
                      : ""
                  )}
                  style={{ width: `${pct * 100}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={onNext}
        className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
