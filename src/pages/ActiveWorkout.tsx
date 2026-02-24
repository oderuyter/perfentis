import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, SkipForward, Heart, ChevronUp, Shuffle, Plus, History, Pause, Play, StickyNote, Trophy, Save, Trash2, Share2, Target } from "lucide-react";

import { useParams, useNavigate } from "react-router-dom";
import { workouts, type Workout } from "@/data/workouts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWorkoutState, loadSavedWorkout, clearSavedWorkout } from "@/hooks/useWorkoutState";
import { useWorkoutHeartbeat } from "@/hooks/useWorkoutSync";
import { useWorkoutHistory } from "@/hooks/useWorkoutHistory";
import { usePersonalRecords, type PersonalRecord } from "@/hooks/usePersonalRecords";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useHeartRateMonitor } from "@/hooks/useHeartRateMonitor";
import { SetEditor } from "@/components/workout/SetEditor";
import { ExerciseHistorySheet } from "@/components/workout/ExerciseHistorySheet";
import { SwapExerciseSheet } from "@/components/workout/SwapExerciseSheet";
import { AddExerciseSheet } from "@/components/workout/AddExerciseSheet";
import { RestTimerEdit } from "@/components/workout/RestTimerEdit";
import { ExerciseNav } from "@/components/workout/ExerciseNav";
import { AdvancedMetrics } from "@/components/workout/AdvancedMetrics";
import { SaveAsTemplateDialog } from "@/components/workout/SaveAsTemplateDialog";
import { CreatePostSheet } from "@/components/social/CreatePostSheet";
import { HRPanel } from "@/components/workout/HRPanel";
import { OneRMPanel } from "@/components/workout/OneRMPanel";
import { computeSessionE1RM } from "@/hooks/useOneRepMax";
import { toast } from "sonner";
import { notifyWorkoutCompleted, notifyPRSet } from "@/lib/notifications";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface ActiveWorkoutProps {
  templateWorkout?: Workout | null;
}

export default function ActiveWorkout({ templateWorkout }: ActiveWorkoutProps = {}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const hr = useHeartRateMonitor();
  const isFreeform = id === 'free';
  // Use templateWorkout if provided, otherwise look up from static data
  const workout = templateWorkout || (isFreeform ? null : workouts.find(w => w.id === id));
  const savedState = loadSavedWorkout();
  const workoutId = templateWorkout?.id || id;
  const resumeState = isFreeform 
    ? (savedState?.workoutId === 'freeform' ? savedState : null)
    : (savedState?.workoutId === workoutId ? savedState : null);
  
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
    addSet,
    removeSet,
    removeExercise,
    reorderExercise,
    continueWorkout,
    endWorkout,
  } = useWorkoutState(workout || null, resumeState, isFreeform);

  const { saveWorkoutSession } = useWorkoutHistory();
  const { checkAndSavePRs } = usePersonalRecords();

  // Background 30-second heartbeat: upserts `status='active'` to the DB so the
  // session survives localStorage being cleared or the device crashing.
  useWorkoutHeartbeat(state);
  const [newPRs, setNewPRs] = useState<PersonalRecord[]>([]);
  const [showSharePost, setShowSharePost] = useState(false);
  const [completedSessionId, setCompletedSessionId] = useState<string | undefined>(undefined);
  const [isSavingSession, setIsSavingSession] = useState(false);

  // Overlays
  const [showHROverlay, setShowHROverlay] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showRestEdit, setShowRestEdit] = useState(false);
  const [showExerciseNav, setShowExerciseNav] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(!!resumeState);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showOneRM, setShowOneRM] = useState(false);

  // Build stats card data for post-workout sharing
  const statsCardData = useMemo(() => {
    if (!state) return null;
    const completedSets = state.exercises.flatMap((e) => e.sets).filter((s) => s.completed);
    const totalVolume = completedSets.reduce((sum, s) => sum + (s.completedWeight || 0) * (s.completedReps || 0), 0);
    const topExercises = state.exercises
      .filter((e) => !e.skipped && e.sets.some((s) => s.completed))
      .map((e) => e.name)
      .slice(0, 3);
    return {
      workout_name: state.workoutName || "Workout",
      date: new Date().toISOString(),
      duration_seconds: state.elapsedTime,
      total_volume_kg: totalVolume > 0 ? totalVolume : undefined,
      top_exercises: topExercises,
      session_type: "strength" as const,
      is_pr: newPRs.length > 0,
    };
  }, [state, newPRs]);

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

  // Save session + check PRs, then show share sheet (or navigate directly)
  const handleFinish = useCallback(async () => {
    if (isSavingSession) return;
    setIsSavingSession(true);
    let sessionId: string | undefined;
    if (state && state.status === 'completed') {
      const sid = await saveWorkoutSession(state);
      sessionId = sid ?? undefined;
      if (sessionId) {
        if (user?.id) {
          await notifyWorkoutCompleted(user.id, state.workoutName, sessionId);
        }
        const prs = await checkAndSavePRs(state, sessionId);
        if (prs.length > 0) {
          setNewPRs(prs);
          toast.success(`${prs.length} new PR${prs.length > 1 ? 's' : ''}!`);
          if (user?.id) {
            for (const pr of prs) {
              await notifyPRSet(user.id, pr.exercise_name, `${pr.value}kg`, pr.exercise_id);
            }
          }
        }
      }
    }
    clearSavedWorkout();
    setCompletedSessionId(sessionId);
    setIsSavingSession(false);
    // Auto-open share sheet if user's default preference is enabled
    if (profile?.social_share_after_workout) {
      setShowSharePost(true);
    } else {
      navigate("/");
    }
  }, [isSavingSession, navigate, state, saveWorkoutSession, checkAndSavePRs, user, profile]);

  // For freeform workouts without exercises yet, show empty state with add prompt
  const hasNoExercises = state && state.exercises.length === 0;
  
  if (!state) {
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

  // "All exercises done" prompt — phase is complete but status is still active
  if (state.phase === "complete" && state.status === 'active') {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center w-full max-w-xs">
          <div className="h-20 w-20 rounded-full gradient-card-accent flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Check className="h-10 w-10 text-accent-foreground" />
          </div>
          <h1 className="text-xl font-semibold mb-2">All Exercises Done!</h1>
          <p className="text-muted-foreground mb-6">
            {formatTime(state.elapsedTime)} elapsed · {state.exercises.flatMap(e => e.sets).filter(s => s.completed).length} sets completed
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => {
                continueWorkout();
                setShowAdd(true);
              }} 
              variant="outline"
              className="w-full h-12 rounded-xl font-semibold gap-2"
            >
              <Plus className="h-5 w-5" />
              Add Another Exercise
            </Button>
            <Button 
              onClick={async () => {
                if (state) {
                  await saveWorkoutSession(state);
                  if (user?.id) {
                    await notifyWorkoutCompleted(user.id, state.workoutName, '');
                  }
                  const prs = await checkAndSavePRs(state, '');
                  if (prs.length > 0) {
                    setNewPRs(prs);
                    toast.success(`${prs.length} new PR${prs.length > 1 ? 's' : ''}!`);
                  }
                }
                endWorkout(false);
              }}
              className="w-full h-12 rounded-xl font-semibold"
            >
              Finish Workout
            </Button>
          </div>
        </motion.div>
        
        {/* Add exercise overlay */}
        <AnimatePresence>
          {showAdd && <AddExerciseSheet onAdd={(ex) => { addExercise(ex, true); continueWorkout(); }} onClose={() => setShowAdd(false)} />}
        </AnimatePresence>
      </div>
    );
  }

  // Complete Screen (status === 'completed')
  if (state.phase === "complete" && state.status !== 'active') {
    const completedSets = state.exercises.flatMap(e => e.sets).filter(s => s.completed);
    const totalVolume = completedSets.reduce((sum, s) => sum + (s.completedWeight || 0) * (s.completedReps || 0), 0);
    
    // Prepare exercises for template saving
    const templateExercises = state.exercises.map(ex => {
      const repsValue = ex.sets[0]?.completedReps || ex.sets[0]?.targetReps || 8;
      return {
        exercise_id: ex.exerciseId || '',
        name: ex.name,
        sets: ex.sets.length,
        reps: typeof repsValue === 'number' ? repsValue : parseInt(String(repsValue)) || 8,
        exerciseType: ex.exerciseType as 'strength' | 'cardio' | undefined,
        rest_seconds: 90,
      };
    });
    
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center w-full max-w-xs">
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
          
          <div className="grid grid-cols-2 gap-4 w-full mb-6">
            <div className="gradient-card rounded-xl p-4 border border-border/50 shadow-card">
              <p className="text-2xl font-semibold">{formatTime(state.elapsedTime)}</p>
              <p className="text-xs text-muted-foreground mt-1">Duration</p>
            </div>
            <div className="gradient-card rounded-xl p-4 border border-border/50 shadow-card">
              <p className="text-2xl font-semibold">{completedSets.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Sets</p>
            </div>
          </div>
          
          {/* Save as Template CTA */}
          {isFreeform && state.exercises.length > 0 && (
            <Button 
              variant="outline" 
              onClick={() => setShowSaveTemplate(true)}
              className="w-full h-12 rounded-xl font-semibold mb-3 gap-2"
            >
              <Save className="h-5 w-5" />
              Save as Template
            </Button>
          )}
          
          {/* Share to community */}
          <Button
            variant="outline"
            onClick={() => setShowSharePost(true)}
            className="w-full h-12 rounded-xl font-semibold mb-3 gap-2"
          >
            <Share2 className="h-5 w-5" />
            Share to Community
          </Button>

          <Button
            onClick={handleFinish}
            className="w-full h-12 rounded-xl font-semibold"
            disabled={isSavingSession}
          >
            {isSavingSession ? "Saving…" : "Done"}
          </Button>
        </motion.div>
        
        {/* Save as Template Dialog */}
        <SaveAsTemplateDialog
          open={showSaveTemplate}
          onClose={() => setShowSaveTemplate(false)}
          exercises={templateExercises}
          suggestedName=""
          duration={Math.round(state.elapsedTime / 60)}
        />

        {/* Post-workout share sheet */}
        <CreatePostSheet
          open={showSharePost}
          onClose={() => { setShowSharePost(false); navigate("/"); }}
          prefillStatsCard={statsCardData || undefined}
          prefillCaption={`Just finished ${state.workoutName || "a workout"}! 💪`}
          workoutSessionId={completedSessionId}
        />
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
        <button onClick={() => setShowHROverlay(true)} className={cn(
          "h-10 px-3 rounded-full flex items-center gap-1.5",
          hr.status === "connected" ? "bg-green-500/10" : "bg-accent-subtle"
        )}>
          <Heart className={cn("h-4 w-4", hr.status === "connected" ? "text-red-500" : "text-muted-foreground")} />
          <span className="text-sm font-medium tabular-nums">{hr.status === "connected" && hr.currentBPM > 0 ? hr.currentBPM : '—'}</span>
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col px-4 py-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          {hasNoExercises ? (
            // Empty state for freeform workouts
            <motion.div 
              key="empty" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }} 
              className="flex-1 flex flex-col items-center justify-center text-center"
            >
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
                <Plus className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Add Your First Exercise</h2>
              <p className="text-muted-foreground mb-6 max-w-xs">
                Tap the + button below to add exercises from the library and start building your workout
              </p>
              <Button onClick={() => setShowAdd(true)} size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Add Exercise
              </Button>
            </motion.div>
          ) : state.phase === "exercise" && currentExercise ? (
            <motion.div key="exercise" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Set {state.currentSetIndex + 1} of {currentExercise.sets.length}</p>
                  <h1 className="text-xl font-semibold">{currentExercise.name}</h1>
                </div>
                <div className="flex gap-2">
                  {(currentExercise.exerciseType === 'weight_reps' || currentExercise.exerciseType === 'strength' || !currentExercise.exerciseType) && currentExercise.exerciseType !== 'cardio' && currentExercise.exerciseType !== 'reps' && currentExercise.exerciseType !== 'duration' && currentExercise.exerciseType !== 'reps_duration' && (() => {
                    const liveE1RM = computeSessionE1RM(currentExercise.sets);
                    return (
                      <button onClick={() => setShowOneRM(true)} className="h-9 px-2.5 rounded-full bg-primary/10 flex items-center gap-1.5" title="1RM Calculator">
                        <Target className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold text-primary tabular-nums">
                          {liveE1RM > 0 ? `${Math.round(liveE1RM)}` : '1RM'}
                        </span>
                      </button>
                    );
                  })()}
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
                  {currentExercise.exerciseType === 'cardio' ? (
                    <>
                      <p className="text-5xl font-bold tracking-tight text-center text-accent-foreground">
                        {currentSet?.completedTime ? formatTime(currentSet.completedTime) : (currentSet?.targetTime ? formatTime(currentSet.targetTime) : '0:00')}
                      </p>
                      <p className="text-2xl text-muted-foreground mt-2 text-center">
                        {currentSet?.completedDistance ? `${(currentSet.completedDistance / 1000).toFixed(2)} km` : '— km'}
                      </p>
                    </>
                  ) : currentExercise.exerciseType === 'reps' ? (
                    <>
                      <p className="text-5xl font-bold tracking-tight text-center text-accent-foreground">
                        {currentSet?.completedReps ?? currentSet?.targetReps ?? '—'}
                      </p>
                      <p className="text-2xl text-muted-foreground mt-2 text-center">reps</p>
                    </>
                  ) : currentExercise.exerciseType === 'duration' ? (
                    <>
                      <p className="text-5xl font-bold tracking-tight text-center text-accent-foreground">
                        {currentSet?.completedTime ? formatTime(currentSet.completedTime) : (currentSet?.targetTime ? formatTime(currentSet.targetTime) : '0:00')}
                      </p>
                      <p className="text-2xl text-muted-foreground mt-2 text-center">duration</p>
                    </>
                  ) : currentExercise.exerciseType === 'reps_duration' ? (
                    <>
                      <p className="text-5xl font-bold tracking-tight text-center text-accent-foreground">
                        {currentSet?.completedReps ?? currentSet?.targetReps ?? '—'} reps
                      </p>
                      <p className="text-2xl text-muted-foreground mt-2 text-center">
                        {currentSet?.completedTime ? formatTime(currentSet.completedTime) : (currentSet?.targetTime ? formatTime(currentSet.targetTime) : '0:00')}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-5xl font-bold tracking-tight text-center text-accent-foreground">
                        {currentSet?.completedWeight ?? currentSet?.targetWeight ?? '—'} kg
                      </p>
                      <p className="text-2xl text-muted-foreground mt-2 text-center">× {currentSet?.completedReps ?? currentSet?.targetReps}</p>
                    </>
                  )}
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
                  exerciseType={currentExercise.exerciseType}
                />
                <div className="flex items-center gap-2 mt-2">
                  <button 
                    onClick={() => addSet(state.currentExerciseIndex)}
                    className="flex items-center gap-1 text-xs font-medium text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Set
                  </button>
                  {currentExercise.sets.length > 1 && (
                    <button 
                      onClick={() => removeSet(state.currentExerciseIndex)}
                      className="flex items-center gap-1 text-xs font-medium text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove Set
                    </button>
                  )}
                </div>
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
      <div className="px-4 pb-bottom-nav">
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
        <HRPanel
          isOpen={showHROverlay}
          onClose={() => setShowHROverlay(false)}
          currentBPM={hr.currentBPM}
          zone={hr.zone}
          status={hr.status}
          activeDevice={hr.activeDevice}
          devices={hr.devices}
          timeInZones={hr.timeInZones}
          isSupported={hr.isSupported}
          onConnect={(dev) => hr.connectBLE(dev)}
          onDisconnect={() => hr.disconnect()}
          onRemoveDevice={(id) => hr.removeDevice(id)}
          onSetPreferred={(id) => hr.setPreferred(id)}
          maxHR={190}
        />
        {showHistory && <ExerciseHistorySheet exerciseName={currentExercise.name} currentWeight={currentSet?.completedWeight ?? currentSet?.targetWeight ?? null} currentReps={currentSet?.completedReps ?? parseInt(currentSet?.targetReps?.match(/\d+/)?.[0] || '0')} onClose={() => setShowHistory(false)} />}
        {showSwap && <SwapExerciseSheet currentExercise={currentExercise.name} currentMuscleGroup={currentExercise.muscleGroup} onSwap={(ex) => { swapExercise(state.currentExerciseIndex, ex); setShowSwap(false); }} onClose={() => setShowSwap(false)} />}
        {showAdd && <AddExerciseSheet onAdd={(ex) => { addExercise(ex, true); }} onClose={() => setShowAdd(false)} multiSelect />}
        {showRestEdit && <RestTimerEdit currentDuration={state.restDuration} onUpdate={editRestDuration} onClose={() => setShowRestEdit(false)} />}
        {showExerciseNav && <ExerciseNav exercises={state.exercises} currentIndex={state.currentExerciseIndex} onSelect={(i) => goToExercise(i)} onRemove={removeExercise} onReorder={reorderExercise} onClose={() => setShowExerciseNav(false)} />}
        {showAdvanced && <AdvancedMetrics rpe={currentSet?.rpe ?? null} tempo={currentSet?.tempo ?? null} note={currentSet?.note ?? null} onUpdate={(updates) => updateSet(state.currentExerciseIndex, state.currentSetIndex, updates)} onClose={() => setShowAdvanced(false)} />}
        {showOneRM && currentExercise && (
          <OneRMPanel
            exerciseId={currentExercise.exerciseId}
            exerciseName={currentExercise.name}
            onClose={() => setShowOneRM(false)}
            sessionSets={currentExercise.sets}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
