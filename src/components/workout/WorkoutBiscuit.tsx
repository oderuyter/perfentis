import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { loadSavedWorkout } from "@/hooks/useWorkoutState";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function WorkoutBiscuit() {
  const navigate = useNavigate();
  const location = useLocation();
  const [workoutState, setWorkoutState] = useState(loadSavedWorkout());
  const [elapsedTime, setElapsedTime] = useState(workoutState?.elapsedTime || 0);
  
  // Check for active workout on mount, location change, and periodically
  useEffect(() => {
    const checkWorkout = () => {
      const state = loadSavedWorkout();
      setWorkoutState(state);
      if (state) {
        setElapsedTime(state.elapsedTime);
      }
    };
    
    checkWorkout();
    
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'active_workout_state' || e.key === null) {
        checkWorkout();
      }
    };
    
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(checkWorkout, 500);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [location.pathname]);
  
  // Keep elapsed time updated
  useEffect(() => {
    if (!workoutState || workoutState.status !== 'active') return;
    
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [workoutState?.status]);
  
  // Don't show if on active workout page or no workout in progress
  const isOnActiveWorkout = location.pathname.includes('/active');
  const shouldShow = workoutState && workoutState.status === 'active' && !isOnActiveWorkout;
  
  if (!shouldShow) return null;
  
  const handleClick = () => {
    navigate(`/workout/${workoutState.workoutId}/active`);
  };

  return (
    <AnimatePresence>
      <motion.button
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={handleClick}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-1 rounded-2xl bg-accent p-3 shadow-lg border border-accent/30 active:scale-95 transition-transform"
        aria-label="Resume workout"
      >
        {/* Pulsing dot */}
        <span className="absolute -top-1 -right-1 h-3 w-3 bg-accent rounded-full animate-pulse-soft ring-2 ring-background" />
        
        <Timer className="h-5 w-5 text-accent-foreground" />
        <span className="text-xs font-bold text-accent-foreground tabular-nums leading-none">
          {formatTime(elapsedTime)}
        </span>
      </motion.button>
    </AnimatePresence>
  );
}
