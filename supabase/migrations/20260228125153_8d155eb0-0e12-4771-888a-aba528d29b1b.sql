
-- Storage bucket for signage media
INSERT INTO storage.buckets (id, name, public)
VALUES ('signage', 'signage', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for signage bucket
CREATE POLICY "Signage images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'signage');

CREATE POLICY "Gym owners can upload signage"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'signage'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Gym owners can update signage"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'signage'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Gym owners can delete signage"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'signage'
  AND auth.uid() IS NOT NULL
);

-- Add display settings columns
ALTER TABLE public.displays
ADD COLUMN IF NOT EXISTS show_join_code boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS show_join_qr boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS join_placement text NOT NULL DEFAULT 'bottom_right',
ADD COLUMN IF NOT EXISTS signage_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS signage_show_during_active_session boolean NOT NULL DEFAULT false;

-- Signage playlists
CREATE TABLE public.display_signage_playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type text NOT NULL CHECK (owner_type IN ('gym', 'coach')),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  shuffle boolean NOT NULL DEFAULT false,
  transition_style text NOT NULL DEFAULT 'fade' CHECK (transition_style IN ('fade', 'cut')),
  default_slide_duration_seconds integer NOT NULL DEFAULT 8,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.display_signage_playlists ENABLE ROW LEVEL SECURITY;

-- Signage slides
CREATE TABLE public.display_signage_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES public.display_signage_playlists(id) ON DELETE CASCADE,
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video', 'text')),
  image_url text,
  caption text,
  duration_seconds integer,
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.display_signage_slides ENABLE ROW LEVEL SECURITY;

-- Signage assignments (playlist → display)
CREATE TABLE public.display_signage_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id uuid NOT NULL REFERENCES public.displays(id) ON DELETE CASCADE,
  playlist_id uuid NOT NULL REFERENCES public.display_signage_playlists(id) ON DELETE CASCADE,
  assignment_mode text NOT NULL DEFAULT 'explicit' CHECK (assignment_mode IN ('inherited_default', 'explicit')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (display_id)
);

ALTER TABLE public.display_signage_assignments ENABLE ROW LEVEL SECURITY;

-- RLS: playlists
CREATE POLICY "Owners can manage their playlists"
ON public.display_signage_playlists FOR ALL
USING (
  (owner_type = 'gym' AND EXISTS (
    SELECT 1 FROM public.gyms WHERE id = owner_id AND owner_id = auth.uid()
  )) OR
  (owner_type = 'gym' AND EXISTS (
    SELECT 1 FROM public.gym_staff WHERE gym_id = owner_id AND user_id = auth.uid()
  )) OR
  (owner_type = 'coach' AND EXISTS (
    SELECT 1 FROM public.coaches WHERE id = owner_id AND user_id = auth.uid()
  )) OR
  public.has_role(auth.uid(), 'admin', 'global')
);

CREATE POLICY "Playlists readable for display lookup"
ON public.display_signage_playlists FOR SELECT
USING (true);

-- RLS: slides
CREATE POLICY "Owners can manage slides"
ON public.display_signage_slides FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.display_signage_playlists p
    WHERE p.id = playlist_id AND (
      (p.owner_type = 'gym' AND EXISTS (SELECT 1 FROM public.gyms WHERE id = p.owner_id AND owner_id = auth.uid())) OR
      (p.owner_type = 'gym' AND EXISTS (SELECT 1 FROM public.gym_staff WHERE gym_id = p.owner_id AND user_id = auth.uid())) OR
      (p.owner_type = 'coach' AND EXISTS (SELECT 1 FROM public.coaches WHERE id = p.owner_id AND user_id = auth.uid())) OR
      public.has_role(auth.uid(), 'admin', 'global')
    )
  )
);

CREATE POLICY "Slides readable for display"
ON public.display_signage_slides FOR SELECT
USING (true);

-- RLS: assignments
CREATE POLICY "Owners can manage assignments"
ON public.display_signage_assignments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.displays d
    WHERE d.id = display_id AND (
      (d.owner_type = 'gym' AND EXISTS (SELECT 1 FROM public.gyms WHERE id = d.owner_id AND owner_id = auth.uid())) OR
      (d.owner_type = 'gym' AND EXISTS (SELECT 1 FROM public.gym_staff WHERE gym_id = d.owner_id AND user_id = auth.uid())) OR
      (d.owner_type = 'coach' AND EXISTS (SELECT 1 FROM public.coaches WHERE id = d.owner_id AND user_id = auth.uid())) OR
      public.has_role(auth.uid(), 'admin', 'global')
    )
  )
);

CREATE POLICY "Assignments readable for display"
ON public.display_signage_assignments FOR SELECT
USING (true);

-- Updated_at triggers
CREATE TRIGGER update_signage_playlists_updated_at
BEFORE UPDATE ON public.display_signage_playlists
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_signage_slides_updated_at
BEFORE UPDATE ON public.display_signage_slides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_signage_assignments_updated_at
BEFORE UPDATE ON public.display_signage_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
