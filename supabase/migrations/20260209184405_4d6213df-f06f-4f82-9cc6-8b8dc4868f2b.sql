-- Make progress-photos bucket public so thumbnails/viewing works
UPDATE storage.buckets SET public = true WHERE id = 'progress-photos';

-- Add a public SELECT policy if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Progress photos are publicly viewable'
  ) THEN
    CREATE POLICY "Progress photos are publicly viewable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'progress-photos');
  END IF;
END $$;

-- Table for exercise goals
CREATE TABLE IF NOT EXISTS public.exercise_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  target_weight NUMERIC NOT NULL,
  target_reps INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, exercise_id)
);

ALTER TABLE public.exercise_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals" ON public.exercise_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON public.exercise_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON public.exercise_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON public.exercise_goals FOR DELETE USING (auth.uid() = user_id);