// Workout Templates and Training Splits types

export type WorkoutTemplateStatus = 'private' | 'submitted' | 'approved' | 'rejected';
export type WorkoutType = 'strength' | 'cardio' | 'mixed';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite';
export type TemplateSource = 'admin' | 'user';

export interface WorkoutTemplateExercise {
  exercise_id: string;
  name: string;
  sets: number;
  reps: number;
  reps_min?: number;
  reps_max?: number;
  sets_min?: number;
  sets_max?: number;
  load_guidance?: string;
  rest_seconds?: number;
  notes?: string;
  order_index: number;
  exercise_type?: 'strength' | 'cardio';
}

export interface WorkoutTemplate {
  id: string;
  owner_user_id: string | null;
  title: string;
  description: string | null;
  workout_type: WorkoutType;
  estimated_duration_minutes: number | null;
  equipment_needed: string[] | null;
  difficulty_level: DifficultyLevel | null;
  tags: string[] | null;
  exercise_data: WorkoutTemplateExercise[];
  status: WorkoutTemplateStatus;
  rejection_reason: string | null;
  is_curated: boolean;
  version: number;
  parent_template_id: string | null;
  published_version: number | null;
  source: TemplateSource;
  view_count: number;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export interface TrainingSplit {
  id: string;
  owner_user_id: string | null;
  title: string;
  description: string | null;
  goal_tags: string[] | null;
  weeks_count: number | null;
  is_ongoing: boolean;
  workout_type: WorkoutType;
  difficulty_level: DifficultyLevel | null;
  days_per_week: number | null;
  equipment_needed: string[] | null;
  status: WorkoutTemplateStatus;
  rejection_reason: string | null;
  is_curated: boolean;
  version: number;
  parent_split_id: string | null;
  published_version: number | null;
  source: TemplateSource;
  view_count: number;
  use_count: number;
  created_at: string;
  updated_at: string;
  split_weeks?: SplitWeek[];
}

export interface SplitWeek {
  id: string;
  split_id: string;
  week_number: number;
  name: string | null;
  notes: string | null;
  created_at: string;
  split_workouts?: SplitWorkout[];
}

export interface SplitWorkout {
  id: string;
  week_id: string;
  day_label: string | null;
  day_number: number | null;
  order_index: number;
  workout_template_id: string | null;
  embedded_workout_data: WorkoutTemplateExercise[] | null;
  notes: string | null;
  created_at: string;
  workout_template?: WorkoutTemplate;
}

export interface UserActiveSplit {
  id: string;
  user_id: string;
  split_id: string;
  current_week: number;
  started_at: string;
  activated_at: string;
  training_split?: TrainingSplit;
}

export interface SplitWorkoutCompletion {
  id: string;
  user_id: string;
  split_id: string;
  week_id: string;
  split_workout_id: string;
  workout_session_id: string | null;
  completed_at: string;
}

// Filter types for directory browsing
export type LibraryTab = 'curated' | 'community' | 'my-library';

export interface WorkoutFilters {
  search?: string;
  type?: WorkoutType | null;
  difficulty?: DifficultyLevel | null;
  equipment?: string | null;
  duration?: 'short' | 'medium' | 'long' | null; // <30, 30-60, 60+
  sort?: 'popular' | 'newest' | 'recommended' | 'recent';
}

export interface SplitFilters {
  search?: string;
  type?: WorkoutType | null;
  difficulty?: DifficultyLevel | null;
  weeks?: number | null;
  daysPerWeek?: number | null;
  sort?: 'popular' | 'newest' | 'recommended' | 'recent';
}

// Constants
export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  elite: 'Elite',
};

export const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  strength: 'Strength',
  cardio: 'Cardio',
  mixed: 'Mixed',
};

export const STATUS_LABELS: Record<WorkoutTemplateStatus, string> = {
  private: 'Private',
  submitted: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
};
