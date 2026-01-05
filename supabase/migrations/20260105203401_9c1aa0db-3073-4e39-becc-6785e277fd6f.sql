-- Create exercise type enum
CREATE TYPE public.exercise_type AS ENUM ('strength', 'cardio');

-- Create exercise source enum
CREATE TYPE public.exercise_source AS ENUM ('system', 'user');

-- Create equipment enum
CREATE TYPE public.equipment_type AS ENUM (
  'barbell', 'dumbbell', 'kettlebell', 'cable', 'machine', 
  'bodyweight', 'resistance_band', 'suspension', 'medicine_ball',
  'pull_up_bar', 'dip_bars', 'bench', 'box', 'cardio_machine', 'none'
);

-- Create muscle group enum
CREATE TYPE public.muscle_group AS ENUM (
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'quadriceps', 'hamstrings', 'glutes', 'calves', 'abs', 'obliques',
  'lower_back', 'traps', 'lats', 'hip_flexors', 'adductors', 'abductors', 'full_body'
);

-- Create cardio modality enum
CREATE TYPE public.cardio_modality AS ENUM (
  'run', 'bike', 'row', 'swim', 'elliptical', 'stair_climber', 
  'jump_rope', 'walking', 'hiking', 'other'
);

-- Main exercises table (versioned)
CREATE TABLE public.exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id uuid NOT NULL DEFAULT gen_random_uuid(), -- Stable identifier across versions
  version integer NOT NULL DEFAULT 1,
  name text NOT NULL,
  type exercise_type NOT NULL,
  source exercise_source NOT NULL DEFAULT 'user',
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for system exercises
  is_active boolean NOT NULL DEFAULT true,
  
  -- Strength-specific fields
  primary_muscle muscle_group,
  secondary_muscles muscle_group[] DEFAULT '{}',
  equipment equipment_type[] DEFAULT '{}',
  supports_weight boolean DEFAULT true,
  supports_reps boolean DEFAULT true,
  supports_rpe boolean DEFAULT true,
  supports_tempo boolean DEFAULT true,
  supports_one_rm_percent boolean DEFAULT true,
  
  -- Cardio-specific fields
  modality cardio_modality,
  supports_time boolean DEFAULT true,
  supports_distance boolean DEFAULT true,
  supports_intervals boolean DEFAULT false,
  
  -- Metadata
  instructions text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Ensure unique version per exercise_id
  UNIQUE (exercise_id, version)
);

-- Create index for fast searching
CREATE INDEX idx_exercises_name_search ON public.exercises USING gin(to_tsvector('english', name));
CREATE INDEX idx_exercises_exercise_id ON public.exercises (exercise_id);
CREATE INDEX idx_exercises_type ON public.exercises (type);
CREATE INDEX idx_exercises_source ON public.exercises (source);
CREATE INDEX idx_exercises_user_id ON public.exercises (user_id);
CREATE INDEX idx_exercises_primary_muscle ON public.exercises (primary_muscle);
CREATE INDEX idx_exercises_is_active ON public.exercises (is_active);

-- Enable RLS
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- System exercises are visible to all authenticated users
CREATE POLICY "System exercises are visible to all authenticated users"
ON public.exercises
FOR SELECT
TO authenticated
USING (source = 'system');

-- Users can view their own exercises
CREATE POLICY "Users can view own exercises"
ON public.exercises
FOR SELECT
TO authenticated
USING (source = 'user' AND user_id = auth.uid());

-- Users can insert their own exercises
CREATE POLICY "Users can insert own exercises"
ON public.exercises
FOR INSERT
TO authenticated
WITH CHECK (source = 'user' AND user_id = auth.uid());

-- Users can update their own exercises
CREATE POLICY "Users can update own exercises"
ON public.exercises
FOR UPDATE
TO authenticated
USING (source = 'user' AND user_id = auth.uid());

-- Users can delete (soft) their own exercises
CREATE POLICY "Users can delete own exercises"
ON public.exercises
FOR DELETE
TO authenticated
USING (source = 'user' AND user_id = auth.uid());

-- Add exercise version reference to set_logs
ALTER TABLE public.set_logs ADD COLUMN IF NOT EXISTS exercise_version integer;

-- Add exercise version reference to exercise_logs
ALTER TABLE public.exercise_logs ADD COLUMN IF NOT EXISTS exercise_version integer;

-- Trigger for updated_at
CREATE TRIGGER update_exercises_updated_at
BEFORE UPDATE ON public.exercises
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();