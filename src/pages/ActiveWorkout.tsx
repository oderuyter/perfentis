import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, SkipForward, Heart, ChevronUp } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { workouts, type Exercise } from "@/data/workouts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WorkoutPhase = "exercise" | "rest" | "complete";

interface SetLog {
  exerciseIndex: number;
  setNumber: number;
  completed: boolean;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function ActiveWorkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const workout = workouts.find(w => w.id === id);
  
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [phase, setPhase] = useState<WorkoutPhase>("exercise");
  const [restTimeRemaining, setRestTimeRemaining] = useState(90);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [setLogs, setSetLogs] = useState<SetLog[]>([]);
  const [showHROverlay, setShowHROverlay] = useState(false);
  const [currentHR] = useState(128);
  const [hrZone] = useState(2);
  
  const exercise = workout?.exercises[currentExerciseIndex];
  const isLastSet = exercise && currentSet >= exercise.sets;
  const isLastExercise = workout && currentExerciseIndex >= workout.exercises.length - 1;

  // Elapsed time counter
  useEffect(() => {
    if (phase === "complete") return;
    
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [phase]);

  // Rest timer countdown
  useEffect(() => {
    if (phase !== "rest") return;
    
    const timer = setInterval(() => {
      setRestTimeRemaining(prev => {
        if (prev <= 1) {
          setPhase("exercise");
          return 90;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [phase]);

  const handleCompleteSet = useCallback(() => {
    setSetLogs(prev => [...prev, {
      exerciseIndex: currentExerciseIndex,
      setNumber: currentSet,
      completed: true,
    }]);

    if (isLastSet && isLastExercise) {
      setPhase("complete");
    } else if (isLastSet) {
      setCurrentExerciseIndex(prev => prev + 1);
      setCurrentSet(1);
      setRestTimeRemaining(120);
      setPhase("rest");
    } else {
      setCurrentSet(prev => prev + 1);
      setRestTimeRemaining(90);
      setPhase("rest");
    }
  }, [currentExerciseIndex, currentSet, isLastSet, isLastExercise]);

  const handleSkipRest = useCallback(() => {
    setPhase("exercise");
    setRestTimeRemaining(90);
  }, []);

  const handleFinish = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handleExit = useCallback(() => {
    if (confirm("End workout early? Your progress will be saved.")) {
      navigate(-1);
    }
  }, [navigate]);

  if (!workout || !exercise) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Workout not found</p>
      </div>
    );
  }

  // Complete Screen
  if (phase === "complete") {
    const totalVolume = setLogs.length * (exercise.weight || 0) * 5;
    
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Check className="h-10 w-10 text-primary" />
          </div>
          
          <h1 className="text-2xl font-semibold mb-2">Workout Complete</h1>
          <p className="text-muted-foreground mb-8">Great work today</p>
          
          <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-8">
            <div className="bg-card rounded-xl p-4 border border-border/50">
              <p className="text-2xl font-semibold">{formatTime(elapsedTime)}</p>
              <p className="text-xs text-muted-foreground mt-1">Duration</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border/50">
              <p className="text-2xl font-semibold">{setLogs.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Sets completed</p>
            </div>
          </div>
          
          <Button 
            onClick={handleFinish}
            className="w-full max-w-xs h-12 rounded-xl font-semibold"
          >
            Done
          </Button>
        </motion.div>
      </div>
    );
  }

  const nextExercise = isLastSet && !isLastExercise 
    ? workout.exercises[currentExerciseIndex + 1] 
    : null;

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-safe pb-3 border-b border-border/30">
        <button
          onClick={handleExit}
          className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {currentExerciseIndex + 1} of {workout.exercises.length}
          </p>
          <p className="font-medium text-sm">{formatTime(elapsedTime)}</p>
        </div>
        
        {/* HR Widget */}
        <button
          onClick={() => setShowHROverlay(true)}
          className="h-10 px-3 rounded-full bg-accent/50 flex items-center gap-1.5"
        >
          <Heart className="h-4 w-4 text-hr-zone2" />
          <span className="text-sm font-medium">{currentHR}</span>
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {phase === "exercise" ? (
            <motion.div
              key="exercise"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center w-full"
            >
              <p className="text-sm text-muted-foreground mb-2">
                Set {currentSet} of {exercise.sets}
              </p>
              
              <h1 className="text-2xl font-semibold mb-6">
                {exercise.name}
              </h1>
              
              <div className="bg-card rounded-2xl p-8 shadow-card border border-border/50 mb-8">
                <p className="text-5xl font-bold tracking-tight">
                  {exercise.weight && exercise.weight > 0 
                    ? `${exercise.weight} kg` 
                    : exercise.reps}
                </p>
                {exercise.weight && exercise.weight > 0 && (
                  <p className="text-2xl text-muted-foreground mt-2">
                    × {exercise.reps}
                  </p>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="rest"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center w-full"
            >
              <p className="text-sm text-muted-foreground mb-2">Rest</p>
              
              <div className="relative w-48 h-48 mx-auto mb-6">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="8"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={553}
                    strokeDashoffset={553 * (1 - restTimeRemaining / 90)}
                    className="transition-all duration-1000 linear"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-5xl font-bold tracking-tight">
                    {formatTime(restTimeRemaining)}
                  </p>
                </div>
              </div>
              
              {nextExercise && (
                <div className="bg-muted/30 rounded-xl p-3 mb-6">
                  <p className="text-xs text-muted-foreground mb-1">Up next</p>
                  <p className="font-medium text-sm">{nextExercise.name}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Button */}
      <div className="px-6 pb-safe">
        {phase === "exercise" ? (
          <Button 
            onClick={handleCompleteSet}
            className="w-full h-14 rounded-xl font-semibold text-base gap-2"
          >
            <Check className="h-5 w-5" />
            Complete Set
          </Button>
        ) : (
          <Button 
            onClick={handleSkipRest}
            variant="secondary"
            className="w-full h-14 rounded-xl font-semibold text-base gap-2"
          >
            <SkipForward className="h-5 w-5" />
            Skip Rest
          </Button>
        )}
      </div>

      {/* HR Overlay */}
      <AnimatePresence>
        {showHROverlay && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
              onClick={() => setShowHROverlay(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-50 p-6 pb-safe shadow-elevated"
            >
              <button
                onClick={() => setShowHROverlay(false)}
                className="absolute top-3 left-1/2 -translate-x-1/2 p-1"
              >
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              </button>
              
              <div className="pt-4">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-4xl font-bold">{currentHR}</p>
                    <p className="text-sm text-muted-foreground">bpm</p>
                  </div>
                  <div className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium",
                    hrZone === 1 && "bg-hr-zone1/20 text-hr-zone1",
                    hrZone === 2 && "bg-hr-zone2/20 text-hr-zone2",
                    hrZone === 3 && "bg-hr-zone3/20 text-hr-zone3",
                    hrZone === 4 && "bg-hr-zone4/20 text-hr-zone4",
                    hrZone === 5 && "bg-hr-zone5/20 text-hr-zone5",
                  )}>
                    Zone {hrZone}
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                  Time in Zone
                </p>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map(zone => (
                    <div key={zone} className="flex items-center gap-3">
                      <span className="text-xs w-6 text-muted-foreground">Z{zone}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            zone === 1 && "bg-hr-zone1",
                            zone === 2 && "bg-hr-zone2",
                            zone === 3 && "bg-hr-zone3",
                            zone === 4 && "bg-hr-zone4",
                            zone === 5 && "bg-hr-zone5",
                          )}
                          style={{ 
                            width: zone === 2 ? "65%" : zone === 3 ? "20%" : zone === 1 ? "10%" : "5%" 
                          }}
                        />
                      </div>
                      <span className="text-xs w-10 text-right text-muted-foreground">
                        {zone === 2 ? "12:30" : zone === 3 ? "3:45" : zone === 1 ? "2:00" : "0:30"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
