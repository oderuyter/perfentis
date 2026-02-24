
-- Add bodyweight and sex to profiles for strength score computation
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bodyweight_kg numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sex text DEFAULT 'unknown' CHECK (sex IN ('male', 'female', 'unknown'));
