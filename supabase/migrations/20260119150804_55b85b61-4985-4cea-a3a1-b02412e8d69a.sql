-- Create event_categories table for organizing events
CREATE TABLE public.event_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add category_id and gym_id to events table
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.event_categories(id),
  ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gyms(id);

-- Enable RLS on event_categories
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read categories
CREATE POLICY "Event categories are viewable by everyone" 
ON public.event_categories 
FOR SELECT 
USING (true);

-- Only admins can manage categories
CREATE POLICY "Admins can manage event categories" 
ON public.event_categories 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.is_active = true
  )
);

-- Insert default event categories
INSERT INTO public.event_categories (name, description, display_order) VALUES
('Competition', 'Competitive fitness events with rankings and prizes', 1),
('Throwdown', 'Friendly competition events at gyms', 2),
('Challenge', 'Multi-day or multi-week fitness challenges', 3),
('Qualifier', 'Qualifying events for larger competitions', 4),
('Charity', 'Events supporting charitable causes', 5),
('Workshop', 'Educational hands-on training sessions', 6),
('Seminar', 'Educational presentations and talks', 7),
('Community', 'Social and community building events', 8);

-- Create index for faster lookups
CREATE INDEX idx_events_category_id ON public.events(category_id);
CREATE INDEX idx_events_gym_id ON public.events(gym_id);