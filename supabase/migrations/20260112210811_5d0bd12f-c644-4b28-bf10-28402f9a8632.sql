-- Drop the incomplete gym logo upload policy and recreate it properly
DROP POLICY IF EXISTS "Gym staff can upload logos" ON storage.objects;

-- Create proper INSERT policy for gym logo uploads
CREATE POLICY "Gym staff can upload logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'gym-logos' AND 
  EXISTS (
    SELECT 1 FROM gyms g 
    WHERE g.id::text = (storage.foldername(name))[1] 
    AND g.owner_id = auth.uid()
  )
);

-- Also allow gym staff (not just owners) to upload
CREATE POLICY "Gym staff members can upload logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'gym-logos' AND 
  EXISTS (
    SELECT 1 FROM gym_staff gs 
    WHERE gs.gym_id::text = (storage.foldername(name))[1] 
    AND gs.user_id = auth.uid() 
    AND gs.is_active = true
  )
);

-- Create gym_payments table for member payment history
CREATE TABLE IF NOT EXISTS public.gym_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'GBP',
  payment_type TEXT DEFAULT 'subscription',
  payment_method TEXT,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'completed',
  description TEXT,
  invoice_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on gym_payments
ALTER TABLE public.gym_payments ENABLE ROW LEVEL SECURITY;

-- Gym owners and staff can view payments for their gym
CREATE POLICY "Gym staff can view gym payments"
ON public.gym_payments
FOR SELECT
USING (
  gym_id IN (
    SELECT id FROM gyms WHERE owner_id = auth.uid()
    UNION
    SELECT gym_id FROM gym_staff WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Gym owners and staff can insert payments
CREATE POLICY "Gym staff can insert payments"
ON public.gym_payments
FOR INSERT
WITH CHECK (
  gym_id IN (
    SELECT id FROM gyms WHERE owner_id = auth.uid()
    UNION
    SELECT gym_id FROM gym_staff WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Members can view their own payment history
CREATE POLICY "Members can view own payments"
ON public.gym_payments
FOR SELECT
USING (
  membership_id IN (
    SELECT id FROM memberships WHERE user_id = auth.uid()
  )
);