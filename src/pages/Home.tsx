import { motion } from "framer-motion";
import { Clock, ChevronRight, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { todayWorkout, weeklyStats } from "@/data/workouts";
import { Button } from "@/components/ui/button";
import { NextEventCard } from "@/components/events/NextEventCard";

export default function Home() {
  const greeting = getGreeting();
  
  return (
    <div className="min-h-screen pt-safe px-4 pb-4">
      {/* Header */}
      <header className="pt-6 pb-4">
        <motion.p 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-muted-foreground text-sm font-medium"
        >
          {greeting}
        </motion.p>
        <motion.h1 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-2xl font-semibold tracking-tight mt-1"
        >
          Ready to train?
        </motion.h1>
      </header>

      {/* Cards */}
      <div className="space-y-4 mt-4">
        {/* Primary Card - Today's Workout */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Link to={`/workout/${todayWorkout.id}`} className="block">
            <div className="gradient-card-accent rounded-2xl p-5 shadow-card border border-accent/20 active:scale-[0.98] transition-transform relative overflow-hidden">
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 gradient-metric opacity-30" />
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-medium text-accent-foreground uppercase tracking-wide">
                      Today's Workout
                    </p>
                    <h2 className="text-xl font-semibold mt-1">
                      {todayWorkout.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">{todayWorkout.duration} min</span>
                      <span className="text-muted-foreground/40">•</span>
                      <span className="text-sm capitalize">{todayWorkout.type}</span>
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center shadow-sm">
                    <Play className="h-5 w-5 text-accent-foreground ml-0.5" />
                  </div>
                </div>
                
                <Button 
                  className="w-full h-12 rounded-xl font-semibold text-base"
                  onClick={(e) => e.stopPropagation()}
                  asChild
                >
                  <Link to={`/workout/${todayWorkout.id}/active`}>
                    Start Workout
                  </Link>
                </Button>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Next Event Card */}
        <NextEventCard />

        {/* Secondary Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Weekly Sessions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="bg-card rounded-xl p-4 shadow-card border border-border/50">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                This Week
              </p>
              <p className="text-2xl font-semibold mt-2">
                {weeklyStats.sessionsCompleted}
                <span className="text-muted-foreground text-lg font-normal">
                  /{weeklyStats.sessionsGoal}
                </span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Sessions
              </p>
            </div>
          </motion.div>

          {/* Recent PR */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-card rounded-xl p-4 shadow-card border border-border/50">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Recent PR
              </p>
              <p className="text-lg font-semibold mt-2 leading-tight">
                {weeklyStats.recentPR.value}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {weeklyStats.recentPR.exercise}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Volume Trend Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Link to="/progress" className="block">
            <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 flex items-center justify-between active:scale-[0.98] transition-transform">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Weekly Volume
                </p>
                <p className="text-xl font-semibold mt-1">
                  {(weeklyStats.volumeThisWeek / 1000).toFixed(1)}k kg
                </p>
                <p className="text-sm text-accent-foreground mt-0.5">
                  +{Math.round(((weeklyStats.volumeThisWeek - weeklyStats.volumeLastWeek) / weeklyStats.volumeLastWeek) * 100)}% vs last week
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
