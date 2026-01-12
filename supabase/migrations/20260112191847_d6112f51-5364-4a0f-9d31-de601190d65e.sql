-- Step 1: Create staff_shift_patterns table first
CREATE TABLE IF NOT EXISTS public.staff_shift_patterns (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    pattern_data JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_shift_patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gym owners can manage patterns" ON public.staff_shift_patterns;
CREATE POLICY "Gym owners can manage patterns" ON public.staff_shift_patterns
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.gyms WHERE id = staff_shift_patterns.gym_id AND owner_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin', 'global')
        OR public.has_role(auth.uid(), 'gym_manager', 'gym', gym_id)
    );

-- Step 2: Add pattern_id to staff_rotas
ALTER TABLE public.staff_rotas
    ADD COLUMN IF NOT EXISTS pattern_id UUID REFERENCES public.staff_shift_patterns(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS notes TEXT;

-- Step 3: Create gym_facilities table
CREATE TABLE IF NOT EXISTS public.gym_facilities (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE UNIQUE,
    weight_machines BOOLEAN DEFAULT false,
    free_weights BOOLEAN DEFAULT false,
    dumbbells BOOLEAN DEFAULT false,
    cardio_area BOOLEAN DEFAULT false,
    swimming_pool BOOLEAN DEFAULT false,
    spa BOOLEAN DEFAULT false,
    sauna BOOLEAN DEFAULT false,
    steam_room BOOLEAN DEFAULT false,
    outdoor_training BOOLEAN DEFAULT false,
    sprint_track BOOLEAN DEFAULT false,
    turf_area BOOLEAN DEFAULT false,
    functional_training BOOLEAN DEFAULT false,
    group_exercise_studio BOOLEAN DEFAULT false,
    spin_studio BOOLEAN DEFAULT false,
    yoga_studio BOOLEAN DEFAULT false,
    boxing_area BOOLEAN DEFAULT false,
    climbing_wall BOOLEAN DEFAULT false,
    basketball_court BOOLEAN DEFAULT false,
    tennis_court BOOLEAN DEFAULT false,
    squash_court BOOLEAN DEFAULT false,
    cafe BOOLEAN DEFAULT false,
    lockers BOOLEAN DEFAULT false,
    showers BOOLEAN DEFAULT false,
    parking BOOLEAN DEFAULT false,
    wifi BOOLEAN DEFAULT false,
    towel_service BOOLEAN DEFAULT false,
    personal_training BOOLEAN DEFAULT false,
    physio BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gym_facilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gym owners can manage facilities" ON public.gym_facilities;
CREATE POLICY "Gym owners can manage facilities" ON public.gym_facilities
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.gyms WHERE id = gym_facilities.gym_id AND owner_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin', 'global')
        OR public.has_role(auth.uid(), 'gym_manager', 'gym', gym_id)
    );

DROP POLICY IF EXISTS "Public can view facilities" ON public.gym_facilities;
CREATE POLICY "Public can view facilities" ON public.gym_facilities
    FOR SELECT USING (true);

-- Step 4: Add signup_fee to gym_membership_levels
ALTER TABLE public.gym_membership_levels 
    ADD COLUMN IF NOT EXISTS signup_fee NUMERIC(10,2);

-- Step 5: Add staff profile fields
ALTER TABLE public.gym_staff
    ADD COLUMN IF NOT EXISTS bio TEXT,
    ADD COLUMN IF NOT EXISTS certifications TEXT[],
    ADD COLUMN IF NOT EXISTS accreditations TEXT[];

-- Step 6: Add author_name to member_notes
ALTER TABLE public.member_notes 
    ADD COLUMN IF NOT EXISTS author_name TEXT;

-- Step 7: Add suspension details to memberships
ALTER TABLE public.memberships
    ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
    ADD COLUMN IF NOT EXISTS offboarded_at TIMESTAMP WITH TIME ZONE;

-- Create trigger for facilities
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_gym_facilities_updated_at') THEN
        CREATE TRIGGER update_gym_facilities_updated_at
            BEFORE UPDATE ON public.gym_facilities
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_staff_shift_patterns_updated_at') THEN
        CREATE TRIGGER update_staff_shift_patterns_updated_at
            BEFORE UPDATE ON public.staff_shift_patterns
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;