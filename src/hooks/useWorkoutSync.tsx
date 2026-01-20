import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { ActiveWorkoutState } from "@/types/workout";

const SYNC_QUEUE_KEY = "workout_sync_queue";
const SYNC_INTERVAL = 5000; // 5 seconds

interface SyncOperation {
  id: string;
  operationType: "create_session" | "update_set" | "add_exercise" | "complete_workout";
  payload: any;
  createdAt: string;
  retryCount: number;
}

function generateOperationId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function useWorkoutSync() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load pending operations count
  useEffect(() => {
    const queue = getLocalQueue();
    setPendingCount(queue.length);
  }, []);

  // Get local sync queue
  const getLocalQueue = useCallback((): SyncOperation[] => {
    try {
      const stored = localStorage.getItem(SYNC_QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Save to local sync queue
  const saveToLocalQueue = useCallback((operation: SyncOperation) => {
    const queue = getLocalQueue();
    queue.push(operation);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    setPendingCount(queue.length);
  }, [getLocalQueue]);

  // Remove from local queue
  const removeFromLocalQueue = useCallback((operationId: string) => {
    const queue = getLocalQueue();
    const filtered = queue.filter((op) => op.id !== operationId);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
    setPendingCount(filtered.length);
  }, [getLocalQueue]);

  // Process a single sync operation
  const processSyncOperation = useCallback(async (operation: SyncOperation): Promise<boolean> => {
    if (!user) return false;

    try {
      switch (operation.operationType) {
        case "create_session": {
          // Check if already exists (idempotency)
          const { data: existing } = await supabase
            .from("workout_sessions")
            .select("id")
            .eq("operation_id", operation.id)
            .maybeSingle();

          if (existing) {
            // Already synced
            return true;
          }

          const { error } = await supabase
            .from("workout_sessions")
            .insert({
              ...operation.payload,
              operation_id: operation.id,
              synced_at: new Date().toISOString(),
            });

          if (error) throw error;
          return true;
        }

        case "update_set": {
          const { error } = await supabase
            .from("set_logs")
            .update(operation.payload.updates)
            .eq("id", operation.payload.setLogId);

          if (error) throw error;
          return true;
        }

        case "complete_workout": {
          // Idempotent update
          const { error } = await supabase
            .from("workout_sessions")
            .update({
              status: "completed",
              ended_at: operation.payload.endedAt,
              synced_at: new Date().toISOString(),
            })
            .eq("operation_id", operation.payload.originalOperationId);

          if (error) throw error;
          return true;
        }

        default:
          return true;
      }
    } catch (error) {
      console.error("Sync operation failed:", error);
      return false;
    }
  }, [user]);

  // Process sync queue
  const processQueue = useCallback(async () => {
    if (!isOnline || isSyncing || !user) return;

    const queue = getLocalQueue();
    if (queue.length === 0) return;

    setIsSyncing(true);

    for (const operation of queue) {
      const success = await processSyncOperation(operation);
      if (success) {
        removeFromLocalQueue(operation.id);
      } else {
        // Update retry count
        operation.retryCount += 1;
        if (operation.retryCount >= 3) {
          // Mark as failed in DB for admin review
          console.error("Operation failed after 3 retries:", operation);
          removeFromLocalQueue(operation.id);
        }
      }
    }

    setIsSyncing(false);
  }, [isOnline, isSyncing, user, getLocalQueue, processSyncOperation, removeFromLocalQueue]);

  // Start sync interval when online
  useEffect(() => {
    if (isOnline && user) {
      // Process immediately when coming online
      processQueue();

      // Set up interval
      syncIntervalRef.current = setInterval(processQueue, SYNC_INTERVAL);
    } else if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isOnline, user, processQueue]);

  // Queue a workout session save
  const queueWorkoutSave = useCallback((workoutState: ActiveWorkoutState): string => {
    const operationId = generateOperationId();
    
    // Calculate total volume
    let totalVolume = 0;
    workoutState.exercises.forEach((ex) => {
      ex.sets.forEach((set) => {
        if (set.completed && set.completedWeight && set.completedReps) {
          totalVolume += set.completedWeight * set.completedReps;
        }
      });
    });

    const operation: SyncOperation = {
      id: operationId,
      operationType: "create_session",
      payload: {
        user_id: user?.id,
        workout_template_id: workoutState.workoutId,
        workout_name: workoutState.workoutName,
        started_at: workoutState.startedAt,
        ended_at: workoutState.completedAt,
        duration_seconds: workoutState.elapsedTime,
        total_volume: totalVolume,
        avg_hr: workoutState.hrData.avgHR || null,
        max_hr: workoutState.hrData.maxHR || null,
        status: workoutState.status,
        notes: workoutState.workoutNote,
      },
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    saveToLocalQueue(operation);

    // Try to sync immediately if online
    if (isOnline) {
      processQueue();
    }

    return operationId;
  }, [user, saveToLocalQueue, isOnline, processQueue]);

  // Force sync now
  const syncNow = useCallback(async () => {
    if (isOnline) {
      await processQueue();
    }
  }, [isOnline, processQueue]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    queueWorkoutSave,
    syncNow,
  };
}

// Hook for detecting and recovering crashed workouts
export function useWorkoutRecovery() {
  const [hasRecoverableWorkout, setHasRecoverableWorkout] = useState(false);
  const [recoverableState, setRecoverableState] = useState<ActiveWorkoutState | null>(null);

  useEffect(() => {
    const checkForRecovery = () => {
      try {
        const saved = localStorage.getItem("active_workout_state");
        if (saved) {
          const state = JSON.parse(saved) as ActiveWorkoutState;
          if (state.status === "active") {
            setRecoverableState(state);
            setHasRecoverableWorkout(true);
          }
        }
      } catch {
        // No recoverable workout
      }
    };

    checkForRecovery();
  }, []);

  const clearRecovery = useCallback(() => {
    localStorage.removeItem("active_workout_state");
    setHasRecoverableWorkout(false);
    setRecoverableState(null);
  }, []);

  return {
    hasRecoverableWorkout,
    recoverableState,
    clearRecovery,
  };
}
