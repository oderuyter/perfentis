-- Workout Templates table (reusable workout recipes)
CREATE TABLE public.workout_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  workout_type TEXT NOT NULL DEFAULT 'strength' CHECK (workout_type IN ('strength', 'cardio', 'mixed')),
  estimated_duration_minutes INTEGER,
  equipment_needed TEXT[],
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'elite')),
  tags TEXT[],
  exercise_data JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'private' CHECK (status IN ('private', 'submitted', 'approved', 'rejected')),
  rejection_reason TEXT,
  is_curated BOOLEAN NOT NULL DEFAULT false,
  version INTEGER NOT NULL DEFAULT 1,
  parent_template_id UUID REFERENCES public.workout_templates(id) ON DELETE SET NULL,
  published_version INTEGER,
  source TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('admin', 'user')),
  view_count INTEGER NOT NULL DEFAULT 0,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Training Splits table (groups of workouts - like coach programs)
CREATE TABLE public.training_splits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  goal_tags TEXT[],
  weeks_count INTEGER,
  is_ongoing BOOLEAN NOT NULL DEFAULT false,
  workout_type TEXT NOT NULL DEFAULT 'mixed' CHECK (workout_type IN ('strength', 'cardio', 'mixed')),
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'elite')),
  days_per_week INTEGER,
  equipment_needed TEXT[],
  status TEXT NOT NULL DEFAULT 'private' CHECK (status IN ('private', 'submitted', 'approved', 'rejected')),
  rejection_reason TEXT,
  is_curated BOOLEAN NOT NULL DEFAULT false,
  version INTEGER NOT NULL DEFAULT 1,
  parent_split_id UUID REFERENCES public.training_splits(id) ON DELETE SET NULL,
  published_version INTEGER,
  source TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('admin', 'user')),
  view_count INTEGER NOT NULL DEFAULT 0,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Split Weeks table (weeks within a split)
CREATE TABLE public.split_weeks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  split_id UUID NOT NULL REFERENCES public.training_splits(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(split_id, week_number)
);

-- Split Workouts table (workouts within a week)
CREATE TABLE public.split_workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_id UUID NOT NULL REFERENCES public.split_weeks(id) ON DELETE CASCADE,
  day_label TEXT,
  day_number INTEGER,
  order_index INTEGER NOT NULL DEFAULT 0,
  workout_template_id UUID REFERENCES public.workout_templates(id) ON DELETE SET NULL,
  embedded_workout_data JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Active Split table (one active split per user)
CREATE TABLE public.user_active_split (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  split_id UUID NOT NULL REFERENCES public.training_splits(id) ON DELETE CASCADE,
  current_week INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Split Workout Completions table (tracking progress through splits)
CREATE TABLE public.split_workout_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  split_id UUID NOT NULL REFERENCES public.training_splits(id) ON DELETE CASCADE,
  week_id UUID NOT NULL REFERENCES public.split_weeks(id) ON DELETE CASCADE,
  split_workout_id UUID NOT NULL REFERENCES public.split_workouts(id) ON DELETE CASCADE,
  workout_session_id UUID REFERENCES public.workout_sessions(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, split_workout_id)
);

-- Add session_type to workout_sessions to distinguish freeform vs template vs split workouts
ALTER TABLE public.workout_sessions 
ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'freeform' CHECK (session_type IN ('freeform', 'template', 'split', 'coach_plan'));

-- Add split tracking columns to workout_sessions
ALTER TABLE public.workout_sessions 
ADD COLUMN IF NOT EXISTS split_id UUID REFERENCES public.training_splits(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS split_week_id UUID REFERENCES public.split_weeks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS split_workout_id UUID REFERENCES public.split_workouts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.workout_templates(id) ON DELETE SET NULL;

-- Enable RLS on all new tables
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_active_split ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_workout_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workout_templates
-- Users can view their own templates, approved/curated templates, and admin templates
CREATE POLICY "Users can view own templates" ON public.workout_templates
  FOR SELECT USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can view approved templates" ON public.workout_templates
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can view curated templates" ON public.workout_templates
  FOR SELECT USING (is_curated = true);

CREATE POLICY "Users can create own templates" ON public.workout_templates
  FOR INSERT WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can update own templates" ON public.workout_templates
  FOR UPDATE USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can delete own templates" ON public.workout_templates
  FOR DELETE USING (auth.uid() = owner_user_id);

-- Admins can manage all templates
CREATE POLICY "Admins can manage all templates" ON public.workout_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for training_splits
CREATE POLICY "Users can view own splits" ON public.training_splits
  FOR SELECT USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can view approved splits" ON public.training_splits
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can view curated splits" ON public.training_splits
  FOR SELECT USING (is_curated = true);

CREATE POLICY "Users can create own splits" ON public.training_splits
  FOR INSERT WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can update own splits" ON public.training_splits
  FOR UPDATE USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can delete own splits" ON public.training_splits
  FOR DELETE USING (auth.uid() = owner_user_id);

CREATE POLICY "Admins can manage all splits" ON public.training_splits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for split_weeks (inherit from split)
CREATE POLICY "Users can view split weeks for accessible splits" ON public.split_weeks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.training_splits ts
      WHERE ts.id = split_id AND (
        ts.owner_user_id = auth.uid() OR 
        ts.status = 'approved' OR 
        ts.is_curated = true OR
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
      )
    )
  );

CREATE POLICY "Users can manage weeks for own splits" ON public.split_weeks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.training_splits ts
      WHERE ts.id = split_id AND ts.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all split weeks" ON public.split_weeks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for split_workouts (inherit from week/split)
CREATE POLICY "Users can view split workouts for accessible splits" ON public.split_workouts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.split_weeks sw
      JOIN public.training_splits ts ON ts.id = sw.split_id
      WHERE sw.id = week_id AND (
        ts.owner_user_id = auth.uid() OR 
        ts.status = 'approved' OR 
        ts.is_curated = true OR
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
      )
    )
  );

CREATE POLICY "Users can manage workouts for own splits" ON public.split_workouts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.split_weeks sw
      JOIN public.training_splits ts ON ts.id = sw.split_id
      WHERE sw.id = week_id AND ts.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all split workouts" ON public.split_workouts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for user_active_split
CREATE POLICY "Users can view own active split" ON public.user_active_split
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own active split" ON public.user_active_split
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for split_workout_completions
CREATE POLICY "Users can view own completions" ON public.split_workout_completions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own completions" ON public.split_workout_completions
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_workout_templates_owner ON public.workout_templates(owner_user_id);
CREATE INDEX idx_workout_templates_status ON public.workout_templates(status);
CREATE INDEX idx_workout_templates_curated ON public.workout_templates(is_curated) WHERE is_curated = true;

CREATE INDEX idx_training_splits_owner ON public.training_splits(owner_user_id);
CREATE INDEX idx_training_splits_status ON public.training_splits(status);
CREATE INDEX idx_training_splits_curated ON public.training_splits(is_curated) WHERE is_curated = true;

CREATE INDEX idx_split_weeks_split ON public.split_weeks(split_id);
CREATE INDEX idx_split_workouts_week ON public.split_workouts(week_id);
CREATE INDEX idx_split_completions_user ON public.split_workout_completions(user_id);
CREATE INDEX idx_split_completions_split ON public.split_workout_completions(split_id);

-- Trigger for updated_at on workout_templates
CREATE TRIGGER update_workout_templates_updated_at
  BEFORE UPDATE ON public.workout_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on training_splits
CREATE TRIGGER update_training_splits_updated_at
  BEFORE UPDATE ON public.training_splits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();