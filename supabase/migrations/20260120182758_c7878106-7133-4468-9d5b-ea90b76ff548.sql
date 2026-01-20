-- Create demo_seed_registry table for tracking seeded data
CREATE TABLE IF NOT EXISTS public.demo_seed_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_seed_key TEXT NOT NULL DEFAULT 'aio_demo_v1',
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_email TEXT, -- For user entities, store email for easy lookup
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient lookup
CREATE INDEX idx_demo_seed_registry_seed_key ON public.demo_seed_registry(demo_seed_key);
CREATE INDEX idx_demo_seed_registry_entity_type ON public.demo_seed_registry(entity_type);
CREATE INDEX idx_demo_seed_registry_entity_id ON public.demo_seed_registry(entity_id);
CREATE INDEX idx_demo_seed_registry_entity_email ON public.demo_seed_registry(entity_email);

-- Unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX idx_demo_seed_registry_unique ON public.demo_seed_registry(demo_seed_key, entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.demo_seed_registry ENABLE ROW LEVEL SECURITY;

-- Only admins can access this table
CREATE POLICY "Admins can manage demo registry" ON public.demo_seed_registry
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin', 'global'))
  WITH CHECK (public.has_role(auth.uid(), 'admin', 'global'));

-- Add is_demo column to key tables for easy filtering
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE public.gyms ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE public.training_plans ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;