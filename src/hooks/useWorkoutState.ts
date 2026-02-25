import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ActiveWorkoutState, 
  ActiveExercise, 
  ExerciseSet,
  ExerciseSetType,
  getHRZone 
} from '@/types/workout';
import { type Exercise, type Workout } from '@/data/workouts';

const STORAGE_KEY = 'active_workout_state';
const HR_UPDATE_INTERVAL = 2000;

function createInitialExercise(exercise: Exercise, index: number): ActiveExercise {
  const isCardio = exercise.exerciseType === 'cardio';
  
  const sets: ExerciseSet[] = Array.from({ length: exercise.sets }, (_, i) => ({
    setNumber: i + 1,
    targetWeight: exercise.weight ?? null,
    targetReps: exercise.reps,
    completedWeight: exercise.weight ?? null,
    completedReps: null,
    // Cardio fields
    targetTime: exercise.duration ? exercise.duration * 60 : null,
    targetDistance: null,
    completedTime: null,
    completedDistance: null,
    completedSpeed: null,
    // Common fields
    completed: false,
    completedAt: null,
    rpe: null,
    tempo: null,
    note: null,
  }));

  return {
    exerciseId: exercise.id,
    name: exercise.name,
    originalIndex: index,
    sets,
    restDuration: (exercise as any).restDuration || (isCardio ? 60 : 90),
    skipped: false,
    swappedFrom: null,
    addedMidWorkout: false,
    muscleGroup: undefined,
    exerciseType: exercise.exerciseType,
  };
}

function createInitialState(workout: Workout): ActiveWorkoutState {
  return {
    workoutId: workout.id,
    workoutName: workout.name,
    startedAt: new Date().toISOString(),
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    phase: 'exercise',
    exercises: workout.exercises.map((ex, i) => createInitialExercise(ex, i)),
    elapsedTime: 0,
    restTimeRemaining: 90,
    restTimerStartedAt: null,
    restTimerPausedAt: null,
    restDuration: 90,
    hrData: {
      currentHR: 0,
      zone: 1,
      timeInZones: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      avgHR: 0,
      maxHR: 0,
      samples: [],
    },
    workoutNote: null,
    status: 'active',
    completedAt: null,
    lastSavedAt: new Date().toISOString(),
  };
}

function createFreeformState(): ActiveWorkoutState {
  return {
    workoutId: 'freeform',
    workoutName: 'Freeform Workout',
    startedAt: new Date().toISOString(),
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    phase: 'exercise',
    exercises: [],
    elapsedTime: 0,
    restTimeRemaining: 90,
    restTimerStartedAt: null,
    restTimerPausedAt: null,
    restDuration: 90,
    hrData: {
      currentHR: 0,
      zone: 1,
      timeInZones: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      avgHR: 0,
      maxHR: 0,
      samples: [],
    },
    workoutNote: null,
    status: 'active',
    completedAt: null,
    lastSavedAt: new Date().toISOString(),
  };
}

export function loadSavedWorkout(): ActiveWorkoutState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const state = JSON.parse(saved) as ActiveWorkoutState;
    // Only return if status is active
    if (state.status !== 'active') return null;
    return state;
  } catch {
    return null;
  }
}

export function clearSavedWorkout(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function useWorkoutState(workout: Workout | null, resumeState?: ActiveWorkoutState | null, isFreeform?: boolean) {
  const [state, setState] = useState<ActiveWorkoutState | null>(() => {
    if (resumeState) return resumeState;
    if (workout) return createInitialState(workout);
    if (isFreeform) return createFreeformState();
    return null;
  });

  const lastSaveRef = useRef<string | null>(null);
  const completeSetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Save to localStorage on every state change
  const saveState = useCallback((newState: ActiveWorkoutState) => {
    const stateToSave = { ...newState, lastSavedAt: new Date().toISOString() };
    const stateString = JSON.stringify(stateToSave);
    if (stateString !== lastSaveRef.current) {
      localStorage.setItem(STORAGE_KEY, stateString);
      lastSaveRef.current = stateString;
    }
  }, []);

  // Auto-save whenever state changes
  useEffect(() => {
    if (state && state.status === 'active') {
      saveState(state);
    }
  }, [state, saveState]);

  // Elapsed time counter
  useEffect(() => {
    if (!state || state.phase === 'complete' || state.phase === 'paused') return;
    
    const timer = setInterval(() => {
      setState(prev => prev ? { ...prev, elapsedTime: prev.elapsedTime + 1 } : null);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [state?.phase]);

  // Rest timer countdown with resilience (recovers from backgrounding)
  useEffect(() => {
    if (!state || state.phase !== 'rest') return;
    
    const timer = setInterval(() => {
      setState(prev => {
        if (!prev || prev.phase !== 'rest') return prev;
        
        // Calculate actual remaining based on when rest started
        let remaining = prev.restTimeRemaining;
        if (prev.restTimerStartedAt && !prev.restTimerPausedAt) {
          const elapsed = Math.floor((Date.now() - new Date(prev.restTimerStartedAt).getTime()) / 1000);
          remaining = Math.max(0, prev.restDuration - elapsed);
        }
        
        if (remaining <= 0) {
          return { ...prev, phase: 'exercise', restTimeRemaining: 0 };
        }
        
        return { ...prev, restTimeRemaining: remaining };
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [state?.phase, state?.restTimerStartedAt]);

  // HR data is now provided externally via useHeartRateMonitor hook
  // Demo HR simulation has been removed

  // Complete current set
  const completeSet = useCallback(() => {
    // Prevent double-taps
    if (completeSetTimeoutRef.current) return;
    
    completeSetTimeoutRef.current = setTimeout(() => {
      completeSetTimeoutRef.current = null;
    }, 500);

    setState(prev => {
      if (!prev) return null;
      
      const exercises = [...prev.exercises];
      const currentExercise = exercises[prev.currentExerciseIndex];
      if (!currentExercise) return prev;
      const currentSet = currentExercise.sets[prev.currentSetIndex];
      if (!currentSet) return prev;
      
      // Mark set as completed
      currentSet.completed = true;
      currentSet.completedAt = new Date().toISOString();
      // Only auto-fill reps for strength exercises
      if (currentExercise.exerciseType !== 'cardio' && currentSet.completedReps === null) {
        // Parse target reps (handle ranges like "8-10"), targetReps may be number or string
        const targetStr = String(currentSet.targetReps || '');
        const repsMatch = targetStr.match(/\d+/);
        currentSet.completedReps = repsMatch ? parseInt(repsMatch[0]) : 0;
      }
      
      const isLastSet = prev.currentSetIndex >= currentExercise.sets.length - 1;
      const nonSkippedExercises = exercises.filter(e => !e.skipped);
      const currentNonSkippedIndex = nonSkippedExercises.findIndex(e => e.exerciseId === currentExercise.exerciseId && e.originalIndex === currentExercise.originalIndex);
      const isLastExercise = currentNonSkippedIndex >= nonSkippedExercises.length - 1;
      
      if (isLastSet && isLastExercise) {
        // Signal that we need the "add more or finish" prompt
        return { ...prev, exercises, phase: 'complete' as const };
      }
      
      const nextExerciseIndex = isLastSet 
        ? exercises.findIndex((e, i) => i > prev.currentExerciseIndex && !e.skipped)
        : prev.currentExerciseIndex;
      const nextSetIndex = isLastSet ? 0 : prev.currentSetIndex + 1;
      // Use the exercise's own rest duration instead of hardcoded values
      const restDuration = isLastSet 
        ? (exercises[nextExerciseIndex !== -1 ? nextExerciseIndex : 0]?.restDuration || 120) 
        : currentExercise.restDuration;
      
      return {
        ...prev,
        exercises,
        currentExerciseIndex: nextExerciseIndex,
        currentSetIndex: nextSetIndex,
        phase: 'rest',
        restTimeRemaining: restDuration,
        restDuration,
        restTimerStartedAt: new Date().toISOString(),
        restTimerPausedAt: null,
      };
    });
  }, []);

  // Update set values (weight, reps) with optional forward propagation for strength exercises
  const updateSet = useCallback((exerciseIndex: number, setIndex: number, updates: Partial<ExerciseSet>) => {
    setState(prev => {
      if (!prev) return null;
      const exercises = [...prev.exercises];
      const exercise = { ...exercises[exerciseIndex] };
      const sets = [...exercise.sets];
      sets[setIndex] = { ...sets[setIndex], ...updates };

      // In-session propagation: if weight was changed on a strength exercise,
      // propagate forward to subsequent uncompleted sets
      const isStrength = !exercise.exerciseType || exercise.exerciseType === 'strength' || exercise.exerciseType === 'weight_reps';
      if (isStrength && updates.completedWeight !== undefined) {
        const newWeight = updates.completedWeight;
        for (let i = setIndex + 1; i < sets.length; i++) {
          if (sets[i].completed) continue;
          // Only propagate if the set hasn't been manually edited to a different value
          const currentWeight = sets[i].completedWeight;
          if (currentWeight === null || currentWeight === sets[setIndex].targetWeight || currentWeight === sets[Math.max(0, i - 1)].completedWeight) {
            sets[i] = { ...sets[i], completedWeight: newWeight };
          }
        }
      }

      exercise.sets = sets;
      exercises[exerciseIndex] = exercise;
      return { ...prev, exercises };
    });
  }, []);

  // Navigate to specific exercise
  const goToExercise = useCallback((exerciseIndex: number, setIndex: number = 0) => {
    setState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        currentExerciseIndex: exerciseIndex,
        currentSetIndex: setIndex,
        phase: 'exercise',
      };
    });
  }, []);

  // Skip rest
  const skipRest = useCallback(() => {
    setState(prev => prev ? { ...prev, phase: 'exercise', restTimeRemaining: 0 } : null);
  }, []);

  // Pause rest
  const pauseRest = useCallback(() => {
    setState(prev => {
      if (!prev || prev.phase !== 'rest') return prev;
      return { ...prev, restTimerPausedAt: new Date().toISOString() };
    });
  }, []);

  // Resume rest
  const resumeRest = useCallback(() => {
    setState(prev => {
      if (!prev || prev.phase !== 'rest' || !prev.restTimerPausedAt) return prev;
      // Adjust start time to account for pause duration
      const pauseDuration = Date.now() - new Date(prev.restTimerPausedAt).getTime();
      const newStartTime = new Date(new Date(prev.restTimerStartedAt!).getTime() + pauseDuration).toISOString();
      return { ...prev, restTimerStartedAt: newStartTime, restTimerPausedAt: null };
    });
  }, []);

  // Edit rest duration with optional apply to all remaining sets
  const editRestDuration = useCallback((newDuration: number, applyToAll?: boolean) => {
    setState(prev => {
      if (!prev) return null;
      
      let exercises = prev.exercises;
      
      // If apply to all, update rest duration for all remaining exercises
      if (applyToAll) {
        exercises = prev.exercises.map((exercise, idx) => {
          // Update current and all future exercises
          if (idx >= prev.currentExerciseIndex) {
            return { ...exercise, restDuration: newDuration };
          }
          return exercise;
        });
      }
      
      return {
        ...prev,
        exercises,
        restDuration: newDuration,
        restTimeRemaining: newDuration,
        restTimerStartedAt: new Date().toISOString(),
        restTimerPausedAt: null,
      };
    });
  }, []);

  // Swap exercise
  const swapExercise = useCallback((exerciseIndex: number, newExercise: { id: string; name: string; muscleGroup?: string }) => {
    setState(prev => {
      if (!prev) return null;
      const exercises = [...prev.exercises];
      const originalExercise = exercises[exerciseIndex];
      
      exercises[exerciseIndex] = {
        ...originalExercise,
        exerciseId: newExercise.id,
        name: newExercise.name,
        swappedFrom: originalExercise.exerciseId,
        muscleGroup: newExercise.muscleGroup || originalExercise.muscleGroup,
      };
      
      return { ...prev, exercises };
    });
  }, []);

  // Add exercise and optionally navigate to it
  const addExercise = useCallback((exercise: { id: string; name: string; sets?: number; version?: number; muscleGroup?: string; exerciseType?: 'strength' | 'cardio'; recordType?: string; restDuration?: number }, navigateTo: boolean = false) => {
    setState(prev => {
      if (!prev) return null;

      const isCardio = exercise.exerciseType === 'cardio';
      
      // Map record_type to exerciseType for the SetEditor
      const resolvedExerciseType: ExerciseSetType = exercise.recordType 
        ? (exercise.recordType as ExerciseSetType) 
        : (isCardio ? 'cardio' : 'weight_reps');

      const newExercise: ActiveExercise = {
        exerciseId: exercise.id,
        name: exercise.name,
        originalIndex: prev.exercises.length,
        sets: Array.from({ length: exercise.sets || 3 }, (_, i) => ({
          setNumber: i + 1,
          targetWeight: null,
          targetReps: isCardio ? '' : '8-12',
          completedWeight: null,
          completedReps: null,
          // Cardio fields
          targetTime: null,
          targetDistance: null,
          completedTime: null,
          completedDistance: null,
          completedSpeed: null,
          // Common fields
          completed: false,
          completedAt: null,
          rpe: null,
          tempo: null,
          note: null,
        })),
        restDuration: exercise.restDuration || (isCardio ? 60 : 90),
        skipped: false,
        swappedFrom: null,
        addedMidWorkout: true,
        muscleGroup: exercise.muscleGroup,
        exerciseType: resolvedExerciseType,
      };
      
      const newExercises = [...prev.exercises, newExercise];
      const newIndex = newExercises.length - 1;
      
      if (navigateTo) {
        return { ...prev, exercises: newExercises, currentExerciseIndex: newIndex, currentSetIndex: 0, phase: 'exercise' as const };
      }
      
      return { ...prev, exercises: newExercises };
    });
  }, []);

  // Remove exercise
  const removeExercise = useCallback((exerciseIndex: number) => {
    setState(prev => {
      if (!prev) return null;
      const exercises = [...prev.exercises];
      exercises[exerciseIndex].skipped = true;
      
      // If removing current exercise, move to next non-skipped one
      let newCurrentIndex = prev.currentExerciseIndex;
      if (exerciseIndex === prev.currentExerciseIndex) {
        const nextIndex = exercises.findIndex((ex, i) => i > exerciseIndex && !ex.skipped);
        let prevIndex = -1;
        for (let i = exerciseIndex - 1; i >= 0; i--) {
          if (!exercises[i].skipped) { prevIndex = i; break; }
        }
        newCurrentIndex = nextIndex !== -1 ? nextIndex : prevIndex !== -1 ? prevIndex : 0;
      }
      
      return { ...prev, exercises, currentExerciseIndex: newCurrentIndex, currentSetIndex: 0 };
    });
  }, []);

  // Add workout note
  const setWorkoutNote = useCallback((note: string) => {
    setState(prev => prev ? { ...prev, workoutNote: note } : null);
  }, []);

  // Add a set to an exercise
  const addSet = useCallback((exerciseIndex: number) => {
    setState(prev => {
      if (!prev) return null;
      const exercises = [...prev.exercises];
      const exercise = exercises[exerciseIndex];
      const lastSet = exercise.sets[exercise.sets.length - 1];
      const isCardio = exercise.exerciseType === 'cardio';
      
      const newSet: ExerciseSet = {
        setNumber: exercise.sets.length + 1,
        targetWeight: lastSet?.targetWeight ?? null,
        targetReps: lastSet?.targetReps ?? (isCardio ? '' : '8-12'),
        completedWeight: lastSet?.completedWeight ?? null,
        completedReps: null,
        targetTime: lastSet?.targetTime ?? null,
        targetDistance: lastSet?.targetDistance ?? null,
        completedTime: null,
        completedDistance: null,
        completedSpeed: null,
        completed: false,
        completedAt: null,
        rpe: null,
        tempo: null,
        note: null,
      };
      
      exercises[exerciseIndex] = {
        ...exercise,
        sets: [...exercise.sets, newSet],
      };
      
      return { ...prev, exercises };
    });
  }, []);

  // Remove the last set from an exercise
  const removeSet = useCallback((exerciseIndex: number) => {
    setState(prev => {
      if (!prev) return null;
      const exercises = [...prev.exercises];
      const exercise = exercises[exerciseIndex];
      if (exercise.sets.length <= 1) return prev;
      
      exercises[exerciseIndex] = {
        ...exercise,
        sets: exercise.sets.slice(0, -1),
      };
      
      // Adjust currentSetIndex if it was pointing at the removed set
      const newSetIndex = prev.currentExerciseIndex === exerciseIndex && prev.currentSetIndex >= exercises[exerciseIndex].sets.length
        ? exercises[exerciseIndex].sets.length - 1
        : prev.currentSetIndex;
      
      return { ...prev, exercises, currentSetIndex: newSetIndex };
    });
  }, []);

  // Reorder exercise (move from one index to another)
  const reorderExercise = useCallback((fromIndex: number, toIndex: number) => {
    setState(prev => {
      if (!prev) return null;
      const exercises = [...prev.exercises];
      const [moved] = exercises.splice(fromIndex, 1);
      exercises.splice(toIndex, 0, moved);
      
      // Adjust currentExerciseIndex to follow the current exercise
      let newCurrentIndex = prev.currentExerciseIndex;
      if (prev.currentExerciseIndex === fromIndex) {
        newCurrentIndex = toIndex;
      } else if (fromIndex < prev.currentExerciseIndex && toIndex >= prev.currentExerciseIndex) {
        newCurrentIndex = prev.currentExerciseIndex - 1;
      } else if (fromIndex > prev.currentExerciseIndex && toIndex <= prev.currentExerciseIndex) {
        newCurrentIndex = prev.currentExerciseIndex + 1;
      }
      
      return { ...prev, exercises, currentExerciseIndex: newCurrentIndex };
    });
  }, []);

  // Continue workout after last exercise (user chose to add more)
  const continueWorkout = useCallback(() => {
    setState(prev => {
      if (!prev) return null;
      return { ...prev, phase: 'exercise' as const, status: 'active' as const };
    });
  }, []);

  // End workout (completed or abandoned)
  const endWorkout = useCallback((abandoned: boolean = false) => {
    setState(prev => {
      if (!prev) return null;
      const finalState = {
        ...prev,
        phase: 'complete' as const,
        status: abandoned ? 'abandoned' as const : 'completed' as const,
        completedAt: new Date().toISOString(),
      };
      
      // Clear from localStorage since workout is done
      localStorage.removeItem(STORAGE_KEY);
      
      return finalState;
    });
  }, []);

  return {
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
    setWorkoutNote,
    continueWorkout,
    endWorkout,
  };
}
