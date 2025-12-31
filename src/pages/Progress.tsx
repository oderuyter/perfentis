import { motion } from "framer-motion";
import { TrendingUp, Award, Timer, Dumbbell } from "lucide-react";
import { progressData } from "@/data/workouts";

export default function Progress() {
  const volumeChange = Math.round(
    ((progressData.weeklyVolume[3].volume - progressData.weeklyVolume[2].volume) / 
    progressData.weeklyVolume[2].volume) * 100
  );

  return (
    <div className="min-h-screen pt-safe px-4 pb-4">
      {/* Header */}
      <header className="pt-6 pb-4">
        <motion.h1 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold tracking-tight"
        >
          Progress
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-muted-foreground text-sm mt-1"
        >
          Track your journey
        </motion.p>
      </header>

      {/* Overview Cards */}
      <div className="space-y-4 mt-4">
        {/* Volume Trend Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl p-5 shadow-card border border-border/50"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Weekly Volume
              </p>
              <p className="text-2xl font-semibold mt-1">
                {(progressData.weeklyVolume[3].volume / 1000).toFixed(1)}k kg
              </p>
              <p className="text-sm text-accent-foreground mt-0.5 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                +{volumeChange}% vs last week
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-accent-subtle flex items-center justify-center">
              <Dumbbell className="h-5 w-5 text-accent-foreground" />
            </div>
          </div>
          
          {/* Simple bar chart */}
          <div className="flex items-end gap-2 h-16 mt-4">
            {progressData.weeklyVolume.map((week, i) => {
              const maxVolume = Math.max(...progressData.weeklyVolume.map(w => w.volume));
              const height = (week.volume / maxVolume) * 100;
              const isLatest = i === progressData.weeklyVolume.length - 1;
              
              return (
                <div key={week.week} className="flex-1 flex flex-col items-center gap-1.5">
                  <div 
                    className={`w-full rounded-md transition-all ${isLatest ? 'bg-chart-bar-active' : 'bg-chart-bar-inactive'}`}
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-xs text-muted-foreground">{week.week}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Secondary Cards Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Cardio Minutes */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-card rounded-xl p-4 shadow-card border border-border/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Cardio
              </p>
            </div>
            <p className="text-xl font-semibold">
              {progressData.cardioMinutes}
              <span className="text-muted-foreground text-base font-normal">
                /{progressData.cardioGoal} min
              </span>
            </p>
            <div className="mt-2 h-1.5 bg-chart-bar-inactive rounded-full overflow-hidden">
              <div 
                className="h-full bg-chart-bar-active rounded-full transition-all"
                style={{ width: `${(progressData.cardioMinutes / progressData.cardioGoal) * 100}%` }}
              />
            </div>
          </motion.div>

          {/* PRs This Month */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-xl p-4 shadow-card border border-border/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                PRs
              </p>
            </div>
            <p className="text-xl font-semibold">
              {progressData.recentPRs.length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              This month
            </p>
          </motion.div>
        </div>

        {/* Recent PRs List */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card rounded-xl p-4 shadow-card border border-border/50"
        >
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Recent Personal Records
          </p>
          <div className="space-y-3">
            {progressData.recentPRs.map((pr, index) => (
              <div 
                key={index}
                className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-sm">{pr.exercise}</p>
                  <p className="text-xs text-muted-foreground">{pr.date}</p>
                </div>
                <p className="text-sm font-semibold text-accent-foreground">{pr.value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
