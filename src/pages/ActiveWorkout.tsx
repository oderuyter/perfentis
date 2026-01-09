import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, SkipForward, Heart, ChevronUp, Shuffle, Plus, History, Pause, Play, StickyNote, Trophy } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { workouts } from "@/data/workouts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWorkoutState, loadSavedWorkout, clearSavedWorkout } from "@/hooks/useWorkoutState";
import { useWorkoutHistory } from "@/hooks/useWorkoutHistory";
import { usePersonalRecords, type PersonalRecord } from "@/hooks/usePersonalRecords";
import { SetEditor } from "@/components/workout/SetEditor";
import { ExerciseHistorySheet } from "@/components/workout/ExerciseHistorySheet";
import { SwapExerciseSheet } from "@/components/workout/SwapExerciseSheet";
import { AddExerciseSheet } from "@/components/workout/AddExerciseSheet";
import { RestTimerEdit } from "@/components/workout/RestTimerEdit";
import { ExerciseNav } from "@/components/workout/ExerciseNav";
import { AdvancedMetrics } from "@/components/workout/AdvancedMetrics";
import { toast } from "sonner";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function ActiveWorkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const workout = workouts.find(w => w.id === id);
  const savedState = loadSavedWorkout();
  const resumeState = savedState?.workoutId === id ? savedState : null;
  
  const {
    state,
    completeSet,
    updateSet,
    goToExercise,
    skipRest,
    pauseRest,
    resumeRest,
    editRestDuration,
    swapExercise,
    addExercise,
    removeExercise,
    endWorkout,
  } = useWorkoutState(workout || null, resumeState);

  const { saveWorkoutSession } = useWorkoutHistory();
  const { checkAndSavePRs } = usePersonalRecords();
  const [newPRs, setNewPRs] = useState<PersonalRecord[]>([]);

  // Overlays
  const [showHROverlay, setShowHROverlay] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showRestEdit, setShowRestEdit] = useState(false);
  const [showExerciseNav, setShowExerciseNav] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(!!resumeState);

  // Navigate away without ending workout - just go back
  const handleMinimize = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Explicitly end workout
  const handleEndWorkout = useCallback(async () => {
    if (confirm("End workout? Your progress will be saved.")) {
      // Save workout session before ending
      if (state) {
        await saveWorkoutSession(state);
      }
      // Clear saved workout from localStorage first
      clearSavedWorkout();
      // Then update state to trigger re-render
      endWorkout(false);
      // Navigate after clearing
      navigate("/");
    }
  }, [navigate, endWorkout, state, saveWorkoutSession]);

  const handleFinish = useCallback(async () => {
    if (state && state.status === 'completed') {
      // Save to database
      const sessionId = await saveWorkoutSession(state);
      if (sessionId) {
        // Check for PRs
        const prs = await checkAndSavePRs(state, sessionId);
        if (prs.length > 0) {
          setNewPRs(prs);
          toast.success(`${prs.length} new PR${prs.length > 1 ? 's' : ''}!`);
        }
      }
    }
    clearSavedWorkout();
    navigate("/");
  }, [navigate, state, saveWorkoutSession, checkAndSavePRs]);

  if (!workout || !state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Workout not found</p>
      </div>
    );
  }

  const currentExercise = state.exercises[state.currentExerciseIndex];
  const currentSet = currentExercise?.sets[state.currentSetIndex];
  const isLastExercise = state.currentExerciseIndex >= state.exercises.filter(e => !e.skipped).length - 1;
  const nextExercise = !isLastExercise ? state.exercises.find((e, i) => i > state.currentExerciseIndex && !e.skipped) : null;

  // Resume Prompt
  if (showResumePrompt) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-sm">
          <div className="h-16 w-16 rounded-full gradient-card-accent flex items-center justify-center mx-auto mb-6 shadow-md">
            <Play className="h-8 w-8 text-accent-foreground ml-1" />
          </div>
          <h1 className="text-xl font-semibold mb-2">Resume Workout?</h1>
          <p className="text-muted-foreground mb-6">
            You have an unfinished {state.workoutName} session. {formatTime(state.elapsedTime)} elapsed.
          </p>
          <div className="space-y-3">
            <Button onClick={() => setShowResumePrompt(false)} className="w-full h-12 rounded-xl font-semibold">
              Resume
            </Button>
            <Button variant="secondary" onClick={() => { clearSavedWorkout(); navigate(-1); }} className="w-full h-12 rounded-xl font-semibold">
              Start Fresh
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Complete Screen
  if (state.phase === "complete") {
    const completedSets = state.exercises.flatMap(e => e.sets).filter(s => s.completed);
    const totalVolume = completedSets.reduce((sum, s) => sum + (s.completedWeight || 0) * (s.completedReps || 0), 0);
    
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="h-20 w-20 rounded-full gradient-card-accent flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Check className="h-10 w-10 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-semibold mb-2">Workout Complete</h1>
          <p className="text-muted-foreground mb-4">Great work today</p>
          
          {/* New PRs */}
          {newPRs.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="h-5 w-5 text-gold" />
                <p className="font-medium text-gold">New Personal Record{newPRs.length > 1 ? 's' : ''}!</p>
              </div>
              <div className="space-y-1">
                {newPRs.map((pr, i) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    {pr.exercise_name}: {pr.value}kg e1RM
                  </p>
                ))}
              </div>
            </motion.div>
          )}
          
          <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-8">
            <div className="gradient-card rounded-xl p-4 border border-border/50 shadow-card">
              <p className="text-2xl font-semibold">{formatTime(state.elapsedTime)}</p>
              <p className="text-xs text-muted-foreground mt-1">Duration</p>
            </div>
            <div className="gradient-card rounded-xl p-4 border border-border/50 shadow-card">
              <p className="text-2xl font-semibold">{completedSets.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Sets</p>
            </div>
          </div>
          <Button onClick={handleFinish} className="w-full max-w-xs h-12 rounded-xl font-semibold">Done</Button>
        </motion.div>
      </div>
    );
  }

  const isPaused = state.phase === 'rest' && !!state.restTimerPausedAt;

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-safe pb-3 border-b border-border/30">
        <button onClick={handleMinimize} className="h-10 w-10 rounded-full bg-muted flex items-center justify-center" title="Minimize workout">
          <X className="h-5 w-5" />
        </button>
        <button onClick={() => setShowExerciseNav(true)} className="text-center">
          <p className="text-xs text-muted-foreground">{state.currentExerciseIndex + 1} of {state.exercises.filter(e => !e.skipped).length}</p>
          <p className="font-medium text-sm">{formatTime(state.elapsedTime)}</p>
        </button>
        <button onClick={() => setShowHROverlay(true)} className="h-10 px-3 rounded-full bg-accent-subtle flex items-center gap-1.5">
          <Heart className="h-4 w-4 text-hr-zone2" />
          <span className="text-sm font-medium">{state.hrData.currentHR || '—'}</span>
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col px-4 py-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          {state.phase === "exercise" ? (
            <motion.div key="exercise" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Set {state.currentSetIndex + 1} of {currentExercise.sets.length}</p>
                  <h1 className="text-xl font-semibold">{currentExercise.name}</h1>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowHistory(true)} className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                    <History className="h-4 w-4" />
                  </button>
                  <button onClick={() => setShowSwap(true)} className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                    <Shuffle className="h-4 w-4" />
                  </button>
                  <button onClick={() => setShowAdvanced(true)} className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                    <StickyNote className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {/* Primary Metric Display with Gradient */}
              <div className="gradient-card-accent rounded-2xl p-6 shadow-card border border-accent/20 mb-4 relative overflow-hidden">
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 gradient-metric opacity-50" />
                <div className="relative">
                  <p className="text-5xl font-bold tracking-tight text-center text-accent-foreground">
                    {currentSet?.completedWeight ?? currentSet?.targetWeight ?? '—'} kg
                  </p>
                  <p className="text-2xl text-muted-foreground mt-2 text-center">× {currentSet?.completedReps ?? currentSet?.targetReps}</p>
                </div>
              </div>
              
              {/* All Sets */}
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">All Sets</p>
                <SetEditor
                  sets={currentExercise.sets}
                  currentSetIndex={state.currentSetIndex}
                  onUpdateSet={(setIndex, updates) => updateSet(state.currentExerciseIndex, setIndex, updates)}
                  onSelectSet={(setIndex) => goToExercise(state.currentExerciseIndex, setIndex)}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div key="rest" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 flex flex-col items-center justify-center">
              <p className="text-sm text-muted-foreground mb-2">Rest</p>
              <button onClick={() => setShowRestEdit(true)} className="relative w-48 h-48 mb-4">
                {/* Gradient background for rest timer */}
                <div className="absolute inset-4 rounded-full gradient-metric opacity-30" />
                <svg className="w-full h-full transform -rotate-90 relative">
                  <circle cx="96" cy="96" r="88" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                  <circle 
                    cx="96" cy="96" r="88" 
                    fill="none" 
                    stroke="url(#progressGradient)" 
                    strokeWidth="8" 
                    strokeLinecap="round" 
                    strokeDasharray={553} 
                    strokeDashoffset={553 * (1 - state.restTimeRemaining / state.restDuration)} 
                    className="transition-all duration-1000 linear" 
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="hsl(var(--accent-primary))" />
                      <stop offset="100%" stopColor="hsl(var(--accent-primary) / 0.7)" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-5xl font-bold tracking-tight">{formatTime(state.restTimeRemaining)}</p>
                </div>
              </button>
              <button onClick={isPaused ? resumeRest : pauseRest} className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              {nextExercise && (
                <div className="gradient-card rounded-xl p-3 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Up next</p>
                  <p className="font-medium text-sm">{nextExercise.name}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-safe">
        <div className="flex gap-2 mb-3">
          <button onClick={() => setShowAdd(true)} className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center">
            <Plus className="h-5 w-5" />
          </button>
          {state.phase === "exercise" ? (
            <Button onClick={completeSet} className="flex-1 h-14 rounded-xl font-semibold text-base gap-2">
              <Check className="h-5 w-5" />Complete Set
            </Button>
          ) : (
            <Button onClick={skipRest} variant="secondary" className="flex-1 h-14 rounded-xl font-semibold text-base gap-2">
              <SkipForward className="h-5 w-5" />Skip Rest
            </Button>
          )}
        </div>
        {/* End workout button */}
        <button 
          onClick={handleEndWorkout}
          className="w-full py-2 text-sm text-muted-foreground hover:text-destructive transition-colors"
        >
          End Workout
        </button>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {showHROverlay && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40" onClick={() => setShowHROverlay(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-50 p-6 pb-safe shadow-elevated">
              <button onClick={() => setShowHROverlay(false)} className="absolute top-3 left-1/2 -translate-x-1/2 p-1"><ChevronUp className="h-5 w-5 text-muted-foreground" /></button>
              <div className="pt-4">
                <div className="flex items-center justify-between mb-6">
                  <div><p className="text-4xl font-bold">{state.hrData.currentHR || '—'}</p><p className="text-sm text-muted-foreground">bpm</p></div>
                  <div className={cn("px-4 py-2 rounded-full text-sm font-medium", state.hrData.zone === 1 && "bg-hr-zone1/20 text-hr-zone1", state.hrData.zone === 2 && "bg-hr-zone2/20 text-hr-zone2", state.hrData.zone === 3 && "bg-hr-zone3/20 text-hr-zone3", state.hrData.zone === 4 && "bg-hr-zone4/20 text-hr-zone4", state.hrData.zone === 5 && "bg-hr-zone5/20 text-hr-zone5")}>Zone {state.hrData.zone}</div>
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Time in Zone</p>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map(zone => (<div key={zone} className="flex items-center gap-3"><span className="text-xs w-6 text-muted-foreground">Z{zone}</span><div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className={cn("h-full rounded-full", zone === 1 && "bg-hr-zone1", zone === 2 && "bg-hr-zone2", zone === 3 && "bg-hr-zone3", zone === 4 && "bg-hr-zone4", zone === 5 && "bg-hr-zone5")} style={{ width: `${Math.min(100, (state.hrData.timeInZones[zone] || 0) / 60 * 10)}%` }} /></div><span className="text-xs w-10 text-right text-muted-foreground">{formatTime(state.hrData.timeInZones[zone] || 0)}</span></div>))}
                </div>
              </div>
            </motion.div>
          </>
        )}
        {showHistory && <ExerciseHistorySheet exerciseName={currentExercise.name} currentWeight={currentSet?.completedWeight ?? currentSet?.targetWeight ?? null} currentReps={currentSet?.completedReps ?? parseInt(currentSet?.targetReps?.match(/\d+/)?.[0] || '0')} onClose={() => setShowHistory(false)} />}
        {showSwap && <SwapExerciseSheet currentExercise={currentExercise.name} currentMuscleGroup={currentExercise.muscleGroup} onSwap={(ex) => { swapExercise(state.currentExerciseIndex, ex); setShowSwap(false); }} onClose={() => setShowSwap(false)} />}
        {showAdd && <AddExerciseSheet onAdd={addExercise} onClose={() => setShowAdd(false)} />}
        {showRestEdit && <RestTimerEdit currentDuration={state.restDuration} onUpdate={editRestDuration} onClose={() => setShowRestEdit(false)} />}
        {showExerciseNav && <ExerciseNav exercises={state.exercises} currentIndex={state.currentExerciseIndex} onSelect={(i) => goToExercise(i)} onRemove={removeExercise} onClose={() => setShowExerciseNav(false)} />}
        {showAdvanced && <AdvancedMetrics rpe={currentSet?.rpe ?? null} tempo={currentSet?.tempo ?? null} note={currentSet?.note ?? null} onUpdate={(updates) => updateSet(state.currentExerciseIndex, state.currentSetIndex, updates)} onClose={() => setShowAdvanced(false)} />}
      </AnimatePresence>
    </div>
  );
}
