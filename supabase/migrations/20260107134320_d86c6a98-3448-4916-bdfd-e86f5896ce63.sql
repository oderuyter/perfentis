-- Member contact details (gym-scoped)
CREATE TABLE public.member_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  postcode TEXT,
  country TEXT,
  phone TEXT,
  emergency_name TEXT,
  emergency_relationship TEXT,
  emergency_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Internal staff notes (not visible to members)
CREATE TABLE public.member_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  note_text TEXT NOT NULL,
  tag TEXT CHECK (tag IN ('billing', 'injury', 'behaviour', 'admin', 'general')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.member_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_notes ENABLE ROW LEVEL SECURITY;

-- Member contacts policies (gym staff/managers only)
CREATE POLICY "Gym staff can view member contacts"
ON public.member_contacts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM memberships m
    JOIN gyms g ON g.id = m.gym_id
    WHERE m.id = member_contacts.membership_id
    AND (
      has_role(auth.uid(), 'gym_manager', 'gym', m.gym_id) OR
      has_role(auth.uid(), 'gym_staff', 'gym', m.gym_id) OR
      g.owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Gym staff can insert member contacts"
ON public.member_contacts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM memberships m
    JOIN gyms g ON g.id = m.gym_id
    WHERE m.id = member_contacts.membership_id
    AND (
      has_role(auth.uid(), 'gym_manager', 'gym', m.gym_id) OR
      has_role(auth.uid(), 'gym_staff', 'gym', m.gym_id) OR
      g.owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Gym staff can update member contacts"
ON public.member_contacts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM memberships m
    JOIN gyms g ON g.id = m.gym_id
    WHERE m.id = member_contacts.membership_id
    AND (
      has_role(auth.uid(), 'gym_manager', 'gym', m.gym_id) OR
      has_role(auth.uid(), 'gym_staff', 'gym', m.gym_id) OR
      g.owner_id = auth.uid()
    )
  )
);

-- Member notes policies (gym staff/managers only, never visible to members)
CREATE POLICY "Gym staff can view member notes"
ON public.member_notes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM memberships m
    JOIN gyms g ON g.id = m.gym_id
    WHERE m.id = member_notes.membership_id
    AND (
      has_role(auth.uid(), 'gym_manager', 'gym', m.gym_id) OR
      has_role(auth.uid(), 'gym_staff', 'gym', m.gym_id) OR
      g.owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Gym staff can insert member notes"
ON public.member_notes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM memberships m
    JOIN gyms g ON g.id = m.gym_id
    WHERE m.id = member_notes.membership_id
    AND (
      has_role(auth.uid(), 'gym_manager', 'gym', m.gym_id) OR
      has_role(auth.uid(), 'gym_staff', 'gym', m.gym_id) OR
      g.owner_id = auth.uid()
    )
  )
  AND author_id = auth.uid()
);

CREATE POLICY "Gym staff can update own notes"
ON public.member_notes FOR UPDATE
USING (
  author_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM memberships m
    JOIN gyms g ON g.id = m.gym_id
    WHERE m.id = member_notes.membership_id
    AND (
      has_role(auth.uid(), 'gym_manager', 'gym', m.gym_id) OR
      has_role(auth.uid(), 'gym_staff', 'gym', m.gym_id) OR
      g.owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Gym managers can delete notes"
ON public.member_notes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM memberships m
    JOIN gyms g ON g.id = m.gym_id
    WHERE m.id = member_notes.membership_id
    AND (
      has_role(auth.uid(), 'gym_manager', 'gym', m.gym_id) OR
      g.owner_id = auth.uid()
    )
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_member_contacts_updated_at
BEFORE UPDATE ON public.member_contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_member_notes_updated_at
BEFORE UPDATE ON public.member_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();