import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor, Wifi, WifiOff, Timer, Zap, Users, Dumbbell, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface DisplayInfo {
  id: string;
  name: string;
  owner_type: string;
  owner_name: string;
}

interface SessionInfo {
  id: string;
  status: string;
  title: string | null;
  started_at: string | null;
  settings_json: any;
  join_code: string | null;
  current_workout_session_id: string | null;
}

interface BroadcastPayload {
  type: "workout_state" | "timer_tick" | "set_complete" | "session_end";
  data: any;
}

interface WorkoutState {
  workoutName: string;
  currentExerciseIndex: number;
  currentSetIndex: number;
  exercises: Array<{
    name: string;
    sets: Array<{
      setNumber: number;
      targetReps: string | number;
      completed: boolean;
      completedWeight?: number | null;
      completedReps?: number | null;
    }>;
    exerciseType?: string;
  }>;
  elapsedTime: number;
  phase: string;
  restRemaining?: number;
  shareLevel?: string;
  blockContext?: {
    type: string;
    name: string;
    round: number;
    totalRounds: number;
    timeRemaining?: number;
    intervalSeconds?: number; // EMOM: 60s per minute
    timeCapSeconds?: number;  // AMRAP: total cap
    startedAt?: string | null; // AMRAP: when started
  };
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatTimeLong(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function DisplayScreen() {
  const { token } = useParams<{ token: string }>();
  const [display, setDisplay] = useState<DisplayInfo | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [workoutState, setWorkoutState] = useState<WorkoutState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsedTick, setElapsedTick] = useState(0);
  const [participantCount, setParticipantCount] = useState(0);
  const [restEndedAt, setRestEndedAt] = useState<number | null>(null);
  const [elapsedSinceRest, setElapsedSinceRest] = useState(0);
  const [localRestRemaining, setLocalRestRemaining] = useState<number | null>(null);
  const [blockTimeRemaining, setBlockTimeRemaining] = useState<number | null>(null);
  const channelRef = useRef<any>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval>>();
  const restTickerRef = useRef<ReturnType<typeof setInterval>>();
  const restCountdownRef = useRef<ReturnType<typeof setInterval>>();
  const blockTimerRef = useRef<ReturnType<typeof setInterval>>();

  // Fetch display info via backend function
  const fetchDisplay = useCallback(async () => {
    if (!token) return;

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(
        `${supabaseUrl}/functions/v1/display-lookup?token=${encodeURIComponent(token)}`,
        { headers: { "Content-Type": "application/json" } }
      );

      const payload = await res.json().catch(() => ({}));

      if (!res.ok || !payload?.display) {
        setError(payload?.error || "Display not found");
        setLoading(false);
        return;
      }

      setDisplay(payload.display as DisplayInfo);
      setSession((payload.session || null) as SessionInfo | null);
      if (payload.participant_count !== undefined) {
        setParticipantCount(payload.participant_count);
      }
      setError(null);
      setLoading(false);
    } catch {
      setError("Failed to connect to display");
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDisplay();
  }, [fetchDisplay]);

  // Poll for session updates
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => { fetchDisplay(); }, 5000);
    return () => clearInterval(interval);
  }, [token, fetchDisplay]);

  // Track rest ended → elapsed since rest
  const prevPhaseRef = useRef<string | undefined>();
  useEffect(() => {
    const currentPhase = workoutState?.phase;
    if (prevPhaseRef.current === "rest" && currentPhase !== "rest") {
      setRestEndedAt(Date.now());
    }
    prevPhaseRef.current = currentPhase;
  }, [workoutState?.phase]);

  useEffect(() => {
    if (restEndedAt && workoutState?.phase !== "rest") {
      restTickerRef.current = setInterval(() => {
        setElapsedSinceRest(Math.floor((Date.now() - restEndedAt) / 1000));
      }, 1000);
    } else {
      setElapsedSinceRest(0);
      if (restTickerRef.current) clearInterval(restTickerRef.current);
    }
    return () => { if (restTickerRef.current) clearInterval(restTickerRef.current); };
  }, [restEndedAt, workoutState?.phase]);

  // Local rest timer countdown - decrements every second between broadcast ticks
  useEffect(() => {
    if (workoutState?.phase === "rest" && workoutState.restRemaining != null) {
      setLocalRestRemaining(workoutState.restRemaining);
    } else {
      setLocalRestRemaining(null);
    }
  }, [workoutState?.restRemaining, workoutState?.phase]);

  useEffect(() => {
    if (localRestRemaining == null || localRestRemaining <= 0) {
      if (restCountdownRef.current) clearInterval(restCountdownRef.current);
      return;
    }
    restCountdownRef.current = setInterval(() => {
      setLocalRestRemaining(prev => (prev != null && prev > 0) ? prev - 1 : 0);
    }, 1000);
    return () => { if (restCountdownRef.current) clearInterval(restCountdownRef.current); };
  }, [localRestRemaining != null && localRestRemaining > 0]); // only re-run when transitioning to/from active countdown

  // Local block timer countdown (EMOM 1-min intervals, AMRAP total cap)
  useEffect(() => {
    const bc = workoutState?.blockContext;
    if (!bc) { setBlockTimeRemaining(null); return; }
    
    if (bc.type === 'emom' && bc.intervalSeconds) {
      // For EMOM, timeRemaining comes from broadcast; if not, start at intervalSeconds
      setBlockTimeRemaining(bc.timeRemaining ?? bc.intervalSeconds);
    } else if (bc.type === 'amrap' && bc.timeCapSeconds && bc.startedAt) {
      const elapsed = (Date.now() - new Date(bc.startedAt).getTime()) / 1000;
      setBlockTimeRemaining(Math.max(0, Math.floor(bc.timeCapSeconds - elapsed)));
    } else if (bc.timeRemaining != null) {
      setBlockTimeRemaining(bc.timeRemaining);
    }
  }, [workoutState?.blockContext?.type, workoutState?.blockContext?.round, workoutState?.blockContext?.startedAt, workoutState?.blockContext?.timeRemaining]);

  useEffect(() => {
    if (blockTimeRemaining == null || blockTimeRemaining <= 0) {
      if (blockTimerRef.current) clearInterval(blockTimerRef.current);
      return;
    }
    blockTimerRef.current = setInterval(() => {
      setBlockTimeRemaining(prev => (prev != null && prev > 0) ? prev - 1 : 0);
    }, 1000);
    return () => { if (blockTimerRef.current) clearInterval(blockTimerRef.current); };
  }, [blockTimeRemaining != null && blockTimeRemaining > 0]);

  // Subscribe to realtime broadcast channel
  useEffect(() => {
    if (!display?.id) return;

    const channel = supabase
      .channel(`display:${display.id}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "workout_update" }, (payload) => {
        const msg = payload.payload as BroadcastPayload;
        if (msg.type === "workout_state") {
          setWorkoutState(msg.data);
          setElapsedTick(msg.data.elapsedTime || 0);
        } else if (msg.type === "timer_tick") {
          setElapsedTick(msg.data.elapsedTime || 0);
          setWorkoutState(prev => {
            if (!prev) return prev;
            const updates: Partial<WorkoutState> = {};
            if (msg.data.phase) updates.phase = msg.data.phase;
            if (msg.data.restRemaining !== undefined) updates.restRemaining = msg.data.restRemaining;
            if (msg.data.blockContext) updates.blockContext = msg.data.blockContext;
            return { ...prev, ...updates };
          });
        } else if (msg.type === "set_complete") {
          setWorkoutState(prev => {
            if (!prev) return prev;
            const updated = { ...prev, exercises: [...prev.exercises] };
            const exIdx = msg.data.exerciseIndex;
            const setIdx = msg.data.setIndex;
            if (updated.exercises[exIdx]?.sets[setIdx]) {
              updated.exercises[exIdx] = { ...updated.exercises[exIdx], sets: [...updated.exercises[exIdx].sets] };
              updated.exercises[exIdx].sets[setIdx] = { ...updated.exercises[exIdx].sets[setIdx], completed: true, completedWeight: msg.data.weight, completedReps: msg.data.reps };
            }
            updated.currentExerciseIndex = msg.data.nextExerciseIndex ?? prev.currentExerciseIndex;
            updated.currentSetIndex = msg.data.nextSetIndex ?? prev.currentSetIndex;
            return updated;
          });
        } else if (msg.type === "session_end") {
          setSession(prev => prev ? { ...prev, status: "ended" } : null);
          setWorkoutState(null);
        }
        setConnected(true);
      })
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [display?.id]);

  // Listen for session changes via postgres_changes
  useEffect(() => {
    if (!display?.id) return;

    const channel = supabase
      .channel(`display_session_watch:${display.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "display_sessions",
        filter: `display_id=eq.${display.id}`,
      }, (payload) => {
        const newRow = payload.new as any;
        if (newRow) {
          setSession({
            id: newRow.id,
            status: newRow.status,
            title: newRow.title,
            started_at: newRow.started_at,
            settings_json: newRow.settings_json,
            join_code: newRow.join_code,
            current_workout_session_id: newRow.current_workout_session_id,
          });
          if (newRow.status === "ended") {
            setWorkoutState(null);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [display?.id]);

  // Local elapsed tick
  useEffect(() => {
    if (workoutState && workoutState.phase !== "complete") {
      tickerRef.current = setInterval(() => {
        setElapsedTick(prev => prev + 1);
      }, 1000);
    } else {
      if (tickerRef.current) clearInterval(tickerRef.current);
    }
    return () => { if (tickerRef.current) clearInterval(tickerRef.current); };
  }, [workoutState?.phase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="h-10 w-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <Monitor className="h-16 w-16 mx-auto mb-4 text-white/40" />
          <h1 className="text-2xl font-semibold mb-2">Display Unavailable</h1>
          <p className="text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  // Ended state
  if (session?.status === "ended") {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <Monitor className="h-16 w-16 mb-4 text-white/40" />
        <h1 className="text-3xl font-bold mb-2">Session Ended</h1>
        <p className="text-white/50 text-lg">{display?.owner_name}</p>
      </div>
    );
  }

  // Determine whether to show join code: only if no participants connected
  const hasParticipants = participantCount > 0 || !!workoutState;
  const joinCode = session?.join_code;

  // Idle state — no active workout broadcast
  if (!session || session.status === "idle" || (!workoutState && session.status === "active")) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <header className="flex items-center justify-between px-8 py-4 border-b border-white/10">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-white/80">{display?.owner_name}</h1>
            <span className="text-white/30">·</span>
            <span className="text-white/50">{display?.name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/30 text-xs">
            {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {connected ? "Connected" : "Connecting…"}
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-center">
            <div className="h-20 w-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
              <Monitor className="h-10 w-10 text-white/60" />
            </div>
            <h2 className="text-4xl font-bold mb-2">{display?.owner_name}</h2>
            <p className="text-xl text-white/50 mb-2">{display?.name}</p>
            
            {/* Show join code only if nobody is connected */}
            {joinCode && !hasParticipants && (
              <div className="mt-8 bg-white/5 border border-white/10 rounded-xl px-8 py-4 inline-block">
                <p className="text-xs text-white/40 mb-1">Join Code</p>
                <p className="text-4xl font-mono font-bold tracking-widest">{joinCode}</p>
              </div>
            )}
            
            <div className="mt-8 flex items-center justify-center gap-2 text-white/30">
              <div className="h-2 w-2 rounded-full bg-white/30 animate-pulse" />
              <span className="text-sm">Waiting for broadcast…</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active session with workout state
  const currentEx = workoutState?.exercises?.[workoutState.currentExerciseIndex];
  const isResting = workoutState?.phase === "rest";
  const shareLevel = workoutState?.shareLevel || "structure_only";
  
  // Next exercise
  const nextExIndex = (workoutState?.currentExerciseIndex ?? 0) + 1;
  const nextEx = workoutState?.exercises?.[nextExIndex];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-white/80">{display?.owner_name}</h1>
          <span className="text-white/30">·</span>
          <span className="text-white/50">{session.title || display?.name}</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Show join code only if no participants */}
          {joinCode && !hasParticipants && (
            <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-1.5">
              <p className="text-xs text-white/40">Join</p>
              <p className="text-lg font-mono font-bold tracking-widest">{joinCode}</p>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-white/30 text-xs">
            {connected ? <Wifi className="h-3.5 w-3.5 text-emerald-400" /> : <WifiOff className="h-3.5 w-3.5 text-red-400" />}
          </div>
        </div>
      </header>

      {/* Full workout display */}
      <div className="flex-1 flex flex-col p-8 gap-6">
        {/* Workout Timer + Name */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{workoutState!.workoutName}</h2>
            <p className="text-white/40 text-sm">
              Exercise {(workoutState!.currentExerciseIndex || 0) + 1} of {workoutState!.exercises.length}
            </p>
          </div>
          <div className="text-right">
            <p className="text-5xl font-mono font-bold tabular-nums text-white/90">
              {formatTimeLong(elapsedTick)}
            </p>
            <p className="text-xs text-white/30 mt-1">Elapsed</p>
          </div>
        </div>

        {/* Block Context (EMOM/AMRAP) with local countdown */}
        {workoutState!.blockContext && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              "rounded-xl border p-6",
              workoutState!.blockContext.type === "emom" && "border-amber-500/30 bg-amber-500/5",
              workoutState!.blockContext.type === "amrap" && "border-red-500/30 bg-red-500/5",
              workoutState!.blockContext.type === "ygig" && "border-blue-500/30 bg-blue-500/5",
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {workoutState!.blockContext.type === "emom" && <Timer className="h-6 w-6 text-amber-400" />}
                {workoutState!.blockContext.type === "amrap" && <Zap className="h-6 w-6 text-red-400" />}
                {workoutState!.blockContext.type === "ygig" && <Users className="h-6 w-6 text-blue-400" />}
                <div>
                  <p className="text-lg font-bold">{workoutState!.blockContext.name}</p>
                  <p className="text-sm text-white/50">
                    {workoutState!.blockContext.type === "amrap" 
                      ? `${Math.floor((workoutState!.blockContext.timeCapSeconds || 0) / 60)} min cap`
                      : `Round ${workoutState!.blockContext.round} of ${workoutState!.blockContext.totalRounds}`
                    }
                  </p>
                </div>
              </div>
              {blockTimeRemaining != null && (
                <p className={cn(
                  "text-4xl font-mono font-bold tabular-nums",
                  blockTimeRemaining <= 10 && "text-red-400 animate-pulse",
                  blockTimeRemaining > 10 && blockTimeRemaining <= 30 && "text-amber-400",
                )}>
                  {formatTime(blockTimeRemaining)}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Rest Timer Banner / Elapsed since rest */}
        <AnimatePresence mode="wait">
          {isResting && localRestRemaining != null && localRestRemaining > 0 ? (
            <motion.div
              key="rest-banner"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-xl border border-blue-500/30 bg-blue-500/5 px-6 py-3 flex items-center justify-between"
            >
              <p className="text-sm font-semibold text-blue-400 uppercase tracking-wider">Rest</p>
              <p className="text-3xl font-mono font-bold tabular-nums text-blue-400">
                {formatTime(localRestRemaining)}
              </p>
            </motion.div>
          ) : restEndedAt && elapsedSinceRest > 0 ? (
            <motion.div
              key="elapsed-banner"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 text-white/40 text-sm"
            >
              <Clock className="h-4 w-4" />
              <span>{formatTime(elapsedSinceRest)} since rest</span>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Current Exercise Card */}
        {currentEx && (
          <motion.div
            key={workoutState!.currentExerciseIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex flex-col justify-center"
          >
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Current Exercise</p>
              <h3 className="text-4xl font-bold mb-4">{currentEx.name}</h3>

              {/* Sets Grid - varies by share level */}
              {/* Sets display - all modes show boxes */}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mt-4">
                {currentEx.sets.map((set, i) => {
                  const isCurrentSet = i === (workoutState!.currentSetIndex ?? 0);
                  const repsLabel = set.completedReps ?? set.targetReps ?? "–";

                  if (shareLevel === "full_stats") {
                    return (
                      <div
                        key={i}
                        className={cn(
                          "rounded-xl p-4 text-center border transition-all",
                          set.completed
                            ? "bg-emerald-500/10 border-emerald-500/30"
                            : isCurrentSet
                            ? "bg-white/10 border-white/30 ring-2 ring-white/20"
                            : "bg-white/[0.02] border-white/5"
                        )}
                      >
                        <p className="text-xs text-white/40 mb-1">Set {i + 1}</p>
                        {set.completed && set.completedWeight != null ? (
                          <>
                            <p className="text-lg font-bold">{set.completedWeight}kg</p>
                            <p className="text-sm text-white/50">× {set.completedReps ?? "–"}</p>
                          </>
                        ) : set.completed ? (
                          <p className="text-lg font-bold text-emerald-400">✓</p>
                        ) : (
                          <p className="text-lg font-mono text-white/50">{String(repsLabel)}</p>
                        )}
                      </div>
                    );
                  }

                  if (shareLevel === "completion_only") {
                    return (
                      <div
                        key={i}
                        className={cn(
                          "rounded-xl p-4 text-center border transition-all",
                          set.completed
                            ? "bg-emerald-500/10 border-emerald-500/30"
                            : isCurrentSet
                            ? "bg-white/10 border-white/30 ring-2 ring-white/20"
                            : "bg-white/[0.02] border-white/5"
                        )}
                      >
                        <p className="text-xs text-white/40 mb-1">Set {i + 1}</p>
                        {set.completed ? (
                          <p className="text-lg font-bold text-emerald-400">✓</p>
                        ) : (
                          <p className="text-lg font-mono text-white/50">{String(repsLabel)}</p>
                        )}
                      </div>
                    );
                  }

                  // structure_only — boxes with rep targets, no weights
                  return (
                    <div
                      key={i}
                      className={cn(
                        "rounded-xl p-4 text-center border transition-all",
                        set.completed
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : isCurrentSet
                          ? "bg-white/10 border-white/30 ring-2 ring-white/20"
                          : "bg-white/[0.02] border-white/5"
                      )}
                    >
                      <p className="text-xs text-white/40 mb-1">Set {i + 1}</p>
                      <p className={cn(
                        "text-lg font-mono",
                        set.completed ? "text-emerald-400" : "text-white/50"
                      )}>
                        {String(repsLabel)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Next Exercise Preview */}
            {nextEx && (
              <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-6">
                <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Up Next</p>
                <h4 className="text-2xl font-semibold text-white/70">{nextEx.name}</h4>
                <p className="text-white/40 text-sm mt-1">
                  {nextEx.sets.length} sets · {nextEx.sets[0]?.targetReps} reps
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Exercise List (mini) */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {workoutState!.exercises.map((ex, i) => {
            const allDone = ex.sets.every(s => s.completed);
            const isCurrent = i === workoutState!.currentExerciseIndex;
            return (
              <div
                key={i}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-2 text-sm border transition-all",
                  isCurrent ? "bg-white/10 border-white/30 font-semibold" :
                  allDone ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                  "bg-white/[0.02] border-white/5 text-white/40"
                )}
              >
                {ex.name.length > 20 ? ex.name.substring(0, 20) + "…" : ex.name}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
