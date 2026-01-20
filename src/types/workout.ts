// Extended workout types for active workout state management

export type ExerciseSetType = 'strength' | 'cardio';

export interface ExerciseSet {
  setNumber: number;
  // Strength metrics
  targetWeight: number | null;
  targetReps: string;
  completedWeight: number | null;
  completedReps: number | null;
  // Cardio metrics
  targetTime: number | null; // seconds
  targetDistance: number | null; // meters (stored in metric, converted for display)
  completedTime: number | null; // seconds
  completedDistance: number | null; // meters
  completedSpeed: number | null; // m/s (stored in metric)
  // Pace is auto-calculated from time and distance
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
  exerciseType?: ExerciseSetType; // 'strength' or 'cardio'
}

// Unit conversion helpers
export function metersToMiles(meters: number): number {
  return meters / 1609.344;
}

export function milesToMeters(miles: number): number {
  return miles * 1609.344;
}

export function metersToKm(meters: number): number {
  return meters / 1000;
}

export function kmToMeters(km: number): number {
  return km * 1000;
}

// Calculate pace from time (seconds) and distance (meters)
// Returns pace in min/km or min/mile based on units
export function calculatePace(timeSeconds: number, distanceMeters: number, units: 'metric' | 'imperial' = 'metric'): string {
  if (!timeSeconds || !distanceMeters || distanceMeters === 0) return '—';
  
  const distanceInUnit = units === 'metric' 
    ? distanceMeters / 1000 // km
    : metersToMiles(distanceMeters); // miles
  
  const paceSeconds = timeSeconds / distanceInUnit;
  const paceMinutes = Math.floor(paceSeconds / 60);
  const paceSecs = Math.round(paceSeconds % 60);
  
  return `${paceMinutes}:${paceSecs.toString().padStart(2, '0')}`;
}

// Calculate speed from time (seconds) and distance (meters)
// Returns speed in km/h or mph based on units
export function calculateSpeed(timeSeconds: number, distanceMeters: number, units: 'metric' | 'imperial' = 'metric'): number {
  if (!timeSeconds || !distanceMeters || timeSeconds === 0) return 0;
  
  const speedMps = distanceMeters / timeSeconds; // m/s
  
  if (units === 'metric') {
    return Math.round(speedMps * 3.6 * 10) / 10; // km/h
  } else {
    return Math.round(speedMps * 2.237 * 10) / 10; // mph
  }
}

// Format time duration as MM:SS or HH:MM:SS
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Parse duration string (MM:SS or HH:MM:SS) to seconds
export function parseDuration(duration: string): number {
  const parts = duration.split(':').map(p => parseInt(p) || 0);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parseInt(duration) || 0;
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
