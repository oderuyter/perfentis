import { motion } from "framer-motion";
import { Clock, ChevronRight, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { todayWorkout, weeklyStats } from "@/data/workouts";
import { Button } from "@/components/ui/button";
import { NextEventCard } from "@/components/events/NextEventCard";

export default function Home() {
  const greeting = getGreeting();
  
  return (
    <div className="min-h-screen gradient-page pt-safe px-4 pb-28">
      {/* Ambient glow */}
      <div className="fixed inset-0 gradient-glow pointer-events-none" />
      
      {/* Header */}
      <header className="relative pt-14 pb-6">
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
          className="text-2xl font-bold tracking-tight mt-1"
        >
          Ready to train?
        </motion.h1>
      </header>

      {/* Cards */}
      <div className="relative space-y-4">
        {/* Primary Card - Today's Workout */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Link to={`/workout/${todayWorkout.id}`} className="block">
            <div className="card-glass-accent p-5 active:scale-[0.98] transition-transform">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Today's Workout
                  </p>
                  <h2 className="text-xl font-bold mt-1.5">
                    {todayWorkout.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">{todayWorkout.duration} min</span>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="text-sm capitalize">{todayWorkout.type}</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Play className="h-5 w-5 text-primary ml-0.5" />
                </div>
              </div>
              
              <Button 
                variant="glow"
                className="w-full h-12 rounded-xl font-semibold"
                onClick={(e) => e.stopPropagation()}
                asChild
              >
                <Link to={`/workout/${todayWorkout.id}/active`}>
                  Start Workout
                </Link>
              </Button>
            </div>
          </Link>
        </motion.div>

        {/* Next Event Card */}
        <NextEventCard />

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Weekly Sessions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="card-glass p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                This Week
              </p>
              <p className="text-3xl font-bold mt-3 text-foreground">
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
            <div className="card-glass p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Recent PR
              </p>
              <p className="text-xl font-bold mt-3 text-foreground leading-tight">
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
            <div className="card-glass p-5 flex items-center justify-between active:scale-[0.98] transition-transform">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Weekly Volume
                </p>
                <p className="text-2xl font-bold mt-2 text-foreground">
                  {(weeklyStats.volumeThisWeek / 1000).toFixed(1)}k kg
                </p>
                <p className="text-sm text-status-success mt-1 font-medium">
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
