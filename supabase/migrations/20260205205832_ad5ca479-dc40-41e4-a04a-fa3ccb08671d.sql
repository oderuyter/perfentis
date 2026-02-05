-- Create offer type enum
CREATE TYPE public.offer_type AS ENUM ('code', 'affiliate', 'both');

-- Create offer scope enum
CREATE TYPE public.offer_scope AS ENUM ('global', 'gym');

-- Create offer status enum
CREATE TYPE public.offer_status AS ENUM ('active', 'archived', 'disabled');

-- Create submission status enum
CREATE TYPE public.submission_status AS ENUM ('new', 'contacted', 'approved', 'rejected');

-- Create offer event type enum
CREATE TYPE public.offer_event_type AS ENUM ('view', 'affiliate_click', 'code_copy', 'unlock_click', 'report_expired');

-- Create offer_categories table
CREATE TABLE public.offer_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create offers table
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope public.offer_scope NOT NULL DEFAULT 'global',
  gym_id UUID REFERENCES public.gyms(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  description_short TEXT,
  description_full TEXT,
  offer_type public.offer_type NOT NULL DEFAULT 'code',
  discount_code TEXT,
  affiliate_url TEXT,
  category_id UUID REFERENCES public.offer_categories(id) ON DELETE SET NULL,
  regions TEXT[] DEFAULT '{}',
  starts_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  terms_url TEXT,
  featured BOOLEAN DEFAULT false,
  status public.offer_status NOT NULL DEFAULT 'active',
  media_logo_url TEXT,
  media_cover_url TEXT,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create supplier_submissions table
CREATE TABLE public.supplier_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  category_id UUID REFERENCES public.offer_categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  proposed_code TEXT,
  proposed_affiliate_url TEXT,
  regions TEXT[] DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE,
  status public.submission_status NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  reviewed_by_user_id UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create offer_events table for analytics
CREATE TABLE public.offer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES public.offers(id) ON DELETE CASCADE NOT NULL,
  user_id UUID,
  event_type public.offer_event_type NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.offer_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_events ENABLE ROW LEVEL SECURITY;

-- Create function to check if user has active gym membership
CREATE OR REPLACE FUNCTION public.has_active_gym_membership(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id
      AND status = 'active'
      AND suspended_at IS NULL
  )
$$;

-- Create function to check if user can manage gym offers
CREATE OR REPLACE FUNCTION public.can_manage_gym_offers(_user_id UUID, _gym_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gyms WHERE id = _gym_id AND owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.gym_staff WHERE gym_id = _gym_id AND user_id = _user_id
  ) OR public.has_role(_user_id, 'admin', 'global')
$$;

-- RLS Policies for offer_categories
CREATE POLICY "Anyone can view active categories"
ON public.offer_categories FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage categories"
ON public.offer_categories FOR ALL
USING (public.has_role(auth.uid(), 'admin', 'global'));

-- RLS Policies for offers
CREATE POLICY "Anyone can view active offers"
ON public.offers FOR SELECT
USING (
  status = 'active' 
  AND (starts_at IS NULL OR starts_at <= now())
  AND (expires_at IS NULL OR expires_at > now())
);

CREATE POLICY "Admins can manage all offers"
ON public.offers FOR ALL
USING (public.has_role(auth.uid(), 'admin', 'global'));

CREATE POLICY "Gym managers can manage their gym offers"
ON public.offers FOR ALL
USING (
  scope = 'gym' 
  AND gym_id IS NOT NULL 
  AND public.can_manage_gym_offers(auth.uid(), gym_id)
);

-- RLS Policies for supplier_submissions
CREATE POLICY "Anyone can create submissions"
ON public.supplier_submissions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all submissions"
ON public.supplier_submissions FOR SELECT
USING (public.has_role(auth.uid(), 'admin', 'global'));

CREATE POLICY "Admins can manage submissions"
ON public.supplier_submissions FOR UPDATE
USING (public.has_role(auth.uid(), 'admin', 'global'));

-- RLS Policies for offer_events
CREATE POLICY "Anyone can create events"
ON public.offer_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all events"
ON public.offer_events FOR SELECT
USING (public.has_role(auth.uid(), 'admin', 'global'));

CREATE POLICY "Gym managers can view their offer events"
ON public.offer_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.offers o
    WHERE o.id = offer_id
      AND o.scope = 'gym'
      AND o.gym_id IS NOT NULL
      AND public.can_manage_gym_offers(auth.uid(), o.gym_id)
  )
);

-- Create indexes
CREATE INDEX idx_offers_category ON public.offers(category_id);
CREATE INDEX idx_offers_gym ON public.offers(gym_id);
CREATE INDEX idx_offers_status ON public.offers(status);
CREATE INDEX idx_offers_expires ON public.offers(expires_at);
CREATE INDEX idx_offer_events_offer ON public.offer_events(offer_id);
CREATE INDEX idx_offer_events_type ON public.offer_events(event_type);
CREATE INDEX idx_supplier_submissions_status ON public.supplier_submissions(status);

-- Insert default categories
INSERT INTO public.offer_categories (name, sort_order) VALUES
  ('Fitness Equipment', 1),
  ('Apparel', 2),
  ('Food & Drink', 3),
  ('Supplements', 4),
  ('Online Services', 5),
  ('Recovery & Wellness', 6),
  ('Other', 99);

-- Create trigger for updated_at
CREATE TRIGGER update_offers_updated_at
BEFORE UPDATE ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();