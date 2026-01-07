-- Create gym_membership_levels table for gym-specific membership tiers
CREATE TABLE public.gym_membership_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2),
  billing_cycle TEXT DEFAULT 'monthly',
  access_notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(gym_id, name)
);

-- Create gym_invitations table for email invitations
CREATE TABLE public.gym_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  membership_level_id UUID REFERENCES public.gym_membership_levels(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT,
  invited_by UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add membership_level_id to memberships table
ALTER TABLE public.memberships 
ADD COLUMN membership_level_id UUID REFERENCES public.gym_membership_levels(id) ON DELETE SET NULL;

-- Add invitation_id to memberships for tracking
ALTER TABLE public.memberships 
ADD COLUMN invitation_id UUID REFERENCES public.gym_invitations(id) ON DELETE SET NULL;

-- Enable RLS on new tables
ALTER TABLE public.gym_membership_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for gym_membership_levels
-- Gym managers can manage membership levels
CREATE POLICY "Gym managers can view membership levels"
ON public.gym_membership_levels
FOR SELECT
USING (
  has_role(auth.uid(), 'gym_manager', 'gym', gym_id) OR
  has_role(auth.uid(), 'gym_staff', 'gym', gym_id) OR
  EXISTS (SELECT 1 FROM gyms WHERE id = gym_id AND owner_id = auth.uid()) OR
  has_role(auth.uid(), 'admin', 'global')
);

CREATE POLICY "Gym managers can insert membership levels"
ON public.gym_membership_levels
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'gym_manager', 'gym', gym_id) OR
  EXISTS (SELECT 1 FROM gyms WHERE id = gym_id AND owner_id = auth.uid()) OR
  has_role(auth.uid(), 'admin', 'global')
);

CREATE POLICY "Gym managers can update membership levels"
ON public.gym_membership_levels
FOR UPDATE
USING (
  has_role(auth.uid(), 'gym_manager', 'gym', gym_id) OR
  EXISTS (SELECT 1 FROM gyms WHERE id = gym_id AND owner_id = auth.uid()) OR
  has_role(auth.uid(), 'admin', 'global')
);

CREATE POLICY "Gym managers can delete membership levels"
ON public.gym_membership_levels
FOR DELETE
USING (
  has_role(auth.uid(), 'gym_manager', 'gym', gym_id) OR
  EXISTS (SELECT 1 FROM gyms WHERE id = gym_id AND owner_id = auth.uid()) OR
  has_role(auth.uid(), 'admin', 'global')
);

-- Public can view active membership levels (for signup flow)
CREATE POLICY "Anyone can view active membership levels"
ON public.gym_membership_levels
FOR SELECT
USING (is_active = true);

-- RLS policies for gym_invitations
-- Gym staff can view and create invitations for their gym
CREATE POLICY "Gym staff can view invitations"
ON public.gym_invitations
FOR SELECT
USING (
  has_role(auth.uid(), 'gym_manager', 'gym', gym_id) OR
  has_role(auth.uid(), 'gym_staff', 'gym', gym_id) OR
  EXISTS (SELECT 1 FROM gyms WHERE id = gym_id AND owner_id = auth.uid()) OR
  has_role(auth.uid(), 'admin', 'global')
);

CREATE POLICY "Gym staff can create invitations"
ON public.gym_invitations
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'gym_manager', 'gym', gym_id) OR
  has_role(auth.uid(), 'gym_staff', 'gym', gym_id) OR
  EXISTS (SELECT 1 FROM gyms WHERE id = gym_id AND owner_id = auth.uid()) OR
  has_role(auth.uid(), 'admin', 'global')
);

CREATE POLICY "Gym staff can update invitations"
ON public.gym_invitations
FOR UPDATE
USING (
  has_role(auth.uid(), 'gym_manager', 'gym', gym_id) OR
  has_role(auth.uid(), 'gym_staff', 'gym', gym_id) OR
  EXISTS (SELECT 1 FROM gyms WHERE id = gym_id AND owner_id = auth.uid()) OR
  has_role(auth.uid(), 'admin', 'global')
);

-- Public can view pending invitations by token (for acceptance flow)
CREATE POLICY "Anyone can view invitation by token"
ON public.gym_invitations
FOR SELECT
USING (status = 'pending' AND expires_at > now());

-- Create index for token lookup
CREATE INDEX idx_gym_invitations_token ON public.gym_invitations(token);
CREATE INDEX idx_gym_invitations_email ON public.gym_invitations(email);
CREATE INDEX idx_gym_invitations_status ON public.gym_invitations(status);
CREATE INDEX idx_gym_membership_levels_gym ON public.gym_membership_levels(gym_id);

-- Trigger for updated_at on gym_membership_levels
CREATE TRIGGER update_gym_membership_levels_updated_at
BEFORE UPDATE ON public.gym_membership_levels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();