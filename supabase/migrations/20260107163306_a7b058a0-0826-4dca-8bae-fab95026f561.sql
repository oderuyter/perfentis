-- =====================================================
-- COACHING SYSTEM DATABASE SCHEMA
-- =====================================================

-- 1. COACH SERVICES (offerings)
CREATE TABLE public.coach_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  delivery_type text NOT NULL DEFAULT 'remote' CHECK (delivery_type IN ('in_person', 'remote', 'hybrid')),
  price numeric,
  billing_cycle text DEFAULT 'monthly' CHECK (billing_cycle IN ('one_time', 'weekly', 'monthly', 'quarterly', 'yearly')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. COACH CLIENTS (relationships)
CREATE TABLE public.coach_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  client_user_id uuid NOT NULL,
  service_id uuid REFERENCES public.coach_services(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  notes text, -- internal coach notes
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_id, client_user_id)
);

-- 3. COACH INVITATIONS
CREATE TABLE public.coach_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  service_id uuid REFERENCES public.coach_services(id) ON DELETE SET NULL,
  message text,
  token text NOT NULL DEFAULT gen_random_uuid()::text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. TRAINING PLANS
CREATE TABLE public.training_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  plan_type text NOT NULL DEFAULT 'workout' CHECK (plan_type IN ('workout', 'habit', 'combined')),
  duration_weeks integer,
  is_template boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  parent_plan_id uuid REFERENCES public.training_plans(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. PLAN WEEKS (structure for multi-week plans)
CREATE TABLE public.plan_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, week_number)
);

-- 6. PLAN WORKOUTS (workouts within a plan)
CREATE TABLE public.plan_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id uuid NOT NULL REFERENCES public.plan_weeks(id) ON DELETE CASCADE,
  day_of_week integer CHECK (day_of_week >= 0 AND day_of_week <= 6),
  name text NOT NULL,
  description text,
  coach_notes text, -- notes visible to athlete
  exercise_data jsonb, -- stores exercise structure
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. CLIENT PLAN ASSIGNMENTS
CREATE TABLE public.client_plan_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.coach_clients(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. CHECK-IN TEMPLATES
CREATE TABLE public.checkin_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  frequency text DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
  questions jsonb NOT NULL DEFAULT '[]', -- array of {type, question, options}
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9. CLIENT CHECK-INS (scheduled/submitted)
CREATE TABLE public.client_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.coach_clients(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.checkin_templates(id) ON DELETE SET NULL,
  due_date date,
  submitted_at timestamptz,
  responses jsonb, -- answers to template questions
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'reviewed', 'overdue')),
  coach_comments text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. COACH APPOINTMENTS
CREATE TABLE public.coach_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.coach_clients(id) ON DELETE CASCADE,
  appointment_type text NOT NULL DEFAULT 'session' CHECK (appointment_type IN ('check_in', 'session', 'consultation', 'other')),
  mode text NOT NULL DEFAULT 'online' CHECK (mode IN ('online', 'in_person')),
  title text,
  start_time timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  location text,
  notes text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 11. COACH GYM AFFILIATIONS
CREATE TABLE public.coach_gym_affiliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  affiliation_type text DEFAULT 'independent' CHECK (affiliation_type IN ('employee', 'contractor', 'independent', 'partner')),
  delivery_availability text DEFAULT 'hybrid' CHECK (delivery_availability IN ('in_person', 'remote', 'hybrid')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_id, gym_id)
);

-- 12. COACH INVOICES
CREATE TABLE public.coach_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.coach_clients(id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.coach_services(id) ON DELETE SET NULL,
  invoice_number text,
  amount numeric NOT NULL,
  currency text DEFAULT 'USD',
  description text,
  due_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'void')),
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 13. COACH TRANSACTIONS (ledger)
CREATE TABLE public.coach_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.coach_invoices(id) ON DELETE SET NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('payment', 'refund', 'credit', 'adjustment')),
  amount numeric NOT NULL,
  currency text DEFAULT 'USD',
  description text,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 14. COACH EXPENSES
CREATE TABLE public.coach_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  category text,
  amount numeric NOT NULL,
  currency text DEFAULT 'USD',
  description text,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 15. Enhance coaches table with new fields
ALTER TABLE public.coaches 
  ADD COLUMN IF NOT EXISTS certifications text[],
  ADD COLUMN IF NOT EXISTS delivery_type text DEFAULT 'hybrid' CHECK (delivery_type IN ('in_person', 'remote', 'hybrid')),
  ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.coach_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_plan_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_gym_affiliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_expenses ENABLE ROW LEVEL SECURITY;

-- COACH SERVICES policies
CREATE POLICY "Coaches can manage own services"
  ON public.coach_services FOR ALL
  USING (EXISTS (SELECT 1 FROM coaches WHERE coaches.id = coach_services.coach_id AND coaches.user_id = auth.uid()));

CREATE POLICY "Active services are viewable"
  ON public.coach_services FOR SELECT
  USING (is_active = true);

-- COACH CLIENTS policies
CREATE POLICY "Coaches can manage own clients"
  ON public.coach_clients FOR ALL
  USING (EXISTS (SELECT 1 FROM coaches WHERE coaches.id = coach_clients.coach_id AND coaches.user_id = auth.uid()));

CREATE POLICY "Clients can view own relationship"
  ON public.coach_clients FOR SELECT
  USING (client_user_id = auth.uid());

-- COACH INVITATIONS policies
CREATE POLICY "Coaches can manage own invitations"
  ON public.coach_invitations FOR ALL
  USING (EXISTS (SELECT 1 FROM coaches WHERE coaches.id = coach_invitations.coach_id AND coaches.user_id = auth.uid()));

CREATE POLICY "Anyone can view invitation by token"
  ON public.coach_invitations FOR SELECT
  USING (status = 'pending' AND expires_at > now());

-- TRAINING PLANS policies
CREATE POLICY "Coaches can manage own plans"
  ON public.training_plans FOR ALL
  USING (EXISTS (SELECT 1 FROM coaches WHERE coaches.id = training_plans.coach_id AND coaches.user_id = auth.uid()));

CREATE POLICY "Clients can view assigned plans"
  ON public.training_plans FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM client_plan_assignments cpa
    JOIN coach_clients cc ON cc.id = cpa.client_id
    WHERE cpa.plan_id = training_plans.id AND cc.client_user_id = auth.uid()
  ));

-- PLAN WEEKS policies
CREATE POLICY "Coaches can manage plan weeks"
  ON public.plan_weeks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM training_plans tp
    JOIN coaches c ON c.id = tp.coach_id
    WHERE tp.id = plan_weeks.plan_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Clients can view assigned plan weeks"
  ON public.plan_weeks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM client_plan_assignments cpa
    JOIN coach_clients cc ON cc.id = cpa.client_id
    WHERE cpa.plan_id = plan_weeks.plan_id AND cc.client_user_id = auth.uid()
  ));

-- PLAN WORKOUTS policies
CREATE POLICY "Coaches can manage plan workouts"
  ON public.plan_workouts FOR ALL
  USING (EXISTS (
    SELECT 1 FROM plan_weeks pw
    JOIN training_plans tp ON tp.id = pw.plan_id
    JOIN coaches c ON c.id = tp.coach_id
    WHERE pw.id = plan_workouts.week_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Clients can view assigned plan workouts"
  ON public.plan_workouts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM plan_weeks pw
    JOIN client_plan_assignments cpa ON cpa.plan_id = pw.plan_id
    JOIN coach_clients cc ON cc.id = cpa.client_id
    WHERE pw.id = plan_workouts.week_id AND cc.client_user_id = auth.uid()
  ));

-- CLIENT PLAN ASSIGNMENTS policies
CREATE POLICY "Coaches can manage client assignments"
  ON public.client_plan_assignments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM coach_clients cc
    JOIN coaches c ON c.id = cc.coach_id
    WHERE cc.id = client_plan_assignments.client_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Clients can view own assignments"
  ON public.client_plan_assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM coach_clients cc
    WHERE cc.id = client_plan_assignments.client_id AND cc.client_user_id = auth.uid()
  ));

-- CHECKIN TEMPLATES policies
CREATE POLICY "Coaches can manage own templates"
  ON public.checkin_templates FOR ALL
  USING (EXISTS (SELECT 1 FROM coaches WHERE coaches.id = checkin_templates.coach_id AND coaches.user_id = auth.uid()));

-- CLIENT CHECKINS policies
CREATE POLICY "Coaches can manage client checkins"
  ON public.client_checkins FOR ALL
  USING (EXISTS (
    SELECT 1 FROM coach_clients cc
    JOIN coaches c ON c.id = cc.coach_id
    WHERE cc.id = client_checkins.client_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Clients can view own checkins"
  ON public.client_checkins FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM coach_clients cc
    WHERE cc.id = client_checkins.client_id AND cc.client_user_id = auth.uid()
  ));

CREATE POLICY "Clients can submit own checkins"
  ON public.client_checkins FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM coach_clients cc
    WHERE cc.id = client_checkins.client_id AND cc.client_user_id = auth.uid()
  ));

-- COACH APPOINTMENTS policies
CREATE POLICY "Coaches can manage own appointments"
  ON public.coach_appointments FOR ALL
  USING (EXISTS (SELECT 1 FROM coaches WHERE coaches.id = coach_appointments.coach_id AND coaches.user_id = auth.uid()));

CREATE POLICY "Clients can view own appointments"
  ON public.coach_appointments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM coach_clients cc
    WHERE cc.id = coach_appointments.client_id AND cc.client_user_id = auth.uid()
  ));

-- COACH GYM AFFILIATIONS policies
CREATE POLICY "Coaches can manage own affiliations"
  ON public.coach_gym_affiliations FOR ALL
  USING (EXISTS (SELECT 1 FROM coaches WHERE coaches.id = coach_gym_affiliations.coach_id AND coaches.user_id = auth.uid()));

CREATE POLICY "Approved affiliations are viewable"
  ON public.coach_gym_affiliations FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Gym owners can approve affiliations"
  ON public.coach_gym_affiliations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM gyms WHERE gyms.id = coach_gym_affiliations.gym_id AND gyms.owner_id = auth.uid()));

-- COACH INVOICES policies
CREATE POLICY "Coaches can manage own invoices"
  ON public.coach_invoices FOR ALL
  USING (EXISTS (SELECT 1 FROM coaches WHERE coaches.id = coach_invoices.coach_id AND coaches.user_id = auth.uid()));

CREATE POLICY "Clients can view own invoices"
  ON public.coach_invoices FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM coach_clients cc
    WHERE cc.id = coach_invoices.client_id AND cc.client_user_id = auth.uid()
  ));

-- COACH TRANSACTIONS policies
CREATE POLICY "Coaches can manage own transactions"
  ON public.coach_transactions FOR ALL
  USING (EXISTS (SELECT 1 FROM coaches WHERE coaches.id = coach_transactions.coach_id AND coaches.user_id = auth.uid()));

-- COACH EXPENSES policies
CREATE POLICY "Coaches can manage own expenses"
  ON public.coach_expenses FOR ALL
  USING (EXISTS (SELECT 1 FROM coaches WHERE coaches.id = coach_expenses.coach_id AND coaches.user_id = auth.uid()));

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if user is a coach
CREATE OR REPLACE FUNCTION public.is_coach(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM coaches WHERE user_id = _user_id
  )
$$;

-- Function to get coach_id for a user
CREATE OR REPLACE FUNCTION public.get_coach_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM coaches WHERE user_id = _user_id LIMIT 1
$$;

-- Add coach role for users who have a coach record
CREATE OR REPLACE FUNCTION public.ensure_coach_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add coach role when coach record is created
  INSERT INTO user_roles (user_id, role, scope_type, scope_id)
  VALUES (NEW.user_id, 'coach', 'global', NULL)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_coach_created
  AFTER INSERT ON public.coaches
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_coach_role();

-- Add coach_client role when client relationship is created
CREATE OR REPLACE FUNCTION public.ensure_coach_client_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add coach_client role
  INSERT INTO user_roles (user_id, role, scope_type, scope_id)
  VALUES (NEW.client_user_id, 'coach_client', 'global', NEW.coach_id::text)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_coach_client_created
  AFTER INSERT ON public.coach_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_coach_client_role();

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION public.update_coach_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply timestamp triggers
CREATE TRIGGER update_coach_services_updated_at
  BEFORE UPDATE ON public.coach_services
  FOR EACH ROW EXECUTE FUNCTION public.update_coach_updated_at();

CREATE TRIGGER update_coach_clients_updated_at
  BEFORE UPDATE ON public.coach_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_coach_updated_at();

CREATE TRIGGER update_training_plans_updated_at
  BEFORE UPDATE ON public.training_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_coach_updated_at();

CREATE TRIGGER update_checkin_templates_updated_at
  BEFORE UPDATE ON public.checkin_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_coach_updated_at();

CREATE TRIGGER update_coach_appointments_updated_at
  BEFORE UPDATE ON public.coach_appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_coach_updated_at();

CREATE TRIGGER update_coach_invoices_updated_at
  BEFORE UPDATE ON public.coach_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_coach_updated_at();

CREATE TRIGGER update_coach_expenses_updated_at
  BEFORE UPDATE ON public.coach_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_coach_updated_at();

-- Indexes for performance
CREATE INDEX idx_coach_services_coach ON public.coach_services(coach_id);
CREATE INDEX idx_coach_clients_coach ON public.coach_clients(coach_id);
CREATE INDEX idx_coach_clients_user ON public.coach_clients(client_user_id);
CREATE INDEX idx_coach_invitations_token ON public.coach_invitations(token);
CREATE INDEX idx_training_plans_coach ON public.training_plans(coach_id);
CREATE INDEX idx_plan_weeks_plan ON public.plan_weeks(plan_id);
CREATE INDEX idx_plan_workouts_week ON public.plan_workouts(week_id);
CREATE INDEX idx_client_plan_assignments_client ON public.client_plan_assignments(client_id);
CREATE INDEX idx_client_plan_assignments_plan ON public.client_plan_assignments(plan_id);
CREATE INDEX idx_checkin_templates_coach ON public.checkin_templates(coach_id);
CREATE INDEX idx_client_checkins_client ON public.client_checkins(client_id);
CREATE INDEX idx_coach_appointments_coach ON public.coach_appointments(coach_id);
CREATE INDEX idx_coach_appointments_client ON public.coach_appointments(client_id);
CREATE INDEX idx_coach_appointments_start ON public.coach_appointments(start_time);
CREATE INDEX idx_coach_gym_affiliations_coach ON public.coach_gym_affiliations(coach_id);
CREATE INDEX idx_coach_gym_affiliations_gym ON public.coach_gym_affiliations(gym_id);
CREATE INDEX idx_coach_invoices_coach ON public.coach_invoices(coach_id);
CREATE INDEX idx_coach_invoices_client ON public.coach_invoices(client_id);
CREATE INDEX idx_coach_transactions_coach ON public.coach_transactions(coach_id);
CREATE INDEX idx_coach_expenses_coach ON public.coach_expenses(coach_id);