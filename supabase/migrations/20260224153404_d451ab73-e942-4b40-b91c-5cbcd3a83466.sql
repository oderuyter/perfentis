-- Fix: Make progress-photos bucket private to prevent public access to sensitive body images
UPDATE storage.buckets SET public = false WHERE id = 'progress-photos';