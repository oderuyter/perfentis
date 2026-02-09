
-- Add is_enrolled flag to gyms table
ALTER TABLE public.gyms ADD COLUMN IF NOT EXISTS is_enrolled boolean NOT NULL DEFAULT true;

-- Create external_gym_membership_cards table
CREATE TABLE public.external_gym_membership_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_name TEXT NOT NULL,
  membership_number TEXT NOT NULL,
  gym_directory_id UUID REFERENCES public.gyms(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'scanned')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create external_gym_submissions table
CREATE TABLE public.external_gym_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submitted_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  website TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_reason TEXT,
  gym_directory_id UUID REFERENCES public.gyms(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_gym_membership_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_gym_submissions ENABLE ROW LEVEL SECURITY;

-- RLS for external_gym_membership_cards: users can only see/manage their own
CREATE POLICY "Users can view their own external cards"
  ON public.external_gym_membership_cards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own external cards"
  ON public.external_gym_membership_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own external cards"
  ON public.external_gym_membership_cards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own external cards"
  ON public.external_gym_membership_cards FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all external cards
CREATE POLICY "Admins can view all external cards"
  ON public.external_gym_membership_cards FOR SELECT
  USING (public.has_role(auth.uid(), 'admin', 'global'));

-- RLS for external_gym_submissions: users can see their own; admins can see all
CREATE POLICY "Users can view their own submissions"
  ON public.external_gym_submissions FOR SELECT
  USING (auth.uid() = submitted_by_user_id);

CREATE POLICY "Users can create submissions"
  ON public.external_gym_submissions FOR INSERT
  WITH CHECK (auth.uid() = submitted_by_user_id);

CREATE POLICY "Admins can view all submissions"
  ON public.external_gym_submissions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin', 'global'));

CREATE POLICY "Admins can update submissions"
  ON public.external_gym_submissions FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin', 'global'));

CREATE POLICY "Admins can delete submissions"
  ON public.external_gym_submissions FOR DELETE
  USING (public.has_role(auth.uid(), 'admin', 'global'));

-- Trigger to update updated_at
CREATE TRIGGER update_external_cards_updated_at
  BEFORE UPDATE ON public.external_gym_membership_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_external_submissions_updated_at
  BEFORE UPDATE ON public.external_gym_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for enforcing max 3 cards per user (used in app logic)
CREATE INDEX idx_external_cards_user_id ON public.external_gym_membership_cards(user_id);
CREATE INDEX idx_external_submissions_status ON public.external_gym_submissions(status);
CREATE INDEX idx_external_submissions_gym_name ON public.external_gym_submissions(gym_name);
