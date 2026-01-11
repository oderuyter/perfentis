-- Create music provider connections table
CREATE TABLE public.music_provider_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('spotify', 'youtube_music', 'apple_music')),
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'expired')),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Create saved playlists table
CREATE TABLE public.saved_playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('spotify', 'youtube_music', 'apple_music')),
  external_playlist_id TEXT NOT NULL,
  name TEXT NOT NULL,
  cover_art_url TEXT,
  track_count INTEGER DEFAULT 0,
  cached_tracks_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider, external_playlist_id)
);

-- Create playlist tracks table (optional normalized storage)
CREATE TABLE public.playlist_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  saved_playlist_id UUID NOT NULL REFERENCES public.saved_playlists(id) ON DELETE CASCADE,
  external_track_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  duration_seconds INTEGER,
  artwork_url TEXT,
  position_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.music_provider_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;

-- RLS policies for music_provider_connections
CREATE POLICY "Users can view their own music connections"
  ON public.music_provider_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own music connections"
  ON public.music_provider_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own music connections"
  ON public.music_provider_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own music connections"
  ON public.music_provider_connections FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for saved_playlists
CREATE POLICY "Users can view their own saved playlists"
  ON public.saved_playlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved playlists"
  ON public.saved_playlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved playlists"
  ON public.saved_playlists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved playlists"
  ON public.saved_playlists FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for playlist_tracks (via playlist ownership)
CREATE POLICY "Users can view tracks of their playlists"
  ON public.playlist_tracks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.saved_playlists sp
      WHERE sp.id = playlist_tracks.saved_playlist_id
      AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tracks to their playlists"
  ON public.playlist_tracks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.saved_playlists sp
      WHERE sp.id = playlist_tracks.saved_playlist_id
      AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tracks from their playlists"
  ON public.playlist_tracks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.saved_playlists sp
      WHERE sp.id = playlist_tracks.saved_playlist_id
      AND sp.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_music_connections_user ON public.music_provider_connections(user_id);
CREATE INDEX idx_saved_playlists_user ON public.saved_playlists(user_id);
CREATE INDEX idx_saved_playlists_provider ON public.saved_playlists(provider);
CREATE INDEX idx_playlist_tracks_playlist ON public.playlist_tracks(saved_playlist_id);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_music_connections_updated_at
  BEFORE UPDATE ON public.music_provider_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saved_playlists_updated_at
  BEFORE UPDATE ON public.saved_playlists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();