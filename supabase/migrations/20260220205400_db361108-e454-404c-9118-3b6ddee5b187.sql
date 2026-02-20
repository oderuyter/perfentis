ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS social_share_after_workout boolean NOT NULL DEFAULT false;