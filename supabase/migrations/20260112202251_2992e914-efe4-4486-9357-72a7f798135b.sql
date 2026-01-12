-- Create gym_spaces table
CREATE TABLE public.gym_spaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gym_spaces ENABLE ROW LEVEL SECURITY;

-- Policies for gym_spaces
CREATE POLICY "Anyone can view active gym spaces"
  ON public.gym_spaces FOR SELECT
  USING (is_active = true);

CREATE POLICY "Gym staff can manage spaces"
  ON public.gym_spaces FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gym_staff gs
      WHERE gs.gym_id = gym_spaces.gym_id
      AND gs.user_id = auth.uid()
      AND gs.is_active = true
    )
  );

-- Add space_id to class_schedules
ALTER TABLE public.class_schedules 
ADD COLUMN space_id UUID REFERENCES public.gym_spaces(id) ON DELETE SET NULL;

-- Create class_waitlist table
CREATE TABLE public.class_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.class_schedules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notified_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(schedule_id, user_id, booking_date)
);

-- Enable RLS
ALTER TABLE public.class_waitlist ENABLE ROW LEVEL SECURITY;

-- Policies for class_waitlist
CREATE POLICY "Users can view their own waitlist entries"
  ON public.class_waitlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Gym staff can view all waitlist entries"
  ON public.class_waitlist FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.class_schedules cs
      JOIN public.gym_classes gc ON gc.id = cs.class_id
      JOIN public.gym_staff gs ON gs.gym_id = gc.gym_id
      WHERE cs.id = class_waitlist.schedule_id
      AND gs.user_id = auth.uid()
      AND gs.is_active = true
    )
  );

CREATE POLICY "Users can add themselves to waitlist"
  ON public.class_waitlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove themselves from waitlist"
  ON public.class_waitlist FOR DELETE
  USING (auth.uid() = user_id);

-- Add email/phone to gym_staff for non-user staff
ALTER TABLE public.gym_staff 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS name TEXT;

-- Create storage bucket for gym logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('gym-logos', 'gym-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for gym-logos
CREATE POLICY "Gym logos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gym-logos');

CREATE POLICY "Gym staff can upload logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'gym-logos' 
    AND EXISTS (
      SELECT 1 FROM public.gym_staff gs
      WHERE gs.gym_id::text = (storage.foldername(name))[1]
      AND gs.user_id = auth.uid()
      AND gs.is_active = true
    )
  );

CREATE POLICY "Gym staff can update logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'gym-logos' 
    AND EXISTS (
      SELECT 1 FROM public.gym_staff gs
      WHERE gs.gym_id::text = (storage.foldername(name))[1]
      AND gs.user_id = auth.uid()
      AND gs.is_active = true
    )
  );

CREATE POLICY "Gym staff can delete logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'gym-logos' 
    AND EXISTS (
      SELECT 1 FROM public.gym_staff gs
      WHERE gs.gym_id::text = (storage.foldername(name))[1]
      AND gs.user_id = auth.uid()
      AND gs.is_active = true
    )
  );