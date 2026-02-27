import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, SkipForward, Heart, ChevronUp, Shuffle, Plus, History, Pause, Play, StickyNote, Trophy, Save, Trash2, Share2, Target, Monitor } from "lucide-react";

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
import { useBlockExecution } from "@/hooks/useBlockExecution";
import { useRestTimer } from "@/hooks/useRestTimer";
import { useWorkoutPreferences } from "@/hooks/useWorkoutPreferences";
import { useEmomTimer, useAmrapTimer } from "@/hooks/useBlockTimer";
import { SetEditor } from "@/components/workout/SetEditor";
import { ExerciseHistorySheet } from "@/components/workout/ExerciseHistorySheet";
import { SwapExerciseSheet } from "@/components/workout/SwapExerciseSheet";
import { AddExerciseSheet } from "@/components/workout/AddExerciseSheet";
import { RestTimerDrawer } from "@/components/workout/RestTimerDrawer";
import { ExerciseNav } from "@/components/workout/ExerciseNav";
import { AdvancedMetrics } from "@/components/workout/AdvancedMetrics";
import { SaveAsTemplateDialog } from "@/components/workout/SaveAsTemplateDialog";
import { CreatePostSheet } from "@/components/social/CreatePostSheet";
import { HRPanel } from "@/components/workout/HRPanel";
import { OneRMPanel } from "@/components/workout/OneRMPanel";
import { BlockExecutionHeader } from "@/components/workout/BlockExecutionHeader";
import { EmomTimer } from "@/components/workout/EmomTimer";
import { AmrapTimer } from "@/components/workout/AmrapTimer";
import { YgigPanel } from "@/components/workout/YgigPanel";
import { computeSessionE1RM } from "@/hooks/useOneRepMax";
import { useDisplayBroadcast } from "@/hooks/useDisplayBroadcast";
import { SendToDisplaySheet } from "@/components/workout/SendToDisplaySheet";
import { supabase } from "@/integrations/supabase/client";
import { useWorkoutPrefill } from "@/hooks/useWorkoutPrefill";
import { toast } from "sonner";
import { notifyWorkoutCompleted, notifyPRSet } from "@/lib/notifications";
import type { WorkoutBlock, EmomSettings, AmrapSettings, YgigSettings } from "@/types/workout-blocks";
import { parseExerciseDataToBlocks } from "@/types/workout-blocks";

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

  // Parse blocks from template workout exercise_data if available
  const workoutBlocks = useMemo<WorkoutBlock[]>(() => {
    if (!templateWorkout) return [];
    try {
      const rawData = (templateWorkout as any).exercise_data;
      if (Array.isArray(rawData)) {
        return parseExerciseDataToBlocks(rawData);
      }
    } catch {}
    return [];
  }, [templateWorkout]);
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

  // Rest timer (timestamp-based, background-resilient)
  const { preferences: workoutPrefs, updatePreferences: updateWorkoutPrefs } = useWorkoutPreferences();
  const restTimer = useRestTimer({
    soundEnabled: workoutPrefs.rest_timer_sound,
    hapticsEnabled: workoutPrefs.rest_timer_haptics,
  });

  // Block execution state for EMOM/AMRAP/YGIG
  const blockExecution = useBlockExecution({ blocks: workoutBlocks, sessionId: undefined });

  // Determine if the current exercise belongs to a block
  const currentBlockContext = useMemo(() => {
    if (workoutBlocks.length === 0 || !state) return null;
    const currentEx = state.exercises[state.currentExerciseIndex];
    if (!currentEx) return null;
    
    let globalIndex = 0;
    for (const block of workoutBlocks) {
      for (let i = 0; i < block.items.length; i++) {
        if (globalIndex === state.currentExerciseIndex) {
          return { block, itemIndex: i };
        }
        globalIndex++;
      }
    }
    return null;
  }, [workoutBlocks, state?.currentExerciseIndex]);

  // Extract EMOM/AMRAP block settings for hooks (must be called unconditionally)
  const emomBlock = useMemo(() => {
    if (!currentBlockContext || currentBlockContext.block.type !== 'emom') return null;
    return currentBlockContext.block;
  }, [currentBlockContext]);
  const emomSettings = emomBlock?.settings as EmomSettings | undefined;

  const amrapBlock = useMemo(() => {
    if (!currentBlockContext || currentBlockContext.block.type !== 'amrap') return null;
    return currentBlockContext.block;
  }, [currentBlockContext]);
  const amrapSettings = amrapBlock?.settings as AmrapSettings | undefined;

  // Restore persisted timer state from block execution context
  const emomInitial = useMemo(() => {
    if (!emomBlock) return undefined;
    const bs = blockExecution.getBlockState(emomBlock.id);
    if (bs?.startedAt) {
      return {
        block_started_at: bs.startedAt,
        current_round_index: bs.currentRound || 1,
        is_paused: false,
        total_paused_seconds: 0,
      };
    }
    return undefined;
  }, [emomBlock?.id]);

  const amrapInitial = useMemo(() => {
    if (!amrapBlock) return undefined;
    const bs = blockExecution.getBlockState(amrapBlock.id);
    if (bs?.amrapStartedAt) {
      return {
        block_started_at: bs.amrapStartedAt,
        rounds_completed: bs.roundsCompleted || 0,
        reps_in_current_round: bs.repsInCurrentRound || 0,
        is_paused: false,
        total_paused_seconds: 0,
      };
    }
    return undefined;
  }, [amrapBlock?.id]);

  // EMOM timer hook (always called, uses dummy values when no EMOM block)
  const emomTimer = useEmomTimer({
    blockId: emomBlock?.id || '__none__',
    sessionId: undefined,
    intervalSeconds: emomSettings?.work_seconds || 60,
    roundsTotal: emomSettings?.rounds || 1,
    rotationMode: emomSettings?.rotation_mode || 'rotate',
    exerciseCount: emomBlock?.items.length || 1,
    restSeconds: emomSettings?.rest_seconds || 0,
    initialState: emomInitial,
    onRoundChange: useCallback((round: number, itemIdx: number) => {
      if (emomBlock) {
        blockExecution.updateBlockState(emomBlock.id, { currentRound: round });
      }
    }, [emomBlock?.id]),
    onComplete: useCallback(() => {
      if (emomBlock) {
        blockExecution.completeBlock(emomBlock.id);
        toast.success("EMOM complete!");
      }
    }, [emomBlock?.id]),
  });

  // AMRAP timer hook (always called, uses dummy values when no AMRAP block)
  const amrapTimer = useAmrapTimer({
    blockId: amrapBlock?.id || '__none__',
    sessionId: undefined,
    timeCapSeconds: amrapSettings?.time_cap_seconds || 600,
    initialState: amrapInitial,
    onComplete: useCallback((score: { rounds: number; reps: number }) => {
      if (amrapBlock) {
        blockExecution.completeBlock(amrapBlock.id, {
          roundsCompleted: score.rounds,
          repsInCurrentRound: score.reps,
        });
        toast.success(`AMRAP complete! ${score.rounds} rounds + ${score.reps} reps`);
      }
    }, [amrapBlock?.id]),
  });

  // Background 30-second heartbeat
  useWorkoutHeartbeat(state);
  useWorkoutPrefill(state, updateSet);
  const [newPRs, setNewPRs] = useState<PersonalRecord[]>([]);
  const [showSharePost, setShowSharePost] = useState(false);
  const [completedSessionId, setCompletedSessionId] = useState<string | undefined>(undefined);
  const [isSavingSession, setIsSavingSession] = useState(false);

  // Overlays
  const [showHROverlay, setShowHROverlay] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showExerciseNav, setShowExerciseNav] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(!!resumeState);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showOneRM, setShowOneRM] = useState(false);
  const [showSendToDisplay, setShowSendToDisplay] = useState(false);
  const [connectedDisplayId, setConnectedDisplayId] = useState<string | null>(null);
  const [connectedSessionId, setConnectedSessionId] = useState<string | null>(null);
  const [connectedShareLevel, setConnectedShareLevel] = useState<string>("structure_only");

  // Start rest timer when workout phase enters 'rest'
  const prevPhaseRef2 = useRef(state?.phase);
  useEffect(() => {
    if (!state) return;
    if (state.phase === 'rest' && prevPhaseRef2.current !== 'rest') {
      // Determine rest target: exercise-defined > user default
      const currentEx = state.exercises[state.currentExerciseIndex];
      const targetSeconds = currentEx?.restDuration || workoutPrefs.default_rest_seconds;
      restTimer.startRest(targetSeconds, restTimer.timerState.restMode);
    }
    if (state.phase !== 'rest' && prevPhaseRef2.current === 'rest') {
      // Rest ended via completeSet moving to next exercise
      if (restTimer.timerState.isActive) {
        restTimer.skipRest();
      }
    }
    prevPhaseRef2.current = state.phase;
  }, [state?.phase]);

  // Auto-skip workout phase when rest timer countdown completes
  useEffect(() => {
    if (restTimer.isComplete && state?.phase === 'rest') {
      // Auto-transition out of rest after a short delay to let user see "complete"
      const timeout = setTimeout(() => {
        skipRest();
        restTimer.skipRest();
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [restTimer.isComplete, state?.phase]);

  // Handle rest skip from drawer
  const handleDrawerSkipRest = useCallback(() => {
    skipRest();
    restTimer.skipRest();
  }, [skipRest, restTimer]);

  // Handle apply rest to all remaining sets
  const handleApplyRestToAll = useCallback((seconds: number) => {
    editRestDuration(seconds, true);
  }, [editRestDuration]);

  // Display broadcast
  const { sendState, sendTick, sendSetComplete, sendSessionEnd } = useDisplayBroadcast(connectedDisplayId, connectedShareLevel);

  // Build block context for broadcast
  const broadcastBlockContext = useMemo(() => {
    if (!currentBlockContext || currentBlockContext.block.type === 'single') return null;
    const block = currentBlockContext.block;
    if (block.type === 'emom') {
      return {
        type: 'emom' as const,
        name: block.title || 'EMOM',
        round: emomTimer.timerState.current_round_index,
        totalRounds: emomTimer.timerState.rounds_total,
        intervalSeconds: emomTimer.timerState.interval_seconds,
      };
    }
    if (block.type === 'amrap') {
      const s = block.settings as AmrapSettings;
      return {
        type: 'amrap' as const,
        name: block.title || 'AMRAP',
        round: amrapTimer.timerState.rounds_completed,
        totalRounds: 0,
        timeCapSeconds: s.time_cap_seconds,
        startedAt: amrapTimer.timerState.block_started_at,
      };
    }
    const blockState = blockExecution.getBlockState(block.id);
    return {
      type: block.type,
      name: block.title || block.type.toUpperCase(),
      round: blockState?.currentRound || 1,
      totalRounds: blockState?.totalRounds || 0,
    };
  }, [currentBlockContext, emomTimer.timerState, amrapTimer.timerState, blockExecution.blockStates]);

  // Broadcast full workout state whenever it changes
  const lastBroadcastRef = useRef<string>("");
  useEffect(() => {
    if (!connectedDisplayId || !state) return;
    // Throttle: only send if meaningful state changed (exercise/set index, phase, exercises)
    const stateKey = `${state.currentExerciseIndex}-${state.currentSetIndex}-${state.phase}-${state.exercises.map(e => e.sets.map(s => `${s.completed}${s.completedWeight}${s.completedReps}`).join()).join('|')}-${JSON.stringify(broadcastBlockContext)}`;
    if (stateKey === lastBroadcastRef.current) return;
    lastBroadcastRef.current = stateKey;
    try { sendState({ ...state, blockContext: broadcastBlockContext }); } catch (e) { console.error("Broadcast error:", e); }
  }, [connectedDisplayId, state?.currentExerciseIndex, state?.currentSetIndex, state?.phase, state?.exercises, broadcastBlockContext, sendState]);

  // Broadcast timer ticks (every 1s during rest for countdown, every 5s otherwise)
  useEffect(() => {
    if (!connectedDisplayId || !state) return;
    const isRest = state.phase === "rest";
    const interval = setInterval(() => {
      try {
        sendTick(
          state.elapsedTime,
          isRest ? state.restTimeRemaining : undefined,
          state.phase,
          broadcastBlockContext
        );
      } catch (e) { console.error("Tick broadcast error:", e); }
    }, isRest ? 1000 : 5000);
    return () => clearInterval(interval);
  }, [connectedDisplayId, state?.elapsedTime, state?.phase, state?.restTimeRemaining, broadcastBlockContext, sendTick]);

  // Broadcast rest phase changes immediately
  const prevBroadcastPhaseRef = useRef<string>("");
  useEffect(() => {
    if (!connectedDisplayId || !state) return;
    if (state.phase !== prevBroadcastPhaseRef.current) {
      prevBroadcastPhaseRef.current = state.phase;
      try {
        sendTick(
          state.elapsedTime,
          state.phase === "rest" ? state.restTimeRemaining : undefined,
          state.phase
        );
      } catch (e) { console.error("Phase broadcast error:", e); }
    }
  }, [connectedDisplayId, state?.phase, state?.elapsedTime, state?.restTimeRemaining, sendTick]);

  // Auto-disconnect display after 2.5 hours
  const displayConnectTimeRef = useRef<number | null>(null);
  useEffect(() => {
    if (!connectedDisplayId) {
      displayConnectTimeRef.current = null;
      return;
    }
    displayConnectTimeRef.current = Date.now();
    const timeout = setTimeout(() => {
      handleDisplayDisconnect();
      toast("Display disconnected after 2.5 hours");
    }, 2.5 * 60 * 60 * 1000);
    return () => clearTimeout(timeout);
  }, [connectedDisplayId]);

  const handleDisplayDisconnect = useCallback(async () => {
    if (connectedDisplayId) {
      sendSessionEnd();
      // Update participant status
      const user = (await supabase.auth.getUser()).data.user;
      if (user && connectedSessionId) {
        await supabase
          .from("display_participants")
          .update({ status: "disconnected" })
          .eq("display_session_id", connectedSessionId)
          .eq("user_id", user.id);
      }
    }
    setConnectedDisplayId(null);
    setConnectedSessionId(null);
  }, [connectedDisplayId, connectedSessionId, sendSessionEnd]);

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
      if (state) {
        await saveWorkoutSession(state);
      }
      // Disconnect display on workout end
      await handleDisplayDisconnect();
      clearSavedWorkout();
      endWorkout(false);
      navigate("/");
    }
  }, [navigate, endWorkout, state, saveWorkoutSession, handleDisplayDisconnect]);

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
    // Disconnect display on workout finish
    await handleDisplayDisconnect();
    clearSavedWorkout();
    setCompletedSessionId(sessionId);
    setIsSavingSession(false);
    if (profile?.social_share_after_workout) {
      setShowSharePost(true);
    } else {
      navigate("/");
    }
  }, [isSavingSession, navigate, state, saveWorkoutSession, checkAndSavePRs, user, profile, handleDisplayDisconnect]);

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

  // isPaused now handled by restTimer hook

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
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSendToDisplay(true)} className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center",
            connectedDisplayId ? "bg-emerald-500/10" : "bg-muted"
          )} title="Send to Display">
            <Monitor className={cn("h-4 w-4", connectedDisplayId ? "text-emerald-500" : "text-muted-foreground")} />
          </button>
          <button onClick={() => setShowHROverlay(true)} className={cn(
            "h-10 px-3 rounded-full flex items-center gap-1.5",
            hr.status === "connected" ? "bg-green-500/10" : "bg-accent-subtle"
          )}>
            <Heart className={cn("h-4 w-4", hr.status === "connected" ? "text-red-500" : "text-muted-foreground")} />
            <span className="text-sm font-medium tabular-nums">{hr.status === "connected" && hr.currentBPM > 0 ? hr.currentBPM : '—'}</span>
          </button>
        </div>
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
              {/* Block execution context */}
              {currentBlockContext && currentBlockContext.block.type !== 'single' && (
                <div className="space-y-3 mb-4">
                  <BlockExecutionHeader
                    block={currentBlockContext.block}
                    currentItemIndex={currentBlockContext.itemIndex}
                  />
                  {currentBlockContext.block.type === 'emom' && (
                    <EmomTimer
                      timer={emomTimer}
                      exerciseNames={currentBlockContext.block.items.map(i => i.name)}
                    />
                  )}
                  {currentBlockContext.block.type === 'amrap' && (
                    <AmrapTimer
                      timer={amrapTimer}
                    />
                  )}
                  {currentBlockContext.block.type === 'ygig' && user && (
                    <YgigPanel
                      settings={currentBlockContext.block.settings as YgigSettings}
                      currentUserId={user.id}
                      currentUserName={profile?.display_name || undefined}
                      participants={[
                        { userId: user.id, displayName: profile?.display_name || 'You' },
                        ...(blockExecution.getBlockState(currentBlockContext.block.id)?.participants?.filter(id => id !== user.id).map(id => ({ userId: id, displayName: 'Partner' })) || [])
                      ]}
                      activeParticipantUserId={blockExecution.getBlockState(currentBlockContext.block.id)?.activeParticipantUserId || user.id}
                      turnIndex={blockExecution.getBlockState(currentBlockContext.block.id)?.turnIndex || 0}
                      onAddPartner={(partner) => blockExecution.addYgigPartner(currentBlockContext.block.id, partner)}
                      onCompleteTurn={() => blockExecution.completeYgigTurn(currentBlockContext.block.id)}
                    />
                  )}
                </div>
              )}

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
          ) : state.phase === "rest" && currentExercise ? (
            // During rest, still show the exercise content (non-blocking drawer handles the timer)
            <motion.div key="rest-exercise" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Set {state.currentSetIndex + 1} of {currentExercise.sets.length}</p>
                  <h1 className="text-xl font-semibold">{currentExercise.name}</h1>
                </div>
              </div>
              
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">All Sets</p>
                <SetEditor
                  sets={currentExercise.sets}
                  currentSetIndex={state.currentSetIndex}
                  onUpdateSet={(setIndex, updates) => updateSet(state.currentExerciseIndex, setIndex, updates)}
                  onSelectSet={(setIndex) => goToExercise(state.currentExerciseIndex, setIndex)}
                  exerciseType={currentExercise.exerciseType}
                />
              </div>
            </motion.div>
          ) : null}
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
            <Button onClick={handleDrawerSkipRest} variant="secondary" className="flex-1 h-14 rounded-xl font-semibold text-base gap-2">
              <SkipForward className="h-5 w-5" />Skip Rest
            </Button>
          )}
        </div>
        <button 
          onClick={handleEndWorkout}
          className="w-full py-2 text-sm text-muted-foreground hover:text-destructive transition-colors"
        >
          End Workout
        </button>
      </div>

      {/* Rest Timer Drawer */}
      <AnimatePresence>
        {restTimer.timerState.isActive && (
          <RestTimerDrawer
            isActive={restTimer.timerState.isActive}
            displaySeconds={restTimer.displaySeconds}
            progress={restTimer.progress}
            isComplete={restTimer.isComplete}
            isOverTarget={restTimer.isOverTarget}
            restMode={restTimer.timerState.restMode}
            restTargetSeconds={restTimer.timerState.restTargetSeconds}
            isPaused={restTimer.timerState.isPaused}
            drawerState={restTimer.drawerState}
            setDrawerState={restTimer.setDrawerState}
            nextExerciseName={nextExercise?.name || currentExercise?.name}
            nextSetReps={currentExercise?.sets[state.currentSetIndex]?.targetReps}
            nextSetWeight={currentExercise?.sets[state.currentSetIndex]?.completedWeight ?? currentExercise?.sets[state.currentSetIndex]?.targetWeight}
            currentSetNumber={state.currentSetIndex + 1}
            totalSets={currentExercise?.sets.length}
            soundEnabled={workoutPrefs.rest_timer_sound}
            hapticsEnabled={workoutPrefs.rest_timer_haptics}
            onSoundToggle={(v) => updateWorkoutPrefs({ rest_timer_sound: v })}
            onHapticsToggle={(v) => updateWorkoutPrefs({ rest_timer_haptics: v })}
            onSkip={handleDrawerSkipRest}
            onPause={restTimer.pauseRest}
            onResume={restTimer.resumeRest}
            onAdjust={restTimer.adjustTarget}
            onSetTarget={restTimer.setTargetManual}
            onToggleMode={restTimer.toggleMode}
            onApplyToAll={handleApplyRestToAll}
          />
        )}
      </AnimatePresence>

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
        <SendToDisplaySheet
          open={showSendToDisplay}
          onClose={() => setShowSendToDisplay(false)}
          workoutState={state}
          isConnected={!!connectedDisplayId}
          onDisconnect={handleDisplayDisconnect}
          onConnected={(displayId, sessionId, shareLevel) => {
            setConnectedDisplayId(displayId);
            setConnectedSessionId(sessionId);
            setConnectedShareLevel(shareLevel);
            sendState(state);
          }}
        />
      </AnimatePresence>
    </div>
  );
}
