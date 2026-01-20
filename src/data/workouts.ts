// Placeholder workout data
export type ExerciseTypeData = 'strength' | 'cardio';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight?: number;
  duration?: number; // minutes for cardio
  notes?: string;
  exerciseType?: ExerciseTypeData;
}

export interface Workout {
  id: string;
  name: string;
  type: "strength" | "cardio" | "mixed";
  duration: number; // minutes
  exercises: Exercise[];
  focus?: string;
  description?: string;
}

export const workouts: Workout[] = [
  {
    id: "1",
    name: "Upper Body Push",
    type: "strength",
    duration: 45,
    focus: "Chest, Shoulders, Triceps",
    exercises: [
      { id: "1", name: "Bench Press", sets: 4, reps: "6-8", weight: 80 },
      { id: "2", name: "Overhead Press", sets: 3, reps: "8-10", weight: 50 },
      { id: "3", name: "Incline Dumbbell Press", sets: 3, reps: "10-12", weight: 30 },
      { id: "4", name: "Lateral Raises", sets: 3, reps: "12-15", weight: 12 },
      { id: "5", name: "Tricep Pushdowns", sets: 3, reps: "12-15", weight: 25 },
    ],
  },
  {
    id: "2",
    name: "Lower Body Strength",
    type: "strength",
    duration: 50,
    focus: "Quads, Hamstrings, Glutes",
    exercises: [
      { id: "1", name: "Barbell Squat", sets: 4, reps: "5", weight: 100 },
      { id: "2", name: "Romanian Deadlift", sets: 3, reps: "8-10", weight: 80 },
      { id: "3", name: "Leg Press", sets: 3, reps: "10-12", weight: 150 },
      { id: "4", name: "Walking Lunges", sets: 3, reps: "12 each", weight: 20 },
      { id: "5", name: "Calf Raises", sets: 4, reps: "15", weight: 60 },
    ],
  },
  {
    id: "3",
    name: "Zone 2 Cardio",
    type: "cardio",
    duration: 40,
    focus: "Aerobic Base",
    description: "Steady-state cardio at conversational pace",
    exercises: [
      { id: "1", name: "Treadmill Walk/Jog", sets: 1, reps: "40 min", duration: 40, exerciseType: 'cardio' },
    ],
  },
  {
    id: "4",
    name: "Pull Day",
    type: "strength",
    duration: 45,
    focus: "Back, Biceps, Rear Delts",
    exercises: [
      { id: "1", name: "Pull-ups", sets: 4, reps: "6-8", weight: 0 },
      { id: "2", name: "Barbell Rows", sets: 4, reps: "8-10", weight: 70 },
      { id: "3", name: "Seated Cable Rows", sets: 3, reps: "10-12", weight: 55 },
      { id: "4", name: "Face Pulls", sets: 3, reps: "15", weight: 20 },
      { id: "5", name: "Barbell Curls", sets: 3, reps: "10-12", weight: 30 },
    ],
  },
];

export const todayWorkout = workouts[0];

export const weeklyStats = {
  sessionsCompleted: 3,
  sessionsGoal: 5,
  volumeThisWeek: 24500, // kg
  volumeLastWeek: 22000,
  recentPR: {
    exercise: "Bench Press",
    value: "82.5 kg × 6",
    date: "2 days ago",
  },
};

export const progressData = {
  weeklyVolume: [
    { week: "W1", volume: 18500 },
    { week: "W2", volume: 20000 },
    { week: "W3", volume: 22000 },
    { week: "W4", volume: 24500 },
  ],
  recentPRs: [
    { exercise: "Bench Press", value: "82.5 kg × 6", date: "Dec 29" },
    { exercise: "Squat", value: "105 kg × 5", date: "Dec 27" },
    { exercise: "Deadlift", value: "140 kg × 3", date: "Dec 24" },
  ],
  cardioMinutes: 120,
  cardioGoal: 150,
};
