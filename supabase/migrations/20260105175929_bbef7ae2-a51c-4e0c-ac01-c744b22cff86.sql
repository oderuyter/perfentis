-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  resting_hr INTEGER DEFAULT 60,
  max_hr INTEGER DEFAULT 190,
  theme_mode TEXT DEFAULT 'system',
  accent_color TEXT DEFAULT 'sage',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workout_sessions table for workout history
CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_template_id TEXT,
  workout_name TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  total_volume NUMERIC,
  avg_hr INTEGER,
  max_hr INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exercise_logs table for individual exercise data within sessions
CREATE TABLE public.exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  exercise_order INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create set_logs table for individual set data
CREATE TABLE public.set_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_log_id UUID NOT NULL REFERENCES public.exercise_logs(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  target_weight NUMERIC,
  target_reps INTEGER,
  completed_weight NUMERIC,
  completed_reps INTEGER,
  rest_duration INTEGER,
  rpe NUMERIC,
  tempo TEXT,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create personal_records table for PRs
CREATE TABLE public.personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  record_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  weight NUMERIC,
  reps INTEGER,
  achieved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_id UUID REFERENCES public.workout_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Workout sessions policies
CREATE POLICY "Users can view own sessions" ON public.workout_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.workout_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.workout_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON public.workout_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Exercise logs policies (via session ownership)
CREATE POLICY "Users can view own exercise logs" ON public.exercise_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.workout_sessions WHERE id = exercise_logs.session_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert own exercise logs" ON public.exercise_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workout_sessions WHERE id = exercise_logs.session_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update own exercise logs" ON public.exercise_logs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.workout_sessions WHERE id = exercise_logs.session_id AND user_id = auth.uid())
  );

-- Set logs policies (via session ownership)
CREATE POLICY "Users can view own set logs" ON public.set_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.exercise_logs el
      JOIN public.workout_sessions ws ON el.session_id = ws.id
      WHERE el.id = set_logs.exercise_log_id AND ws.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own set logs" ON public.set_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exercise_logs el
      JOIN public.workout_sessions ws ON el.session_id = ws.id
      WHERE el.id = set_logs.exercise_log_id AND ws.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own set logs" ON public.set_logs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.exercise_logs el
      JOIN public.workout_sessions ws ON el.session_id = ws.id
      WHERE el.id = set_logs.exercise_log_id AND ws.user_id = auth.uid()
    )
  );

-- Personal records policies
CREATE POLICY "Users can view own PRs" ON public.personal_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own PRs" ON public.personal_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own PRs" ON public.personal_records
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own PRs" ON public.personal_records
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();