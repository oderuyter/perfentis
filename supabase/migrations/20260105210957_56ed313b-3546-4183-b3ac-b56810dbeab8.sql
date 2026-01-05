-- Add image_url column to exercises table
ALTER TABLE public.exercises
ADD COLUMN image_url text;

-- Create storage bucket for exercise images
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-images', 'exercise-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to exercise-images bucket
CREATE POLICY "Users can upload exercise images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'exercise-images' 
  AND auth.uid() IS NOT NULL
);

-- Allow public read access to exercise images
CREATE POLICY "Exercise images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'exercise-images');

-- Allow users to update their own exercise images
CREATE POLICY "Users can update own exercise images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'exercise-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own exercise images
CREATE POLICY "Users can delete own exercise images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'exercise-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);