-- First, update the gyms table to support pending/approval workflow
ALTER TABLE public.gyms 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS submission_reason TEXT,
ADD COLUMN IF NOT EXISTS is_owner_submission BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reviewed_by UUID,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create registration_requests table for general registrations (coaches, events, etc.)
CREATE TABLE IF NOT EXISTS public.registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type TEXT NOT NULL CHECK (request_type IN ('gym', 'coach', 'event')),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Common fields
  name TEXT NOT NULL,
  description TEXT,
  reason TEXT,
  
  -- Gym-specific fields
  gym_address TEXT,
  gym_address_line1 TEXT,
  gym_address_line2 TEXT,
  gym_address_city TEXT,
  gym_address_postcode TEXT,
  gym_address_country TEXT,
  gym_phone TEXT,
  gym_email TEXT,
  gym_website TEXT,
  is_owner_or_manager BOOLEAN DEFAULT false,
  
  -- Coach-specific fields
  coach_bio TEXT,
  coach_specialties TEXT[],
  coach_hourly_rate NUMERIC,
  coach_location TEXT,
  coach_delivery_type TEXT,
  coach_certifications TEXT[],
  
  -- Event-specific fields
  event_date TIMESTAMP WITH TIME ZONE,
  event_start_date TIMESTAMP WITH TIME ZONE,
  event_end_date TIMESTAMP WITH TIME ZONE,
  event_location TEXT,
  event_type TEXT,
  event_mode TEXT,
  
  -- Reference to created entity after approval
  created_entity_id UUID,
  
  -- Review fields
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;

-- Policies for registration_requests
-- Users can view their own requests
CREATE POLICY "Users can view their own registration requests"
ON public.registration_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "Users can create registration requests"
ON public.registration_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all registration requests"
ON public.registration_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin', 'global'));

-- Admins can update requests (for approval/rejection)
CREATE POLICY "Admins can update registration requests"
ON public.registration_requests
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin', 'global'));

-- Update the gyms INSERT policy to also allow:
-- 1. Admins to create gyms
-- 2. Users to create gyms with pending approval status
DROP POLICY IF EXISTS "Authenticated users can create gyms" ON public.gyms;

CREATE POLICY "Users and admins can create gyms"
ON public.gyms
FOR INSERT
WITH CHECK (
  -- Admins can create any gym
  public.has_role(auth.uid(), 'admin', 'global')
  OR
  -- Users can create gyms where they are the owner
  (auth.uid() = owner_id AND auth.uid() IS NOT NULL)
  OR
  -- Users can submit gyms for approval (submitted_by field)
  (auth.uid() = submitted_by AND approval_status = 'pending')
);

-- Allow admins to update any gym (for approval workflow)
DROP POLICY IF EXISTS "Gym owners can update their gyms" ON public.gyms;

CREATE POLICY "Owners and admins can update gyms"
ON public.gyms
FOR UPDATE
USING (
  auth.uid() = owner_id 
  OR public.has_role(auth.uid(), 'admin', 'global')
  OR EXISTS (
    SELECT 1 FROM public.gym_staff 
    WHERE gym_id = gyms.id 
    AND user_id = auth.uid() 
    AND position IN ('owner', 'manager')
    AND is_active = true
  )
);

-- Create trigger for updated_at on registration_requests
CREATE OR REPLACE FUNCTION public.update_registration_requests_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_registration_requests_updated_at ON public.registration_requests;
CREATE TRIGGER update_registration_requests_updated_at
  BEFORE UPDATE ON public.registration_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_registration_requests_timestamp();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON public.registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_registration_requests_type ON public.registration_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_registration_requests_user ON public.registration_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_gyms_approval_status ON public.gyms(approval_status);