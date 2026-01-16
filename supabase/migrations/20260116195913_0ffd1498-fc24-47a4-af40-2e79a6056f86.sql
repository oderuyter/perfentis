-- Fix RLS policies for crm_tasks - replace FOR ALL with separate policies
DROP POLICY IF EXISTS "Users can manage tasks for leads they can access" ON public.crm_tasks;

-- SELECT policy for crm_tasks
CREATE POLICY "Users can view tasks for accessible leads" 
ON public.crm_tasks 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.crm_leads l
    WHERE l.id = crm_tasks.lead_id
    AND public.user_has_crm_access(l.context_type, l.context_id)
  )
);

-- INSERT policy for crm_tasks  
CREATE POLICY "Users can create tasks for accessible leads" 
ON public.crm_tasks 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.crm_leads l
    WHERE l.id = crm_tasks.lead_id
    AND public.user_has_crm_access(l.context_type, l.context_id)
  )
);

-- UPDATE policy for crm_tasks
CREATE POLICY "Users can update tasks for accessible leads" 
ON public.crm_tasks 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.crm_leads l
    WHERE l.id = crm_tasks.lead_id
    AND public.user_has_crm_access(l.context_type, l.context_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.crm_leads l
    WHERE l.id = crm_tasks.lead_id
    AND public.user_has_crm_access(l.context_type, l.context_id)
  )
);

-- DELETE policy for crm_tasks
CREATE POLICY "Users can delete tasks for accessible leads" 
ON public.crm_tasks 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.crm_leads l
    WHERE l.id = crm_tasks.lead_id
    AND public.user_has_crm_access(l.context_type, l.context_id)
  )
);

-- Fix RLS policies for crm_lead_activities - add UPDATE policy
CREATE POLICY "Users can update activities for accessible leads" 
ON public.crm_lead_activities 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.crm_leads l
    WHERE l.id = crm_lead_activities.lead_id
    AND public.user_has_crm_access(l.context_type, l.context_id)
  )
);

-- Fix RLS policies for crm_lead_notes - add UPDATE and DELETE policies
CREATE POLICY "Users can update notes for accessible leads" 
ON public.crm_lead_notes 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.crm_leads l
    WHERE l.id = crm_lead_notes.lead_id
    AND public.user_has_crm_access(l.context_type, l.context_id)
  )
);

CREATE POLICY "Users can delete notes for accessible leads" 
ON public.crm_lead_notes 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.crm_leads l
    WHERE l.id = crm_lead_notes.lead_id
    AND public.user_has_crm_access(l.context_type, l.context_id)
  )
);