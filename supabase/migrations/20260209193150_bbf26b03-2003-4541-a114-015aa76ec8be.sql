
-- Add category column to progress_photos
ALTER TABLE public.progress_photos ADD COLUMN IF NOT EXISTS category text DEFAULT null;

-- Table for user's custom photo category labels
CREATE TABLE IF NOT EXISTS public.progress_photo_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, label)
);

ALTER TABLE public.progress_photo_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories" ON public.progress_photo_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON public.progress_photo_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON public.progress_photo_categories FOR DELETE USING (auth.uid() = user_id);
