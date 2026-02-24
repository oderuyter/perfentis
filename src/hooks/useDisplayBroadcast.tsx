import { useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to broadcast workout state to a display channel.
 * Call `sendState(state)` on every meaningful state change (set complete, exercise change, rest start/end).
 * Call `sendTick(elapsed, restRemaining, phase)` every second for timer updates.
 */
export function useDisplayBroadcast(displayId: string | null) {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!displayId) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const channel = supabase.channel(`display:${displayId}`, {
      config: { broadcast: { self: false } },
    });
    channel.subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [displayId]);

  const sendState = useCallback((state: any) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "workout_update",
      payload: {
        type: "workout_state",
        data: {
          workoutName: state.workoutName,
          currentExerciseIndex: state.currentExerciseIndex,
          currentSetIndex: state.currentSetIndex,
          exercises: state.exercises.map((ex: any) => ({
            name: ex.name,
            exerciseType: ex.exerciseType,
            sets: ex.sets.map((s: any) => ({
              setNumber: s.setNumber,
              targetReps: s.targetReps,
              completed: s.completed,
              completedWeight: s.completedWeight,
              completedReps: s.completedReps,
            })),
          })),
          elapsedTime: state.elapsedTime,
          phase: state.phase,
          restRemaining: state.restRemaining,
          blockContext: state.blockContext || null,
        },
      },
    });
  }, []);

  const sendTick = useCallback((elapsedTime: number, restRemaining?: number, phase?: string) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "workout_update",
      payload: {
        type: "timer_tick",
        data: { elapsedTime, restRemaining, phase },
      },
    });
  }, []);

  const sendSetComplete = useCallback((exerciseIndex: number, setIndex: number, weight?: number, reps?: number, nextExerciseIndex?: number, nextSetIndex?: number) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "workout_update",
      payload: {
        type: "set_complete",
        data: { exerciseIndex, setIndex, weight, reps, nextExerciseIndex, nextSetIndex },
      },
    });
  }, []);

  const sendSessionEnd = useCallback(() => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "workout_update",
      payload: { type: "session_end", data: {} },
    });
  }, []);

  return { sendState, sendTick, sendSetComplete, sendSessionEnd };
}
