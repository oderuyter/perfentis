import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkoutRecovery } from "@/hooks/useWorkoutSync";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function WorkoutRecoveryPrompt() {
  const navigate = useNavigate();
  const { hasRecoverableWorkout, recoverableState, clearRecovery } = useWorkoutRecovery();

  if (!hasRecoverableWorkout || !recoverableState) {
    return null;
  }

  const handleResume = () => {
    navigate(`/workout/${recoverableState.workoutId}`);
  };

  const handleDiscard = () => {
    clearRecovery();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mb-4"
      >
        <div className="card-glass border-accent/30 p-4 relative overflow-hidden">
          {/* Accent gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-transparent" />
          
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
                <Play className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-sm">Resume Workout?</p>
                <p className="text-xs text-muted-foreground">
                  You have an unfinished session
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
              <span className="font-medium text-foreground">
                {recoverableState.workoutName}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatTime(recoverableState.elapsedTime)}
              </span>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleResume} 
                size="sm" 
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-1" />
                Resume
              </Button>
              <Button 
                onClick={handleDiscard} 
                variant="ghost" 
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
