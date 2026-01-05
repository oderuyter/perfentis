// Exercise library types matching the database schema

export type ExerciseType = 'strength' | 'cardio';
export type ExerciseSource = 'system' | 'user';

export type EquipmentType = 
  | 'barbell' | 'dumbbell' | 'kettlebell' | 'cable' | 'machine' 
  | 'bodyweight' | 'resistance_band' | 'suspension' | 'medicine_ball'
  | 'pull_up_bar' | 'dip_bars' | 'bench' | 'box' | 'cardio_machine' | 'none';

export type MuscleGroup = 
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'forearms'
  | 'quadriceps' | 'hamstrings' | 'glutes' | 'calves' | 'abs' | 'obliques'
  | 'lower_back' | 'traps' | 'lats' | 'hip_flexors' | 'adductors' | 'abductors' | 'full_body';

export type CardioModality = 
  | 'run' | 'bike' | 'row' | 'swim' | 'elliptical' | 'stair_climber' 
  | 'jump_rope' | 'walking' | 'hiking' | 'other';

export interface Exercise {
  id: string;
  exercise_id: string;
  version: number;
  name: string;
  type: ExerciseType;
  source: ExerciseSource;
  user_id: string | null;
  is_active: boolean;
  
  // Strength-specific
  primary_muscle: MuscleGroup | null;
  secondary_muscles: MuscleGroup[];
  equipment: EquipmentType[];
  supports_weight: boolean;
  supports_reps: boolean;
  supports_rpe: boolean;
  supports_tempo: boolean;
  supports_one_rm_percent: boolean;
  
  // Cardio-specific
  modality: CardioModality | null;
  supports_time: boolean;
  supports_distance: boolean;
  supports_intervals: boolean;
  
  // Metadata
  instructions: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExerciseFilters {
  search?: string;
  type?: ExerciseType | null;
  muscleGroup?: MuscleGroup | null;
  equipment?: EquipmentType | null;
}

export interface CreateExerciseInput {
  name: string;
  type: ExerciseType;
  primary_muscle?: MuscleGroup | null;
  secondary_muscles?: MuscleGroup[];
  equipment?: EquipmentType[];
  modality?: CardioModality | null;
  instructions?: string;
}

export interface UpdateExerciseInput extends CreateExerciseInput {
  exercise_id: string;
  current_version: number;
}

// Equipment display names
export const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  kettlebell: 'Kettlebell',
  cable: 'Cable',
  machine: 'Machine',
  bodyweight: 'Bodyweight',
  resistance_band: 'Resistance Band',
  suspension: 'Suspension',
  medicine_ball: 'Medicine Ball',
  pull_up_bar: 'Pull-up Bar',
  dip_bars: 'Dip Bars',
  bench: 'Bench',
  box: 'Box',
  cardio_machine: 'Cardio Machine',
  none: 'None',
};

// Muscle group display names
export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  quadriceps: 'Quadriceps',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  abs: 'Abs',
  obliques: 'Obliques',
  lower_back: 'Lower Back',
  traps: 'Traps',
  lats: 'Lats',
  hip_flexors: 'Hip Flexors',
  adductors: 'Adductors',
  abductors: 'Abductors',
  full_body: 'Full Body',
};

// Cardio modality display names
export const MODALITY_LABELS: Record<CardioModality, string> = {
  run: 'Running',
  bike: 'Cycling',
  row: 'Rowing',
  swim: 'Swimming',
  elliptical: 'Elliptical',
  stair_climber: 'Stair Climber',
  jump_rope: 'Jump Rope',
  walking: 'Walking',
  hiking: 'Hiking',
  other: 'Other',
};
