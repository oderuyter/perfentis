// Exercise library types — DB-driven taxonomy

export type ExerciseType = 'strength' | 'cardio';
export type ExerciseSource = 'system' | 'user';
export type ExerciseStatus = 'approved' | 'pending' | 'rejected';
export type ExerciseRecordType = 'weight_reps' | 'reps' | 'cardio' | 'reps_duration' | 'duration';

// Legacy enum types kept for backward compatibility during migration
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

// DB-driven taxonomy types
export interface MuscleGroupRecord {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export interface MuscleSubgroupRecord {
  id: string;
  muscle_group_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export interface EquipmentRecord {
  id: string;
  name: string;
  category: string | null;
  is_active: boolean;
  source: 'admin' | 'user';
  created_by_user_id: string | null;
  status: 'approved' | 'pending' | 'rejected';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  id: string;
  exercise_id: string;
  version: number;
  name: string;
  type: ExerciseType;
  source: ExerciseSource;
  user_id: string | null;
  is_active: boolean;
  record_type: ExerciseRecordType;
  status: ExerciseStatus;
  admin_notes: string | null;
  
  // New DB-driven FK references
  primary_muscle_group_id: string | null;
  primary_muscle_subgroup_id: string | null;
  
  // Legacy enum fields (kept for backward compatibility)
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
  
  // Content
  instructions: string | null;
  image_url: string | null;
  image_secondary_url: string | null;
  video_url: string | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null;
  tags: string[] | null;
  
  // Metadata
  created_at: string;
  updated_at: string;

  // Joined data (populated by hooks)
  muscle_group_name?: string;
  muscle_subgroup_name?: string;
  equipment_names?: string[];
  secondary_muscle_entries?: { muscle_group_id: string; muscle_subgroup_id?: string; group_name?: string; subgroup_name?: string }[];
}

export interface ExerciseFilters {
  search?: string;
  type?: ExerciseType | null;
  muscleGroup?: MuscleGroup | null;
  muscleGroupId?: string | null;
  equipment?: EquipmentType | null;
  equipmentId?: string | null;
  status?: ExerciseStatus | null;
  source?: ExerciseSource | null;
  recordType?: ExerciseRecordType | null;
}

export interface CreateExerciseInput {
  name: string;
  type: ExerciseType;
  record_type?: ExerciseRecordType;
  primary_muscle?: MuscleGroup | null;
  primary_muscle_group_id?: string | null;
  primary_muscle_subgroup_id?: string | null;
  secondary_muscles?: MuscleGroup[];
  secondary_muscle_entries?: { muscle_group_id: string; muscle_subgroup_id?: string }[];
  equipment?: EquipmentType[];
  equipment_ids?: string[];
  modality?: CardioModality | null;
  instructions?: string;
  image_url?: string | null;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | null;
  tags?: string[];
  video_url?: string | null;
}

export interface UpdateExerciseInput extends CreateExerciseInput {
  exercise_id: string;
  current_version: number;
}

// Equipment display names (legacy)
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

// Muscle group display names (legacy)
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

// Record type display names
export const RECORD_TYPE_LABELS: Record<ExerciseRecordType, string> = {
  weight_reps: 'Weight & Reps',
  reps: 'Reps Only',
  cardio: 'Cardio',
  reps_duration: 'Reps & Duration',
  duration: 'Duration Only',
};
