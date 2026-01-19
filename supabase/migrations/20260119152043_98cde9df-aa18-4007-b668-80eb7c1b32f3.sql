-- Create event_class_categories table for organizing event classes
CREATE TABLE public.event_class_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_classes table for individual classes within categories
CREATE TABLE public.event_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.event_class_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_class_workouts junction table to link workouts to classes
CREATE TABLE public.event_class_workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.event_classes(id) ON DELETE CASCADE,
  workout_id UUID NOT NULL REFERENCES public.event_workouts(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(class_id, workout_id)
);

-- Create event_schedule_blocks table for scheduling workouts/classes
CREATE TABLE public.event_schedule_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.event_classes(id) ON DELETE SET NULL,
  workout_id UUID REFERENCES public.event_workouts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  notes TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.event_class_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_class_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_schedule_blocks ENABLE ROW LEVEL SECURITY;

-- RLS policies for event_class_categories
CREATE POLICY "Event organizers can manage class categories"
ON public.event_class_categories
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_id 
    AND e.organiser_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.event_staff es
    WHERE es.event_id = event_class_categories.event_id
    AND es.user_id = auth.uid()
    AND es.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Public can view class categories for published events"
ON public.event_class_categories
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_id 
    AND e.status IN ('published', 'active', 'registration_open')
  )
);

-- RLS policies for event_classes
CREATE POLICY "Event organizers can manage classes"
ON public.event_classes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_id 
    AND e.organiser_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.event_staff es
    WHERE es.event_id = event_classes.event_id
    AND es.user_id = auth.uid()
    AND es.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Public can view classes for published events"
ON public.event_classes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_id 
    AND e.status IN ('published', 'active', 'registration_open')
  )
);

-- RLS policies for event_class_workouts
CREATE POLICY "Event organizers can manage class workouts"
ON public.event_class_workouts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.event_classes ec
    JOIN public.events e ON e.id = ec.event_id
    WHERE ec.id = class_id 
    AND e.organiser_id = auth.uid()
  )
);

CREATE POLICY "Public can view class workouts for published events"
ON public.event_class_workouts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.event_classes ec
    JOIN public.events e ON e.id = ec.event_id
    WHERE ec.id = class_id 
    AND e.status IN ('published', 'active', 'registration_open')
  )
);

-- RLS policies for event_schedule_blocks
CREATE POLICY "Event organizers can manage schedule blocks"
ON public.event_schedule_blocks
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_id 
    AND e.organiser_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.event_staff es
    WHERE es.event_id = event_schedule_blocks.event_id
    AND es.user_id = auth.uid()
    AND es.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Public can view schedule for published events"
ON public.event_schedule_blocks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_id 
    AND e.status IN ('published', 'active', 'registration_open')
  )
);

-- Create indexes for better performance
CREATE INDEX idx_event_class_categories_event ON public.event_class_categories(event_id);
CREATE INDEX idx_event_classes_event ON public.event_classes(event_id);
CREATE INDEX idx_event_classes_category ON public.event_classes(category_id);
CREATE INDEX idx_event_class_workouts_class ON public.event_class_workouts(class_id);
CREATE INDEX idx_event_class_workouts_workout ON public.event_class_workouts(workout_id);
CREATE INDEX idx_event_schedule_blocks_event ON public.event_schedule_blocks(event_id);
CREATE INDEX idx_event_schedule_blocks_time ON public.event_schedule_blocks(start_time);