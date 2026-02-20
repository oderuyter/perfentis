-- Add media_url to social_stories
ALTER TABLE public.social_stories
  ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Storage bucket for story images
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-stories', 'social-stories', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: anyone can view story images (public bucket)
CREATE POLICY "Social story images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'social-stories');

-- RLS: authenticated users can upload their own story images
CREATE POLICY "Users can upload story images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'social-stories'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS: users can delete their own story images
CREATE POLICY "Users can delete their own story images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'social-stories'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );