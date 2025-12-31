// Extended workout types for active workout state management

export interface ExerciseSet {
  setNumber: number;
  targetWeight: number | null;
  targetReps: string;
  completedWeight: number | null;
  completedReps: number | null;
  completed: boolean;
  completedAt: string | null;
  // Advanced metrics (progressive disclosure)
  rpe: number | null;
  tempo: string | null;
  note: string | null;
}

export interface ActiveExercise {
  exerciseId: string;
  name: string;
  originalIndex: number;
  sets: ExerciseSet[];
  restDuration: number; // seconds
  skipped: boolean;
  swappedFrom: string | null; // original exercise id if swapped
  addedMidWorkout: boolean;
  muscleGroup?: string;
}

export interface HRData {
  currentHR: number;
  zone: number;
  timeInZones: { [key: number]: number }; // zone -> seconds
  avgHR: number;
  maxHR: number;
  samples: { timestamp: number; hr: number }[];
}

export interface ActiveWorkoutState {
  workoutId: string;
  workoutName: string;
  startedAt: string;
  currentExerciseIndex: number;
  currentSetIndex: number;
  phase: 'exercise' | 'rest' | 'complete' | 'paused';
  exercises: ActiveExercise[];
  elapsedTime: number; // seconds
  restTimeRemaining: number;
  restTimerStartedAt: string | null;
  restTimerPausedAt: string | null;
  restDuration: number; // target rest duration for current rest
  hrData: HRData;
  workoutNote: string | null;
  status: 'active' | 'completed' | 'abandoned';
  completedAt: string | null;
  lastSavedAt: string;
}

export interface ExerciseHistory {
  date: string;
  sets: { weight: number | null; reps: number | null }[];
  estimatedOneRM: number | null;
}

export interface ExerciseAlternative {
  id: string;
  name: string;
  difficulty: 'easier' | 'same' | 'harder';
  muscleGroup: string;
}

// Calculate estimated 1RM using Epley formula
export function calculateOneRM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

// Get HR zone based on percentage of max HR
export function getHRZone(currentHR: number, maxHR: number): number {
  const percentage = (currentHR / maxHR) * 100;
  if (percentage < 60) return 1;
  if (percentage < 70) return 2;
  if (percentage < 80) return 3;
  if (percentage < 90) return 4;
  return 5;
}
