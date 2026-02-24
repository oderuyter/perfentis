// Hook for managing block execution state during active workouts
import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type {
  WorkoutBlock, BlockType, ActiveBlockState,
  EmomSettings, AmrapSettings, YgigSettings, SupersetSettings
} from "@/types/workout-blocks";

const BLOCK_STATE_KEY = "active_block_states";

interface UseBlockExecutionProps {
  blocks: WorkoutBlock[];
  sessionId?: string;
}

export function useBlockExecution({ blocks, sessionId }: UseBlockExecutionProps) {
  const { user } = useAuth();
  const [blockStates, setBlockStates] = useState<Map<string, ActiveBlockState>>(() => {
    // Try to restore from localStorage
    try {
      const saved = localStorage.getItem(BLOCK_STATE_KEY);
      if (saved) return new Map(JSON.parse(saved));
    } catch {}
    return new Map();
  });

  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // Persist block states to localStorage
  useEffect(() => {
    if (blockStates.size > 0) {
      localStorage.setItem(BLOCK_STATE_KEY, JSON.stringify(Array.from(blockStates.entries())));
    }
  }, [blockStates]);

  // Get or create block state
  const getBlockState = useCallback((blockId: string): ActiveBlockState | undefined => {
    return blockStates.get(blockId);
  }, [blockStates]);

  // Start a block
  const startBlock = useCallback(async (block: WorkoutBlock) => {
    const state: ActiveBlockState = {
      blockId: block.id,
      blockType: block.type,
      title: block.title,
      settings: block.settings,
      status: 'active',
      startedAt: new Date().toISOString(),
    };

    // Type-specific initialization
    if (block.type === 'emom') {
      const s = block.settings as EmomSettings;
      state.currentRound = 1;
      state.totalRounds = s.rounds;
    } else if (block.type === 'amrap') {
      const s = block.settings as AmrapSettings;
      state.timeCapSeconds = s.time_cap_seconds;
      state.amrapStartedAt = new Date().toISOString();
      state.roundsCompleted = 0;
      state.repsInCurrentRound = 0;
    } else if (block.type === 'ygig') {
      state.participants = user ? [user.id] : [];
      state.activeParticipantUserId = user?.id;
      state.turnIndex = 0;
      state.pendingInvites = [];
    }

    setBlockStates(prev => new Map(prev).set(block.id, state));
    setActiveBlockId(block.id);

    // Create block_instance in DB
    if (sessionId) {
      try {
        await supabase.from("block_instances").insert({
          workout_session_id: sessionId,
          block_id: block.id,
          status: "active",
          started_at: state.startedAt,
          context_json: JSON.parse(JSON.stringify(state)),
        } as any);
      } catch (err) {
        console.warn("Failed to create block instance:", err);
      }
    }

    return state;
  }, [user, sessionId]);

  // Complete a block
  const completeBlock = useCallback(async (blockId: string, contextUpdates?: Partial<ActiveBlockState>) => {
    setBlockStates(prev => {
      const next = new Map(prev);
      const existing = next.get(blockId);
      if (existing) {
        next.set(blockId, {
          ...existing,
          ...contextUpdates,
          status: 'completed',
        });
      }
      return next;
    });

    if (activeBlockId === blockId) {
      setActiveBlockId(null);
    }

    // Update DB
    if (sessionId) {
      try {
        await supabase
          .from("block_instances")
          .update({
            status: "completed",
            ended_at: new Date().toISOString(),
            context_json: JSON.parse(JSON.stringify({ ...blockStates.get(blockId), ...contextUpdates, status: 'completed' })),
          })
          .eq("block_id", blockId)
          .eq("workout_session_id", sessionId);
      } catch (err) {
        console.warn("Failed to update block instance:", err);
      }
    }
  }, [activeBlockId, sessionId, blockStates]);

  // Update block state (for timer ticks, round changes, etc.)
  const updateBlockState = useCallback((blockId: string, updates: Partial<ActiveBlockState>) => {
    setBlockStates(prev => {
      const next = new Map(prev);
      const existing = next.get(blockId);
      if (existing) {
        next.set(blockId, { ...existing, ...updates });
      }
      return next;
    });
  }, []);

  // YGIG: Add partner
  const addYgigPartner = useCallback((blockId: string, partner: { userId: string; displayName: string }) => {
    setBlockStates(prev => {
      const next = new Map(prev);
      const existing = next.get(blockId);
      if (existing) {
        const participants = [...(existing.participants || []), partner.userId];
        next.set(blockId, { ...existing, participants });
      }
      return next;
    });
  }, []);

  // YGIG: Complete turn (rotate to next participant)
  const completeYgigTurn = useCallback((blockId: string) => {
    setBlockStates(prev => {
      const next = new Map(prev);
      const existing = next.get(blockId);
      if (existing && existing.participants) {
        const nextTurn = (existing.turnIndex || 0) + 1;
        const nextParticipantIndex = nextTurn % existing.participants.length;
        next.set(blockId, {
          ...existing,
          turnIndex: nextTurn,
          activeParticipantUserId: existing.participants[nextParticipantIndex],
        });
      }
      return next;
    });
  }, []);

  // EMOM: Advance round
  const advanceEmomRound = useCallback((blockId: string) => {
    setBlockStates(prev => {
      const next = new Map(prev);
      const existing = next.get(blockId);
      if (existing) {
        const nextRound = (existing.currentRound || 1) + 1;
        if (nextRound > (existing.totalRounds || 0)) {
          next.set(blockId, { ...existing, status: 'completed' });
        } else {
          next.set(blockId, { ...existing, currentRound: nextRound });
        }
      }
      return next;
    });
  }, []);

  // AMRAP: Update score
  const updateAmrapScore = useCallback((blockId: string, rounds: number, reps: number) => {
    updateBlockState(blockId, { roundsCompleted: rounds, repsInCurrentRound: reps });
  }, [updateBlockState]);

  // Clear all block states (on workout end)
  const clearBlockStates = useCallback(() => {
    setBlockStates(new Map());
    setActiveBlockId(null);
    localStorage.removeItem(BLOCK_STATE_KEY);
  }, []);

  return {
    blockStates,
    activeBlockId,
    getBlockState,
    startBlock,
    completeBlock,
    updateBlockState,
    addYgigPartner,
    completeYgigTurn,
    advanceEmomRound,
    updateAmrapScore,
    clearBlockStates,
  };
}
