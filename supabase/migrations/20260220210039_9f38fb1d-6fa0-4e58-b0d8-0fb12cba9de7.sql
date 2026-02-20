-- Drop the conflicting RLS policy that checks user_id (wrong column name)
DROP POLICY IF EXISTS "Users can create own posts" ON public.social_posts;

-- Ensure user_id column mirrors author_user_id via a default so old inserts don't break
-- The insert in code sends author_user_id but not user_id; make user_id default to author_user_id
-- We can't use a generated column easily, so instead make user_id nullable or add a trigger

-- Option: make user_id nullable (it was originally for a different schema)
ALTER TABLE public.social_posts ALTER COLUMN user_id DROP NOT NULL;

-- Option: add a trigger to auto-fill user_id from author_user_id on insert
CREATE OR REPLACE FUNCTION public.sync_social_post_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL AND NEW.author_user_id IS NOT NULL THEN
    NEW.user_id := NEW.author_user_id;
  END IF;
  IF NEW.author_user_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.author_user_id := NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS sync_social_post_user_id_trigger ON public.social_posts;
CREATE TRIGGER sync_social_post_user_id_trigger
  BEFORE INSERT ON public.social_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_social_post_user_id();