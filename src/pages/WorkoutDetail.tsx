import { motion } from "framer-motion";
import { ArrowLeft, Clock, Dumbbell, Play } from "lucide-react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { workouts } from "@/data/workouts";
import { Button } from "@/components/ui/button";

export default function WorkoutDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const workout = workouts.find(w => w.id === id);
  
  if (!workout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Workout not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-safe">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-full bg-muted flex items-center justify-center active:bg-muted/70 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-lg truncate">{workout.name}</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 pb-4">
        {/* Overview */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-6"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center">
              <Dumbbell className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{workout.duration} min</span>
                <span className="text-muted-foreground/40">•</span>
                <span className="text-sm capitalize">{workout.type}</span>
              </div>
              {workout.focus && (
                <p className="text-sm text-muted-foreground mt-1">
                  {workout.focus}
                </p>
              )}
            </div>
          </div>

          <Button 
            className="w-full h-12 rounded-xl font-semibold text-base gap-2"
            asChild
          >
            <Link to={`/workout/${id}/active`}>
              <Play className="h-5 w-5" />
              Start Workout
            </Link>
          </Button>
        </motion.div>

        {/* Exercise List */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Exercises ({workout.exercises.length})
          </h2>
          
          <div className="space-y-2">
            {workout.exercises.map((exercise, index) => (
              <div
                key={exercise.id}
                className="bg-card rounded-xl p-4 border border-border/50"
              >
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-muted-foreground">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{exercise.name}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {exercise.sets} sets × {exercise.reps}
                      {exercise.weight !== undefined && exercise.weight > 0 && (
                        <span> @ {exercise.weight} kg</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Notes */}
        {workout.description && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-6"
          >
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Notes
            </h2>
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-sm text-muted-foreground">{workout.description}</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
