import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, Dumbbell, ArrowRight } from "lucide-react";
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
  
  // Check for active workout on mount and location change
  useEffect(() => {
    const state = loadSavedWorkout();
    setWorkoutState(state);
    if (state) {
      setElapsedTime(state.elapsedTime);
    }
  }, [location.pathname]);
  
  // Keep elapsed time updated while showing the biscuit
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
  
  const currentExercise = workoutState.exercises[workoutState.currentExerciseIndex];
  const currentSetNum = workoutState.currentSetIndex + 1;
  const totalSets = currentExercise?.sets.length || 0;
  
  const handleClick = () => {
    navigate(`/workout/${workoutState.workoutId}/active`);
  };

  return (
    <AnimatePresence>
      <motion.button
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={handleClick}
        className="fixed bottom-20 left-4 right-4 z-50 gradient-card-accent rounded-2xl p-4 shadow-lg border border-accent/30 active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Pulsing indicator */}
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                <Dumbbell className="h-5 w-5 text-accent-foreground" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-accent rounded-full animate-pulse-soft ring-2 ring-background" />
            </div>
            
            <div className="text-left">
              <div className="flex items-center gap-2">
                <Timer className="h-3.5 w-3.5 text-accent-foreground" />
                <span className="text-sm font-bold text-accent-foreground">{formatTime(elapsedTime)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">
                {currentExercise?.name} • Set {currentSetNum}/{totalSets}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-accent-foreground">
            <span className="text-sm font-semibold">Continue</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </motion.button>
    </AnimatePresence>
  );
}
