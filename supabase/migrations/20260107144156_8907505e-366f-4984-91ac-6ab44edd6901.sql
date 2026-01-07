
-- Add RLS policy for gym managers to view gym memberships
CREATE POLICY "Gym managers can view gym memberships"
ON public.memberships
FOR SELECT
USING (
  has_role(auth.uid(), 'gym_manager', 'gym', gym_id) OR
  has_role(auth.uid(), 'gym_staff', 'gym', gym_id)
);

-- Add RLS policy for gym managers to update memberships
CREATE POLICY "Gym managers can update gym memberships"
ON public.memberships
FOR UPDATE
USING (
  has_role(auth.uid(), 'gym_manager', 'gym', gym_id) OR
  has_role(auth.uid(), 'gym_staff', 'gym', gym_id)
);

-- Add RLS policy for gym managers to insert memberships
CREATE POLICY "Gym managers can insert gym memberships"
ON public.memberships
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'gym_manager', 'gym', gym_id) OR
  has_role(auth.uid(), 'gym_staff', 'gym', gym_id)
);

-- Add RLS policy for gym staff to view check-ins
CREATE POLICY "Gym staff can view check-ins"
ON public.membership_checkins
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.id = membership_checkins.membership_id
    AND (
      has_role(auth.uid(), 'gym_manager', 'gym', m.gym_id) OR
      has_role(auth.uid(), 'gym_staff', 'gym', m.gym_id) OR
      EXISTS (SELECT 1 FROM gyms g WHERE g.id = m.gym_id AND g.owner_id = auth.uid())
    )
  )
);

-- Add RLS policy for gym staff to insert check-ins for members
CREATE POLICY "Gym staff can insert check-ins"
ON public.membership_checkins
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.id = membership_checkins.membership_id
    AND (
      has_role(auth.uid(), 'gym_manager', 'gym', m.gym_id) OR
      has_role(auth.uid(), 'gym_staff', 'gym', m.gym_id) OR
      EXISTS (SELECT 1 FROM gyms g WHERE g.id = m.gym_id AND g.owner_id = auth.uid())
    )
  )
);
