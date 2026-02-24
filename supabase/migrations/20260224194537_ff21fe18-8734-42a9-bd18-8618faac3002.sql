
-- ============================================================
-- 1) MUSCLE TAXONOMY TABLES
-- ============================================================

CREATE TABLE public.muscle_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.muscle_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Muscle groups are readable by everyone" ON public.muscle_groups FOR SELECT USING (true);
CREATE POLICY "Only admins can manage muscle groups" ON public.muscle_groups FOR ALL USING (public.has_role(auth.uid(), 'admin', 'global'));

CREATE TABLE public.muscle_subgroups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  muscle_group_id UUID NOT NULL REFERENCES public.muscle_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (muscle_group_id, name)
);

ALTER TABLE public.muscle_subgroups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Muscle subgroups are readable by everyone" ON public.muscle_subgroups FOR SELECT USING (true);
CREATE POLICY "Only admins can manage muscle subgroups" ON public.muscle_subgroups FOR ALL USING (public.has_role(auth.uid(), 'admin', 'global'));

-- Seed muscle groups
INSERT INTO public.muscle_groups (name, sort_order) VALUES
  ('Chest', 1),
  ('Back', 2),
  ('Shoulders', 3),
  ('Biceps', 4),
  ('Triceps', 5),
  ('Forearms', 6),
  ('Abs', 7),
  ('Upper Legs', 8),
  ('Lower Legs', 9),
  ('Glutes', 10),
  ('Full Body', 11);

-- Seed muscle subgroups
INSERT INTO public.muscle_subgroups (muscle_group_id, name, sort_order) VALUES
  -- Chest
  ((SELECT id FROM public.muscle_groups WHERE name = 'Chest'), 'Upper Chest', 1),
  ((SELECT id FROM public.muscle_groups WHERE name = 'Chest'), 'Mid Chest', 2),
  ((SELECT id FROM public.muscle_groups WHERE name = 'Chest'), 'Lower Chest', 3),
  -- Back
  ((SELECT id FROM public.muscle_groups WHERE name = 'Back'), 'Lats', 1),
  ((SELECT id FROM public.muscle_groups WHERE name = 'Back'), 'Upper Back', 2),
  ((SELECT id FROM public.muscle_groups WHERE name = 'Back'), 'Traps', 3),
  ((SELECT id FROM public.muscle_groups WHERE name = 'Back'), 'Lower Back', 4),
  ((SELECT id FROM public.muscle_groups WHERE name = 'Back'), 'Rhomboids', 5),
  -- Shoulders
  ((SELECT id FROM public.muscle_groups WHERE name = 'Shoulders'), 'Front Delts', 1),
  ((SELECT id FROM public.muscle_groups WHERE name = 'Shoulders'), 'Side Delts', 2),
  ((SELECT id FROM public.muscle_groups WHERE name = 'Shoulders'), 'Rear Delts', 3),
  ((SELECT id FROM public.muscle_groups WHERE name = 'Shoulders'), 'Rotator Cuff', 4),
  -- Biceps
  ((SELECT id FROM public.muscle_groups WHERE name = 'Biceps'), 'Long Head', 1),
  ((SELECT id FROM public.muscle_groups WHERE name = 'Biceps'), 'Short Head', 2),
  ((SELECT id FROM public.muscle_groups WHERE name = 'Biceps'), 'Brachialis', 3),
  -- Triceps
  ((SELECT id FROM public.muscle_groups WHERE name = 'Triceps'), 'Long Head', 1),
  ((SELECT id FROM public.muscle_groups WHERE name = 'Triceps'), 'Lateral Head', 2),
  ((SELECT id FROM public.muscle_groups WHERE name = 'Triceps'), 'Medial Head', 3),
  -- Forearms
  ((SELECT id FROM public.muscle_groups WHERE name = 'Forearms'), 'Wrist Flexors', 1),
  ((SELECT id FROM public.muscle_groups WHERE name = 'Forearms'), 'Wrist Extensors', 2),
  ((SELECT id FROM public.muscle_groups WHERE name = 'Forearms'), 'Brachioradialis', 3),
  -- Abs
  ((SELECT id FROM public.muscle_groups WHERE name = 'Abs'), 'Upper Abs', 1),
  ((SELECT id FROM public.muscle_groups WHERE name = 'Abs'), 'Lower Abs', 2),
  ((SELECT id FROM public.muscle_groups WHERE name = 'Abs'), 'Obliques', 3),
  ((SELECT id FROM public.muscle_groups WHERE name = 'Abs'), 'Transverse Abdominis', 4),
  -- Upper Legs
  ((SELECT id FROM public.muscle_groups WHERE name = 'Upper Legs'), 'Quadriceps', 1),
  ((SELECT id FROM public.muscle_groups WHERE name = 'Upper Legs'), 'Hamstrings', 2),
  ((SELECT id FROM public.muscle_groups WHERE name = 'Upper Legs'), 'Adductors', 3),
  ((SELECT id FROM public.muscle_groups WHERE name = 'Upper Legs'), 'Abductors', 4),
  ((SELECT id FROM public.muscle_groups WHERE name = 'Upper Legs'), 'Hip Flexors', 5),
  -- Lower Legs
  ((SELECT id FROM public.muscle_groups WHERE name = 'Lower Legs'), 'Calves', 1),
  ((SELECT id FROM public.muscle_groups WHERE name = 'Lower Legs'), 'Tibialis Anterior', 2),
  -- Glutes
  ((SELECT id FROM public.muscle_groups WHERE name = 'Glutes'), 'Gluteus Maximus', 1),
  ((SELECT id FROM public.muscle_groups WHERE name = 'Glutes'), 'Gluteus Medius', 2),
  ((SELECT id FROM public.muscle_groups WHERE name = 'Glutes'), 'Gluteus Minimus', 3),
  -- Full Body
  ((SELECT id FROM public.muscle_groups WHERE name = 'Full Body'), 'Full Body', 1);


-- ============================================================
-- 2) EQUIPMENT DATABASE
-- ============================================================

CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'user')),
  created_by_user_id UUID,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- Everyone can see approved equipment + their own
CREATE POLICY "Equipment visible: approved or own" ON public.equipment FOR SELECT
  USING (status = 'approved' OR created_by_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin', 'global'));

-- Users can create equipment
CREATE POLICY "Users can create equipment" ON public.equipment FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own pending/rejected equipment; admins can update any
CREATE POLICY "Users update own; admins update any" ON public.equipment FOR UPDATE
  USING (created_by_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin', 'global'));

-- Only admins can delete equipment
CREATE POLICY "Only admins delete equipment" ON public.equipment FOR DELETE
  USING (public.has_role(auth.uid(), 'admin', 'global'));

-- Seed core equipment
INSERT INTO public.equipment (name, category, source, status) VALUES
  ('No Equipment', 'Bodyweight', 'admin', 'approved'),
  ('Barbell', 'Free Weights', 'admin', 'approved'),
  ('Dumbbell', 'Free Weights', 'admin', 'approved'),
  ('Kettlebell', 'Free Weights', 'admin', 'approved'),
  ('Cable Machine', 'Machines', 'admin', 'approved'),
  ('Smith Machine', 'Machines', 'admin', 'approved'),
  ('Machine', 'Machines', 'admin', 'approved'),
  ('Resistance Band', 'Accessories', 'admin', 'approved'),
  ('Pull-up Bar', 'Accessories', 'admin', 'approved'),
  ('Dip Bars', 'Accessories', 'admin', 'approved'),
  ('Bench', 'Free Weights', 'admin', 'approved'),
  ('Box', 'Accessories', 'admin', 'approved'),
  ('Medicine Ball', 'Accessories', 'admin', 'approved'),
  ('Suspension Trainer', 'Accessories', 'admin', 'approved'),
  ('Treadmill', 'Cardio', 'admin', 'approved'),
  ('Rowing Machine', 'Cardio', 'admin', 'approved'),
  ('Stationary Bike', 'Cardio', 'admin', 'approved'),
  ('Elliptical', 'Cardio', 'admin', 'approved'),
  ('Stair Climber', 'Cardio', 'admin', 'approved'),
  ('Jump Rope', 'Cardio', 'admin', 'approved'),
  ('EZ Curl Bar', 'Free Weights', 'admin', 'approved'),
  ('Trap Bar', 'Free Weights', 'admin', 'approved'),
  ('Battle Ropes', 'Accessories', 'admin', 'approved'),
  ('Foam Roller', 'Accessories', 'admin', 'approved'),
  ('Ab Wheel', 'Accessories', 'admin', 'approved');


-- ============================================================
-- 3) EXERCISE TABLE UPGRADES
-- ============================================================

-- Add new record_type enum
DO $$ BEGIN
  CREATE TYPE public.exercise_record_type AS ENUM ('weight_reps', 'reps', 'cardio', 'reps_duration', 'duration');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add new status enum for exercises
DO $$ BEGIN
  CREATE TYPE public.exercise_status AS ENUM ('approved', 'pending', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add new columns to exercises
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS record_type public.exercise_record_type NOT NULL DEFAULT 'weight_reps',
  ADD COLUMN IF NOT EXISTS status public.exercise_status NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS primary_muscle_group_id UUID REFERENCES public.muscle_groups(id),
  ADD COLUMN IF NOT EXISTS primary_muscle_subgroup_id UUID REFERENCES public.muscle_subgroups(id),
  ADD COLUMN IF NOT EXISTS image_secondary_url TEXT,
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Migrate existing enum muscle data to new FK references
UPDATE public.exercises e SET primary_muscle_group_id = mg.id
FROM public.muscle_groups mg
WHERE e.primary_muscle IS NOT NULL
  AND e.primary_muscle_group_id IS NULL
  AND (
    (e.primary_muscle::text = 'chest' AND mg.name = 'Chest')
    OR (e.primary_muscle::text = 'back' AND mg.name = 'Back')
    OR (e.primary_muscle::text = 'shoulders' AND mg.name = 'Shoulders')
    OR (e.primary_muscle::text = 'biceps' AND mg.name = 'Biceps')
    OR (e.primary_muscle::text = 'triceps' AND mg.name = 'Triceps')
    OR (e.primary_muscle::text = 'forearms' AND mg.name = 'Forearms')
    OR (e.primary_muscle::text IN ('abs', 'obliques') AND mg.name = 'Abs')
    OR (e.primary_muscle::text IN ('quadriceps', 'hamstrings', 'hip_flexors', 'adductors', 'abductors') AND mg.name = 'Upper Legs')
    OR (e.primary_muscle::text = 'calves' AND mg.name = 'Lower Legs')
    OR (e.primary_muscle::text = 'glutes' AND mg.name = 'Glutes')
    OR (e.primary_muscle::text IN ('lats', 'traps', 'lower_back') AND mg.name = 'Back')
    OR (e.primary_muscle::text = 'full_body' AND mg.name = 'Full Body')
  );

-- Migrate record_type based on existing supports_* flags
UPDATE public.exercises SET record_type = 'weight_reps' WHERE type = 'strength' AND supports_weight = true AND supports_reps = true;
UPDATE public.exercises SET record_type = 'reps' WHERE type = 'strength' AND (supports_weight IS NULL OR supports_weight = false) AND supports_reps = true;
UPDATE public.exercises SET record_type = 'duration' WHERE type = 'strength' AND supports_reps = false AND supports_time = true;
UPDATE public.exercises SET record_type = 'cardio' WHERE type = 'cardio';

-- Set status based on existing source
UPDATE public.exercises SET status = 'approved' WHERE source = 'system';
UPDATE public.exercises SET status = 'pending' WHERE source = 'user' AND status = 'approved';


-- ============================================================
-- 4) JOIN TABLES
-- ============================================================

CREATE TABLE public.exercise_secondary_muscles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  muscle_group_id UUID NOT NULL REFERENCES public.muscle_groups(id),
  muscle_subgroup_id UUID REFERENCES public.muscle_subgroups(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exercise_id, muscle_group_id, muscle_subgroup_id)
);

ALTER TABLE public.exercise_secondary_muscles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Exercise secondary muscles readable by everyone" ON public.exercise_secondary_muscles FOR SELECT USING (true);
CREATE POLICY "Users can manage secondary muscles for own exercises" ON public.exercise_secondary_muscles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.exercises WHERE id = exercise_id AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin', 'global')))
  );

CREATE TABLE public.exercise_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exercise_id, equipment_id)
);

ALTER TABLE public.exercise_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Exercise equipment readable by everyone" ON public.exercise_equipment FOR SELECT USING (true);
CREATE POLICY "Users can manage equipment for own exercises" ON public.exercise_equipment FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.exercises WHERE id = exercise_id AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin', 'global')))
  );

-- Migrate existing equipment enum array to equipment join table
INSERT INTO public.exercise_equipment (exercise_id, equipment_id)
SELECT e.id, eq.id
FROM public.exercises e
CROSS JOIN LATERAL unnest(e.equipment) AS eq_name
JOIN public.equipment eq ON (
  (eq_name::text = 'barbell' AND eq.name = 'Barbell')
  OR (eq_name::text = 'dumbbell' AND eq.name = 'Dumbbell')
  OR (eq_name::text = 'kettlebell' AND eq.name = 'Kettlebell')
  OR (eq_name::text = 'cable' AND eq.name = 'Cable Machine')
  OR (eq_name::text = 'machine' AND eq.name = 'Machine')
  OR (eq_name::text = 'bodyweight' AND eq.name = 'No Equipment')
  OR (eq_name::text = 'resistance_band' AND eq.name = 'Resistance Band')
  OR (eq_name::text = 'suspension' AND eq.name = 'Suspension Trainer')
  OR (eq_name::text = 'medicine_ball' AND eq.name = 'Medicine Ball')
  OR (eq_name::text = 'pull_up_bar' AND eq.name = 'Pull-up Bar')
  OR (eq_name::text = 'dip_bars' AND eq.name = 'Dip Bars')
  OR (eq_name::text = 'bench' AND eq.name = 'Bench')
  OR (eq_name::text = 'box' AND eq.name = 'Box')
  OR (eq_name::text = 'cardio_machine' AND eq.name = 'Treadmill')
  OR (eq_name::text = 'none' AND eq.name = 'No Equipment')
)
WHERE e.equipment IS NOT NULL AND array_length(e.equipment, 1) > 0
ON CONFLICT DO NOTHING;

-- Migrate secondary muscles enum array to join table
INSERT INTO public.exercise_secondary_muscles (exercise_id, muscle_group_id)
SELECT e.id, mg.id
FROM public.exercises e
CROSS JOIN LATERAL unnest(e.secondary_muscles) AS sm_name
JOIN public.muscle_groups mg ON (
  (sm_name::text = 'chest' AND mg.name = 'Chest')
  OR (sm_name::text = 'back' AND mg.name = 'Back')
  OR (sm_name::text = 'shoulders' AND mg.name = 'Shoulders')
  OR (sm_name::text = 'biceps' AND mg.name = 'Biceps')
  OR (sm_name::text = 'triceps' AND mg.name = 'Triceps')
  OR (sm_name::text = 'forearms' AND mg.name = 'Forearms')
  OR (sm_name::text IN ('abs', 'obliques') AND mg.name = 'Abs')
  OR (sm_name::text IN ('quadriceps', 'hamstrings', 'hip_flexors', 'adductors', 'abductors') AND mg.name = 'Upper Legs')
  OR (sm_name::text = 'calves' AND mg.name = 'Lower Legs')
  OR (sm_name::text = 'glutes' AND mg.name = 'Glutes')
  OR (sm_name::text IN ('lats', 'traps', 'lower_back') AND mg.name = 'Back')
  OR (sm_name::text = 'full_body' AND mg.name = 'Full Body')
)
WHERE e.secondary_muscles IS NOT NULL AND array_length(e.secondary_muscles, 1) > 0
ON CONFLICT DO NOTHING;


-- ============================================================
-- 5) INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_exercises_name_trgm ON public.exercises USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_exercises_modality_status ON public.exercises (type, status, source);
CREATE INDEX IF NOT EXISTS idx_exercises_primary_muscle_group ON public.exercises (primary_muscle_group_id);
CREATE INDEX IF NOT EXISTS idx_exercises_record_type ON public.exercises (record_type);
CREATE INDEX IF NOT EXISTS idx_exercise_secondary_muscles_exercise ON public.exercise_secondary_muscles (exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_equipment_exercise ON public.exercise_equipment (exercise_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON public.equipment (status, source);
CREATE INDEX IF NOT EXISTS idx_muscle_subgroups_group ON public.muscle_subgroups (muscle_group_id);

-- Trigger for equipment updated_at
CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
