import { motion } from "framer-motion";
import { Clock, Dumbbell, Heart, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { workouts } from "@/data/workouts";

const typeIcons = {
  strength: Dumbbell,
  cardio: Heart,
  mixed: Zap,
};

export default function Train() {
  return (
    <div className="min-h-screen pt-safe px-4 pb-4">
      {/* Header */}
      <header className="pt-6 pb-4">
        <motion.h1 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold tracking-tight"
        >
          Train
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-muted-foreground text-sm mt-1"
        >
          Choose your workout
        </motion.p>
      </header>

      {/* Workout List */}
      <div className="space-y-3 mt-4">
        {workouts.map((workout, index) => {
          const TypeIcon = typeIcons[workout.type];
          
          return (
            <motion.div
              key={workout.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <Link to={`/workout/${workout.id}`} className="block">
                <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 active:scale-[0.98] transition-transform">
                  <div className="flex items-start gap-4">
                    <div className="h-11 w-11 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                      <TypeIcon className="h-5 w-5 text-accent-foreground" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base">
                        {workout.name}
                      </h3>
                      {workout.focus && (
                        <p className="text-sm text-muted-foreground mt-0.5 truncate">
                          {workout.focus}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-xs">{workout.duration} min</span>
                        </div>
                        <span className="text-xs text-muted-foreground capitalize">
                          {workout.type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {workout.exercises.length} exercises
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}

        {/* Free Workout Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + workouts.length * 0.05 }}
        >
          <Link to="/workout/free" className="block">
            <div className="bg-secondary/50 rounded-xl p-4 border border-dashed border-border active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center">
                  <Zap className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Free Workout</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Log as you go
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
