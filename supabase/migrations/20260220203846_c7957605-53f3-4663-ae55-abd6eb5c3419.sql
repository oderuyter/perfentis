
-- =============================================
-- SOCIAL SYSTEM: ADDITIVE MIGRATION
-- Alter existing social_posts + add all new tables
-- =============================================

-- 1. Alter social_posts to add new columns (keeping existing ones)
ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS author_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS scope_type TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS scope_id UUID NULL,
  ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS caption TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS stats_card_data JSONB NULL,
  ADD COLUMN IF NOT EXISTS workout_session_id UUID NULL,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS pinned_by_user_id UUID NULL REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS comments_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Migrate existing user_id to author_user_id if needed
UPDATE public.social_posts SET author_user_id = user_id WHERE author_user_id IS NULL AND user_id IS NOT NULL;

-- Add check constraints (using DO block to avoid errors if they exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'social_posts_scope_type_check'
  ) THEN
    ALTER TABLE public.social_posts ADD CONSTRAINT social_posts_scope_type_check 
      CHECK (scope_type IN ('public', 'gym', 'event', 'run_club'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'social_posts_post_type_check'
  ) THEN
    ALTER TABLE public.social_posts ADD CONSTRAINT social_posts_post_type_check 
      CHECK (post_type IN ('workout_share', 'image', 'text', 'mixed'));
  END IF;
END;
$$;

-- Indexes for social_posts
CREATE INDEX IF NOT EXISTS idx_social_posts_scope ON public.social_posts(scope_type, scope_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_author ON public.social_posts(author_user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_pinned ON public.social_posts(scope_type, scope_id, is_pinned) WHERE is_pinned = true;

-- Enable RLS if not already
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist and recreate
DROP POLICY IF EXISTS "Anyone can view public non-deleted posts" ON public.social_posts;
DROP POLICY IF EXISTS "Users can create posts" ON public.social_posts;
DROP POLICY IF EXISTS "Authors can update their own posts" ON public.social_posts;
DROP POLICY IF EXISTS "Authors can soft-delete their own posts" ON public.social_posts;

CREATE POLICY "Anyone can view public non-deleted posts"
  ON public.social_posts FOR SELECT
  USING (deleted_at IS NULL AND is_hidden = false);

CREATE POLICY "Users can create posts"
  ON public.social_posts FOR INSERT
  WITH CHECK (auth.uid() = author_user_id);

CREATE POLICY "Authors can update their own posts"
  ON public.social_posts FOR UPDATE
  USING (auth.uid() = author_user_id OR public.has_role(auth.uid(), 'admin', 'global'));

-- 2. social_stories (24-hour ephemeral)
CREATE TABLE IF NOT EXISTS public.social_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL DEFAULT 'public' CHECK (scope_type IN ('public', 'gym', 'event', 'run_club')),
  scope_id UUID NULL,
  story_type TEXT NOT NULL DEFAULT 'text' CHECK (story_type IN ('text', 'stats_card')),
  caption TEXT,
  stats_card_data JSONB NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

ALTER TABLE public.social_stories ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_social_stories_scope ON public.social_stories(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_social_stories_expires ON public.social_stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_social_stories_author ON public.social_stories(author_user_id);

DROP POLICY IF EXISTS "Anyone can view non-deleted unexpired stories" ON public.social_stories;
DROP POLICY IF EXISTS "Users can create stories" ON public.social_stories;
DROP POLICY IF EXISTS "Authors can delete their stories" ON public.social_stories;

CREATE POLICY "Anyone can view non-deleted unexpired stories"
  ON public.social_stories FOR SELECT
  USING (deleted_at IS NULL AND expires_at > now());

CREATE POLICY "Users can create stories"
  ON public.social_stories FOR INSERT
  WITH CHECK (auth.uid() = author_user_id);

CREATE POLICY "Authors can update their stories"
  ON public.social_stories FOR UPDATE
  USING (auth.uid() = author_user_id OR public.has_role(auth.uid(), 'admin', 'global'));

-- 3. social_reactions
CREATE TABLE IF NOT EXISTS public.social_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like', 'fire', 'strong', 'clap', 'love')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

ALTER TABLE public.social_reactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_social_reactions_post ON public.social_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_social_reactions_user ON public.social_reactions(user_id);

DROP POLICY IF EXISTS "Anyone authenticated can view reactions" ON public.social_reactions;
DROP POLICY IF EXISTS "Users can manage their own reactions" ON public.social_reactions;

CREATE POLICY "Anyone authenticated can view reactions"
  ON public.social_reactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their own reactions"
  ON public.social_reactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. social_comments
CREATE TABLE IF NOT EXISTS public.social_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

ALTER TABLE public.social_comments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_social_comments_post ON public.social_comments(post_id, created_at);

DROP POLICY IF EXISTS "Anyone can view non-deleted comments" ON public.social_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.social_comments;
DROP POLICY IF EXISTS "Authors can soft delete their comments" ON public.social_comments;

CREATE POLICY "Anyone can view non-deleted comments"
  ON public.social_comments FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create comments"
  ON public.social_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors can soft delete their comments"
  ON public.social_comments FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin', 'global'));

-- 5. social_reports
CREATE TABLE IF NOT EXISTS public.social_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'story')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate_content', 'other')),
  details TEXT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'actioned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ NULL,
  reviewed_by UUID NULL REFERENCES auth.users(id)
);

ALTER TABLE public.social_reports ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_social_reports_status ON public.social_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_reports_target ON public.social_reports(target_type, target_id);

DROP POLICY IF EXISTS "Users can create reports" ON public.social_reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON public.social_reports;
DROP POLICY IF EXISTS "Admins can update reports" ON public.social_reports;

CREATE POLICY "Users can create reports"
  ON public.social_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_user_id);

CREATE POLICY "Users can view their own reports"
  ON public.social_reports FOR SELECT
  USING (auth.uid() = reporter_user_id OR public.has_role(auth.uid(), 'admin', 'global'));

CREATE POLICY "Admins can update reports"
  ON public.social_reports FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin', 'global'));

-- 6. social_moderation_actions
CREATE TABLE IF NOT EXISTS public.social_moderation_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id),
  scope_type TEXT NULL,
  scope_id UUID NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('remove', 'hide', 'lock_comments', 'unpin', 'pin', 'warn_user', 'temp_ban', 'perm_ban', 'unban')),
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'story', 'user')),
  target_id UUID NOT NULL,
  reason TEXT NULL,
  expires_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.social_moderation_actions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_social_mod_actions_target ON public.social_moderation_actions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_social_mod_actions_actor ON public.social_moderation_actions(actor_user_id);

DROP POLICY IF EXISTS "Admins can manage moderation actions" ON public.social_moderation_actions;
DROP POLICY IF EXISTS "Moderators can view their own actions" ON public.social_moderation_actions;

CREATE POLICY "Admins can manage moderation actions"
  ON public.social_moderation_actions FOR ALL
  USING (public.has_role(auth.uid(), 'admin', 'global'));

CREATE POLICY "Moderators can view their own actions"
  ON public.social_moderation_actions FOR SELECT
  USING (auth.uid() = actor_user_id);

-- 7. social_user_bans
CREATE TABLE IF NOT EXISTS public.social_user_bans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ban_type TEXT NOT NULL CHECK (ban_type IN ('warn', 'temp', 'permanent')),
  reason TEXT NULL,
  expires_at TIMESTAMPTZ NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lifted_at TIMESTAMPTZ NULL
);

ALTER TABLE public.social_user_bans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage bans" ON public.social_user_bans;
DROP POLICY IF EXISTS "Users can view their own bans" ON public.social_user_bans;

CREATE POLICY "Admins can manage bans"
  ON public.social_user_bans FOR ALL
  USING (public.has_role(auth.uid(), 'admin', 'global'));

CREATE POLICY "Users can view their own bans"
  ON public.social_user_bans FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================
-- TRIGGER: updated_at
-- =============================================
DROP TRIGGER IF EXISTS update_social_posts_updated_at ON public.social_posts;
CREATE TRIGGER update_social_posts_updated_at
  BEFORE UPDATE ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- PIN LIMIT ENFORCEMENT
-- =============================================
CREATE OR REPLACE FUNCTION public.check_pin_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pinned_count INTEGER;
BEGIN
  IF NEW.is_pinned = true AND (OLD.is_pinned = false OR OLD.is_pinned IS NULL) THEN
    SELECT COUNT(*) INTO v_pinned_count
    FROM public.social_posts
    WHERE scope_type = NEW.scope_type
      AND scope_id IS NOT DISTINCT FROM NEW.scope_id
      AND is_pinned = true
      AND deleted_at IS NULL
      AND id != NEW.id;
    
    IF v_pinned_count >= 3 THEN
      RAISE EXCEPTION 'PIN_LIMIT_EXCEEDED: Maximum 3 pinned posts allowed per community';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_pin_limit ON public.social_posts;
CREATE TRIGGER enforce_pin_limit
  BEFORE UPDATE ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.check_pin_limit();

-- =============================================
-- REALTIME
-- =============================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.social_posts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.social_reactions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.social_comments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.social_stories;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END;
$$;
