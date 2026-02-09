import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useProgressData } from "@/hooks/useProgressData";
import { WeeklySummaryTiles } from "@/components/progress/WeeklySummaryTiles";
import { ActivityCalendar } from "@/components/progress/ActivityCalendar";
import { DayDrawer } from "@/components/progress/DayDrawer";
import { StreakCard } from "@/components/progress/StreakCard";
import { useWorkoutStreak } from "@/hooks/useWorkoutStreak";

export default function Progress() {
  const {
    weekStart,
    weekEnd,
    weekOffset,
    setWeekOffset,
    monthDate,
    setMonthDate,
    weeklySummary,
    dayFlags,
    loading,
  } = useProgressData();

  const { currentStreak, longestStreak, milestones, loading: streakLoading } = useWorkoutStreak();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setDrawerOpen(true);
  };

  if (loading || streakLoading) {
    return (
      <div className="min-h-screen gradient-page px-5 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-page px-5">
      <div className="fixed inset-0 gradient-glow pointer-events-none" />

      {/* Header */}
      <header className="relative pt-6 pb-4">
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold tracking-tight"
        >
          Progress
        </motion.h1>
      </header>

      {/* Week Selector */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="relative flex items-center justify-between mb-4"
      >
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((o) => o - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button
          onClick={() => setWeekOffset(0)}
          className="text-sm font-medium text-foreground"
        >
          {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d")}
          {weekOffset === 0 && (
            <span className="ml-2 text-xs text-primary">This week</span>
          )}
        </button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((o) => o + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </motion.div>

      <div className="relative space-y-5">
        {/* Weekly Summary Tiles */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          {weeklySummary && <WeeklySummaryTiles summary={weeklySummary} />}
        </motion.div>

        {/* Streak Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <StreakCard
            currentStreak={currentStreak}
            longestStreak={longestStreak}
            milestones={milestones}
          />
        </motion.div>

        {/* Activity Calendar */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <ActivityCalendar
            monthDate={monthDate}
            onMonthChange={setMonthDate}
            dayFlags={dayFlags}
            onDayClick={handleDayClick}
          />
        </motion.div>
      </div>

      {/* Day Drawer */}
      <DayDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        selectedDate={selectedDate}
      />
    </div>
  );
}
