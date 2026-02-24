
-- ============================================================
-- Unified Workout Block System
-- ============================================================

-- 1. workout_blocks — planned structure (template or session)
CREATE TABLE public.workout_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_template_id UUID REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  workout_session_id UUID REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  parent_block_id UUID REFERENCES public.workout_blocks(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL CHECK (block_type IN ('single','superset','emom','amrap','ygig')),
  title TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. workout_block_items — exercises within blocks
CREATE TABLE public.workout_block_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  block_id UUID NOT NULL REFERENCES public.workout_blocks(id) ON DELETE CASCADE,
  exercise_id UUID,
  exercise_name_override TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  item_notes TEXT,
  target_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. block_instances — runtime tracking per session
CREATE TABLE public.block_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES public.workout_blocks(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','active','completed','skipped')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  elapsed_seconds INTEGER,
  context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Add block context columns to exercise_logs
ALTER TABLE public.exercise_logs
  ADD COLUMN IF NOT EXISTS block_instance_id UUID REFERENCES public.block_instances(id) ON DELETE SET NULL;

-- 5. Add block context columns to set_logs
ALTER TABLE public.set_logs
  ADD COLUMN IF NOT EXISTS block_instance_id UUID REFERENCES public.block_instances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS block_round_index INTEGER,
  ADD COLUMN IF NOT EXISTS block_minute_index INTEGER,
  ADD COLUMN IF NOT EXISTS partner_user_id UUID;

-- 6. YGIG partner invitations table
CREATE TABLE public.ygig_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  block_instance_id UUID NOT NULL REFERENCES public.block_instances(id) ON DELETE CASCADE,
  inviter_user_id UUID NOT NULL,
  invitee_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','expired')),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_workout_blocks_template ON public.workout_blocks(workout_template_id) WHERE workout_template_id IS NOT NULL;
CREATE INDEX idx_workout_blocks_session ON public.workout_blocks(workout_session_id) WHERE workout_session_id IS NOT NULL;
CREATE INDEX idx_block_items_block ON public.workout_block_items(block_id);
CREATE INDEX idx_block_instances_session ON public.block_instances(workout_session_id);
CREATE INDEX idx_exercise_logs_block_instance ON public.exercise_logs(block_instance_id) WHERE block_instance_id IS NOT NULL;
CREATE INDEX idx_set_logs_block_instance ON public.set_logs(block_instance_id) WHERE block_instance_id IS NOT NULL;
CREATE INDEX idx_ygig_invitations_invitee ON public.ygig_invitations(invitee_user_id, status);

-- Triggers for updated_at
CREATE TRIGGER update_workout_blocks_updated_at BEFORE UPDATE ON public.workout_blocks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_workout_block_items_updated_at BEFORE UPDATE ON public.workout_block_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_block_instances_updated_at BEFORE UPDATE ON public.block_instances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.workout_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_block_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.block_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ygig_invitations ENABLE ROW LEVEL SECURITY;

-- workout_blocks policies (using owner_user_id for templates, user_id for sessions)
CREATE POLICY "Users can view blocks for their templates" ON public.workout_blocks FOR SELECT
  USING (
    workout_template_id IN (SELECT id FROM public.workout_templates WHERE owner_user_id = auth.uid())
    OR workout_session_id IN (SELECT id FROM public.workout_sessions WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin', 'global')
  );

CREATE POLICY "Users can insert blocks for their templates" ON public.workout_blocks FOR INSERT
  WITH CHECK (
    workout_template_id IN (SELECT id FROM public.workout_templates WHERE owner_user_id = auth.uid())
    OR workout_session_id IN (SELECT id FROM public.workout_sessions WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin', 'global')
  );

CREATE POLICY "Users can update their blocks" ON public.workout_blocks FOR UPDATE
  USING (
    workout_template_id IN (SELECT id FROM public.workout_templates WHERE owner_user_id = auth.uid())
    OR workout_session_id IN (SELECT id FROM public.workout_sessions WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin', 'global')
  );

CREATE POLICY "Users can delete their blocks" ON public.workout_blocks FOR DELETE
  USING (
    workout_template_id IN (SELECT id FROM public.workout_templates WHERE owner_user_id = auth.uid())
    OR workout_session_id IN (SELECT id FROM public.workout_sessions WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin', 'global')
  );

-- workout_block_items policies
CREATE POLICY "Users can view block items" ON public.workout_block_items FOR SELECT
  USING (
    block_id IN (
      SELECT id FROM public.workout_blocks WHERE
        workout_template_id IN (SELECT id FROM public.workout_templates WHERE owner_user_id = auth.uid())
        OR workout_session_id IN (SELECT id FROM public.workout_sessions WHERE user_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin', 'global')
  );

CREATE POLICY "Users can insert block items" ON public.workout_block_items FOR INSERT
  WITH CHECK (
    block_id IN (
      SELECT id FROM public.workout_blocks WHERE
        workout_template_id IN (SELECT id FROM public.workout_templates WHERE owner_user_id = auth.uid())
        OR workout_session_id IN (SELECT id FROM public.workout_sessions WHERE user_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin', 'global')
  );

CREATE POLICY "Users can update block items" ON public.workout_block_items FOR UPDATE
  USING (
    block_id IN (
      SELECT id FROM public.workout_blocks WHERE
        workout_template_id IN (SELECT id FROM public.workout_templates WHERE owner_user_id = auth.uid())
        OR workout_session_id IN (SELECT id FROM public.workout_sessions WHERE user_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin', 'global')
  );

CREATE POLICY "Users can delete block items" ON public.workout_block_items FOR DELETE
  USING (
    block_id IN (
      SELECT id FROM public.workout_blocks WHERE
        workout_template_id IN (SELECT id FROM public.workout_templates WHERE owner_user_id = auth.uid())
        OR workout_session_id IN (SELECT id FROM public.workout_sessions WHERE user_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin', 'global')
  );

-- block_instances policies
CREATE POLICY "Users can view their block instances" ON public.block_instances FOR SELECT
  USING (
    workout_session_id IN (SELECT id FROM public.workout_sessions WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin', 'global')
  );

CREATE POLICY "Users can insert block instances" ON public.block_instances FOR INSERT
  WITH CHECK (
    workout_session_id IN (SELECT id FROM public.workout_sessions WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin', 'global')
  );

CREATE POLICY "Users can update their block instances" ON public.block_instances FOR UPDATE
  USING (
    workout_session_id IN (SELECT id FROM public.workout_sessions WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin', 'global')
  );

CREATE POLICY "Users can delete their block instances" ON public.block_instances FOR DELETE
  USING (
    workout_session_id IN (SELECT id FROM public.workout_sessions WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin', 'global')
  );

-- ygig_invitations policies
CREATE POLICY "Users can view their YGIG invitations" ON public.ygig_invitations FOR SELECT
  USING (inviter_user_id = auth.uid() OR invitee_user_id = auth.uid());

CREATE POLICY "Users can create YGIG invitations" ON public.ygig_invitations FOR INSERT
  WITH CHECK (inviter_user_id = auth.uid());

CREATE POLICY "Users can update invitations they received" ON public.ygig_invitations FOR UPDATE
  USING (invitee_user_id = auth.uid() OR inviter_user_id = auth.uid());
