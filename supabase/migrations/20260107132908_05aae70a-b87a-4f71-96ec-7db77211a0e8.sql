
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM (
  'admin',
  'athlete',
  'gym_manager',
  'gym_staff',
  'gym_user',
  'coach',
  'coach_client',
  'event_organiser',
  'event_member'
);

-- 2. Create scope type enum
CREATE TYPE public.role_scope AS ENUM (
  'global',
  'gym',
  'event'
);

-- 3. Create capabilities table
CREATE TABLE public.capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  scope_type role_scope NOT NULL DEFAULT 'global',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create role_capabilities mapping
CREATE TABLE public.role_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  capability_id UUID NOT NULL REFERENCES public.capabilities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role, capability_id)
);

-- 5. Create user_roles table with scope support
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  scope_type role_scope NOT NULL DEFAULT 'global',
  scope_id UUID, -- gym_id or event_id depending on scope_type
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, scope_type, scope_id)
);

-- 6. Enhance gyms table
ALTER TABLE public.gyms 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- 7. Enhance memberships table with membership_number
ALTER TABLE public.memberships
ADD COLUMN IF NOT EXISTS membership_number TEXT,
ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Create unique index for membership_number per gym
CREATE UNIQUE INDEX IF NOT EXISTS idx_memberships_number_gym 
ON public.memberships(gym_id, membership_number) 
WHERE membership_number IS NOT NULL;

-- 8. Create gym_staff table
CREATE TABLE public.gym_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position TEXT,
  hire_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(gym_id, user_id)
);

-- 9. Create classes table
CREATE TABLE public.gym_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  capacity INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Create class_schedules table
CREATE TABLE public.class_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.gym_classes(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES auth.users(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Create class_bookings table
CREATE TABLE public.class_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.class_schedules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(schedule_id, user_id, booking_date)
);

-- 12. Create staff_rotas table
CREATE TABLE public.staff_rotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.gym_staff(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Security definer function to check if user has a role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role, _scope_type role_scope DEFAULT 'global', _scope_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
      AND (
        (_scope_type = 'global' AND scope_type = 'global')
        OR (scope_type = _scope_type AND (scope_id = _scope_id OR _scope_id IS NULL))
      )
  )
$$;

-- 14. Function to check if user has a capability
CREATE OR REPLACE FUNCTION public.has_capability(_user_id UUID, _capability_name TEXT, _scope_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_capabilities rc ON ur.role = rc.role
    JOIN public.capabilities c ON rc.capability_id = c.id
    WHERE ur.user_id = _user_id
      AND c.name = _capability_name
      AND ur.is_active = true
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
      AND (
        c.scope_type = 'global'
        OR (ur.scope_id = _scope_id)
        OR _scope_id IS NULL
      )
  )
$$;

-- 15. Function to generate unique membership number
CREATE OR REPLACE FUNCTION public.generate_membership_number(_gym_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _prefix TEXT;
  _number TEXT;
  _attempts INTEGER := 0;
BEGIN
  -- Get first 3 chars of gym name as prefix
  SELECT UPPER(LEFT(REGEXP_REPLACE(name, '[^A-Za-z]', '', 'g'), 3))
  INTO _prefix
  FROM public.gyms WHERE id = _gym_id;
  
  IF _prefix IS NULL OR LENGTH(_prefix) < 3 THEN
    _prefix := 'GYM';
  END IF;
  
  -- Generate unique number
  LOOP
    _number := _prefix || '-' || 
               TO_CHAR(EXTRACT(YEAR FROM CURRENT_DATE), 'FM0000') ||
               LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.memberships 
      WHERE gym_id = _gym_id AND membership_number = _number
    );
    
    _attempts := _attempts + 1;
    IF _attempts > 100 THEN
      RAISE EXCEPTION 'Could not generate unique membership number';
    END IF;
  END LOOP;
  
  RETURN _number;
END;
$$;

-- 16. Trigger to auto-assign membership number
CREATE OR REPLACE FUNCTION public.assign_membership_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.membership_number IS NULL THEN
    NEW.membership_number := public.generate_membership_number(NEW.gym_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_membership_number
BEFORE INSERT ON public.memberships
FOR EACH ROW
EXECUTE FUNCTION public.assign_membership_number();

-- 17. Trigger to auto-assign athlete role on signup
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role, scope_type)
  VALUES (NEW.id, 'athlete', 'global')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_default_role
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.assign_default_role();

-- 18. Insert initial capabilities
INSERT INTO public.capabilities (name, description, scope_type) VALUES
  ('manage_users', 'Manage all users in the system', 'global'),
  ('manage_roles', 'Assign and revoke roles', 'global'),
  ('view_all_gyms', 'View all gyms in the system', 'global'),
  ('manage_gym_profile', 'Edit gym profile and settings', 'gym'),
  ('manage_memberships', 'Manage gym memberships', 'gym'),
  ('view_financials', 'View financial reports', 'gym'),
  ('manage_classes', 'Create and edit classes', 'gym'),
  ('manage_staff', 'Manage gym staff', 'gym'),
  ('view_reports', 'View gym reports', 'gym'),
  ('checkin_members', 'Check in members via QR', 'gym'),
  ('manage_events', 'Create and manage events', 'event'),
  ('view_event_entries', 'View event entries', 'event'),
  ('manage_leaderboard', 'Manage event leaderboard', 'event');

-- 19. Map capabilities to roles
INSERT INTO public.role_capabilities (role, capability_id)
SELECT 'admin', id FROM public.capabilities;

INSERT INTO public.role_capabilities (role, capability_id)
SELECT 'gym_manager', id FROM public.capabilities 
WHERE name IN ('manage_gym_profile', 'manage_memberships', 'view_financials', 'manage_classes', 'manage_staff', 'view_reports', 'checkin_members');

INSERT INTO public.role_capabilities (role, capability_id)
SELECT 'gym_staff', id FROM public.capabilities 
WHERE name IN ('manage_classes', 'checkin_members', 'view_reports');

INSERT INTO public.role_capabilities (role, capability_id)
SELECT 'event_organiser', id FROM public.capabilities 
WHERE name IN ('manage_events', 'view_event_entries', 'manage_leaderboard');

-- 20. Enable RLS on new tables
ALTER TABLE public.capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_rotas ENABLE ROW LEVEL SECURITY;

-- 21. RLS Policies for capabilities (read-only for authenticated)
CREATE POLICY "Capabilities are viewable by authenticated users"
ON public.capabilities FOR SELECT
TO authenticated
USING (true);

-- 22. RLS Policies for role_capabilities (read-only for authenticated)
CREATE POLICY "Role capabilities are viewable by authenticated users"
ON public.role_capabilities FOR SELECT
TO authenticated
USING (true);

-- 23. RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Gym managers can manage gym-scoped roles"
ON public.user_roles FOR ALL
TO authenticated
USING (
  scope_type = 'gym' 
  AND public.has_role(auth.uid(), 'gym_manager', 'gym', scope_id)
);

-- 24. RLS Policies for gym_staff
CREATE POLICY "Staff can view own record"
ON public.gym_staff FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Gym managers can manage staff"
ON public.gym_staff FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'gym_manager', 'gym', gym_id));

CREATE POLICY "Gym owners can manage staff"
ON public.gym_staff FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.gyms WHERE id = gym_id AND owner_id = auth.uid()));

-- 25. RLS Policies for gym_classes
CREATE POLICY "Classes are viewable by gym members"
ON public.gym_classes FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.memberships WHERE gym_id = gym_classes.gym_id AND user_id = auth.uid() AND status = 'active')
  OR public.has_role(auth.uid(), 'gym_manager', 'gym', gym_id)
  OR public.has_role(auth.uid(), 'gym_staff', 'gym', gym_id)
  OR EXISTS (SELECT 1 FROM public.gyms WHERE id = gym_id AND owner_id = auth.uid())
);

CREATE POLICY "Gym managers can manage classes"
ON public.gym_classes FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'gym_manager', 'gym', gym_id)
  OR EXISTS (SELECT 1 FROM public.gyms WHERE id = gym_id AND owner_id = auth.uid())
);

-- 26. RLS Policies for class_schedules
CREATE POLICY "Schedules are viewable by gym members"
ON public.class_schedules FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gym_classes gc
    JOIN public.memberships m ON m.gym_id = gc.gym_id
    WHERE gc.id = class_schedules.class_id AND m.user_id = auth.uid() AND m.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.gym_classes gc
    WHERE gc.id = class_schedules.class_id AND (
      public.has_role(auth.uid(), 'gym_manager', 'gym', gc.gym_id)
      OR public.has_role(auth.uid(), 'gym_staff', 'gym', gc.gym_id)
    )
  )
);

CREATE POLICY "Gym staff can manage schedules"
ON public.class_schedules FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gym_classes gc
    WHERE gc.id = class_schedules.class_id AND (
      public.has_role(auth.uid(), 'gym_manager', 'gym', gc.gym_id)
      OR public.has_role(auth.uid(), 'gym_staff', 'gym', gc.gym_id)
      OR EXISTS (SELECT 1 FROM public.gyms WHERE id = gc.gym_id AND owner_id = auth.uid())
    )
  )
);

-- 27. RLS Policies for class_bookings
CREATE POLICY "Users can view own bookings"
ON public.class_bookings FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create own bookings"
ON public.class_bookings FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can cancel own bookings"
ON public.class_bookings FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Gym staff can view all bookings"
ON public.class_bookings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.class_schedules cs
    JOIN public.gym_classes gc ON gc.id = cs.class_id
    WHERE cs.id = class_bookings.schedule_id AND (
      public.has_role(auth.uid(), 'gym_manager', 'gym', gc.gym_id)
      OR public.has_role(auth.uid(), 'gym_staff', 'gym', gc.gym_id)
    )
  )
);

-- 28. RLS Policies for staff_rotas
CREATE POLICY "Staff can view own rotas"
ON public.staff_rotas FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.gym_staff gs WHERE gs.id = staff_id AND gs.user_id = auth.uid())
);

CREATE POLICY "Gym managers can manage rotas"
ON public.staff_rotas FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'gym_manager', 'gym', gym_id));

-- 29. Add updated_at triggers
CREATE TRIGGER update_gym_staff_updated_at
BEFORE UPDATE ON public.gym_staff
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gym_classes_updated_at
BEFORE UPDATE ON public.gym_classes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
