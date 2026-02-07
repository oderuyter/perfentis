// Import system types

export type ImportFormat = 'single_workout' | 'split' | 'coach_plan';
export type ImportFileType = 'pdf' | 'xlsx' | 'xls' | 'csv';
export type ImportStep = 'upload' | 'detect' | 'review' | 'matching' | 'validation' | 'confirm';

export interface ParsedExercise {
  original_text: string;
  name: string;
  sets?: number | string;
  reps?: number | string;
  load?: string;
  rest_seconds?: number;
  notes?: string;
  superset_group?: string;
  order?: number;
  category?: 'strength' | 'cardio';
  equipment?: string;
}

export interface ParsedWorkout {
  name: string;
  day_label?: string;
  exercises: ParsedExercise[];
}

export interface ParsedWeek {
  week_number: number;
  name?: string;
  workouts: ParsedWorkout[];
}

export interface ParsedImport {
  detected_format: ImportFormat;
  confidence: number;
  plan_name?: string;
  weeks: ParsedWeek[];
}

export type MatchDecision = 'auto' | 'manual' | 'custom' | 'submit' | 'skip' | 'pending';

export interface ExerciseMatch {
  original_text: string;
  parsed_exercise: ParsedExercise;
  matched_exercise_id?: string;
  matched_exercise_name?: string;
  confidence: number; // 0-1
  decision: MatchDecision;
  custom_exercise_name?: string;
  custom_exercise_type?: 'strength' | 'cardio';
  custom_exercise_muscle?: string;
  custom_exercise_equipment?: string[];
}

export interface ImportValidationError {
  id: string;
  type: 'missing_sets' | 'missing_reps' | 'invalid_format' | 'no_workout_name' | 'unknown_structure' | 'invalid_number';
  message: string;
  location: {
    week?: number;
    workout?: string;
    exercise?: string;
    field?: string;
  };
  fixable: boolean;
  fixed?: boolean;
  fix_value?: string | number;
  skipped?: boolean;
}

export interface ImportMetadata {
  name_override?: string;
  goal_tags?: string[];
  owner_scope?: 'private' | 'community' | 'template' | 'plan';
}

export interface ImportState {
  step: ImportStep;
  file: File | null;
  fileType: ImportFileType | null;
  parsedData: ParsedImport | null;
  exerciseMatches: ExerciseMatch[];
  validationErrors: ImportValidationError[];
  metadata: ImportMetadata;
  isCoachContext: boolean;
  coachId?: string;
  importLogId?: string;
}

export const IMPORT_FORMAT_LABELS: Record<ImportFormat, string> = {
  single_workout: 'Single Workout',
  split: 'Training Split',
  coach_plan: 'Coach Training Plan',
};

export const IMPORT_STEPS: ImportStep[] = ['upload', 'detect', 'review', 'matching', 'validation', 'confirm'];

export const STEP_LABELS: Record<ImportStep, string> = {
  upload: 'Upload',
  detect: 'Detect',
  review: 'Review',
  matching: 'Match Exercises',
  validation: 'Validate',
  confirm: 'Confirm',
};
