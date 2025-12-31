import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ActiveWorkoutState, 
  ActiveExercise, 
  ExerciseSet,
  getHRZone 
} from '@/types/workout';
import { type Exercise, type Workout } from '@/data/workouts';

const STORAGE_KEY = 'active_workout_state';
const HR_UPDATE_INTERVAL = 2000;

function createInitialExercise(exercise: Exercise, index: number): ActiveExercise {
  const sets: ExerciseSet[] = Array.from({ length: exercise.sets }, (_, i) => ({
    setNumber: i + 1,
    targetWeight: exercise.weight ?? null,
    targetReps: exercise.reps,
    completedWeight: exercise.weight ?? null,
    completedReps: null,
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
    restDuration: 90,
    skipped: false,
    swappedFrom: null,
    addedMidWorkout: false,
    muscleGroup: undefined,
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

export function useWorkoutState(workout: Workout | null, resumeState?: ActiveWorkoutState | null) {
  const [state, setState] = useState<ActiveWorkoutState | null>(() => {
    if (resumeState) return resumeState;
    if (workout) return createInitialState(workout);
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

  // Simulated HR updates (would connect to real device)
  useEffect(() => {
    if (!state || state.phase === 'complete') return;
    
    const timer = setInterval(() => {
      setState(prev => {
        if (!prev) return null;
        
        // Simulate HR (in real app, this would come from device)
        const baseHR = prev.phase === 'rest' ? 100 : 130;
        const variation = Math.floor(Math.random() * 20) - 10;
        const newHR = Math.max(60, Math.min(190, baseHR + variation));
        const zone = getHRZone(newHR, 190); // Using 190 as default max HR
        
        const newSamples = [...prev.hrData.samples, { timestamp: Date.now(), hr: newHR }].slice(-100);
        const avgHR = newSamples.length > 0 
          ? Math.round(newSamples.reduce((sum, s) => sum + s.hr, 0) / newSamples.length)
          : newHR;
        
        return {
          ...prev,
          hrData: {
            ...prev.hrData,
            currentHR: newHR,
            zone,
            avgHR,
            maxHR: Math.max(prev.hrData.maxHR, newHR),
            samples: newSamples,
            timeInZones: {
              ...prev.hrData.timeInZones,
              [zone]: (prev.hrData.timeInZones[zone] || 0) + (HR_UPDATE_INTERVAL / 1000),
            },
          },
        };
      });
    }, HR_UPDATE_INTERVAL);
    
    return () => clearInterval(timer);
  }, [state?.phase]);

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
      const currentSet = currentExercise.sets[prev.currentSetIndex];
      
      // Mark set as completed
      currentSet.completed = true;
      currentSet.completedAt = new Date().toISOString();
      if (currentSet.completedReps === null) {
        // Parse target reps (handle ranges like "8-10")
        const repsMatch = currentSet.targetReps.match(/\d+/);
        currentSet.completedReps = repsMatch ? parseInt(repsMatch[0]) : 0;
      }
      
      const isLastSet = prev.currentSetIndex >= currentExercise.sets.length - 1;
      const isLastExercise = prev.currentExerciseIndex >= exercises.length - 1;
      
      if (isLastSet && isLastExercise) {
        return { ...prev, exercises, phase: 'complete', status: 'completed', completedAt: new Date().toISOString() };
      }
      
      const nextExerciseIndex = isLastSet ? prev.currentExerciseIndex + 1 : prev.currentExerciseIndex;
      const nextSetIndex = isLastSet ? 0 : prev.currentSetIndex + 1;
      const restDuration = isLastSet ? 120 : 90; // Longer rest between exercises
      
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

  // Update set values (weight, reps)
  const updateSet = useCallback((exerciseIndex: number, setIndex: number, updates: Partial<ExerciseSet>) => {
    setState(prev => {
      if (!prev) return null;
      const exercises = [...prev.exercises];
      exercises[exerciseIndex].sets[setIndex] = {
        ...exercises[exerciseIndex].sets[setIndex],
        ...updates,
      };
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

  // Edit rest duration
  const editRestDuration = useCallback((newDuration: number) => {
    setState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        restDuration: newDuration,
        restTimeRemaining: newDuration,
        restTimerStartedAt: new Date().toISOString(),
        restTimerPausedAt: null,
      };
    });
  }, []);

  // Swap exercise
  const swapExercise = useCallback((exerciseIndex: number, newExercise: { id: string; name: string }) => {
    setState(prev => {
      if (!prev) return null;
      const exercises = [...prev.exercises];
      const originalExercise = exercises[exerciseIndex];
      
      exercises[exerciseIndex] = {
        ...originalExercise,
        exerciseId: newExercise.id,
        name: newExercise.name,
        swappedFrom: originalExercise.exerciseId,
      };
      
      return { ...prev, exercises };
    });
  }, []);

  // Add exercise
  const addExercise = useCallback((exercise: { id: string; name: string; sets?: number }) => {
    setState(prev => {
      if (!prev) return null;
      const newExercise: ActiveExercise = {
        exerciseId: exercise.id,
        name: exercise.name,
        originalIndex: prev.exercises.length,
        sets: Array.from({ length: exercise.sets || 3 }, (_, i) => ({
          setNumber: i + 1,
          targetWeight: null,
          targetReps: '8-12',
          completedWeight: null,
          completedReps: null,
          completed: false,
          completedAt: null,
          rpe: null,
          tempo: null,
          note: null,
        })),
        restDuration: 90,
        skipped: false,
        swappedFrom: null,
        addedMidWorkout: true,
      };
      
      return { ...prev, exercises: [...prev.exercises, newExercise] };
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
    removeExercise,
    setWorkoutNote,
    endWorkout,
  };
}
