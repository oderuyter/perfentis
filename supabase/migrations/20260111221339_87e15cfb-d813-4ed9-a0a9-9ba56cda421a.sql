-- Create playlist library table for approved playlists
CREATE TABLE public.playlist_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('spotify', 'youtube_music', 'apple_music', 'soundcloud', 'tidal')),
  playlist_url TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_art_url TEXT,
  genre TEXT NOT NULL DEFAULT 'general',
  track_count INTEGER,
  submitted_by UUID REFERENCES auth.users(id),
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create playlist submissions table for pending submissions
CREATE TABLE public.playlist_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('spotify', 'youtube_music', 'apple_music', 'soundcloud', 'tidal')),
  playlist_url TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_art_url TEXT,
  suggested_genre TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.playlist_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_submissions ENABLE ROW LEVEL SECURITY;

-- Playlist library policies (public read, admin write)
CREATE POLICY "Anyone can view playlist library"
  ON public.playlist_library
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage playlist library"
  ON public.playlist_library
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Playlist submissions policies
CREATE POLICY "Users can view their own submissions"
  ON public.playlist_submissions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all submissions"
  ON public.playlist_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can submit playlists"
  ON public.playlist_submissions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update submissions"
  ON public.playlist_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create updated_at triggers
CREATE TRIGGER update_playlist_library_updated_at
  BEFORE UPDATE ON public.playlist_library
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_playlist_submissions_updated_at
  BEFORE UPDATE ON public.playlist_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();