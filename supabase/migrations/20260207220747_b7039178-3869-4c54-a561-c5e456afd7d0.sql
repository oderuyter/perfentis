
-- Exercise submissions table for user/coach-submitted exercises awaiting admin approval
CREATE TABLE public.exercise_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'strength',
  primary_muscle TEXT,
  secondary_muscles TEXT[] DEFAULT '{}',
  equipment TEXT[] DEFAULT '{}',
  modality TEXT,
  instructions TEXT,
  status TEXT NOT NULL DEFAULT 'submitted', -- submitted, approved, rejected
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  approved_exercise_id TEXT, -- links to exercises.exercise_id once approved
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exercise_submissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own submissions
CREATE POLICY "Users can view own submissions"
  ON public.exercise_submissions FOR SELECT
  USING (auth.uid() = submitted_by);

-- Admins can view all submissions
CREATE POLICY "Admins can view all submissions"
  ON public.exercise_submissions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin', 'global'));

-- Users can create submissions
CREATE POLICY "Users can create submissions"
  ON public.exercise_submissions FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

-- Users can update own pending submissions
CREATE POLICY "Users can update own pending submissions"
  ON public.exercise_submissions FOR UPDATE
  USING (auth.uid() = submitted_by AND status = 'submitted');

-- Admins can update any submission (approve/reject)
CREATE POLICY "Admins can update submissions"
  ON public.exercise_submissions FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin', 'global'));

-- Admins can delete submissions
CREATE POLICY "Admins can delete submissions"
  ON public.exercise_submissions FOR DELETE
  USING (public.has_role(auth.uid(), 'admin', 'global'));

-- Trigger for updated_at
CREATE TRIGGER update_exercise_submissions_updated_at
  BEFORE UPDATE ON public.exercise_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Import logs table for tracking import attempts
CREATE TABLE public.import_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- pdf, xlsx, xls, csv
  detected_format TEXT, -- single_workout, split, coach_plan
  status TEXT NOT NULL DEFAULT 'pending', -- pending, parsing, review, completed, failed
  parse_confidence REAL, -- 0.0 to 1.0
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  -- What was created
  created_entity_type TEXT, -- workout_template, training_split, training_plan
  created_entity_id UUID,
  -- Stats
  total_exercises INTEGER DEFAULT 0,
  matched_exercises INTEGER DEFAULT 0,
  custom_exercises_created INTEGER DEFAULT 0,
  submissions_created INTEGER DEFAULT 0,
  -- Audit
  mapping_decisions JSONB DEFAULT '[]', -- array of {original, matched_id, confidence, decision: auto|manual|custom|skip}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- Users can view own import logs
CREATE POLICY "Users can view own imports"
  ON public.import_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create import logs
CREATE POLICY "Users can create imports"
  ON public.import_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update own import logs
CREATE POLICY "Users can update own imports"
  ON public.import_logs FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all import logs
CREATE POLICY "Admins can view all imports"
  ON public.import_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin', 'global'));
