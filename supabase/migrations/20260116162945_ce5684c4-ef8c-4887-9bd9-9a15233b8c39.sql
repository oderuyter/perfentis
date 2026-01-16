-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can insert task templates" ON public.crm_task_templates;
DROP POLICY IF EXISTS "Users can update task templates" ON public.crm_task_templates;
DROP POLICY IF EXISTS "Users can delete task templates" ON public.crm_task_templates;

-- Create more secure policies that require authenticated users
CREATE POLICY "Authenticated users can insert task templates" 
ON public.crm_task_templates 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update task templates" 
ON public.crm_task_templates 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete task templates" 
ON public.crm_task_templates 
FOR DELETE 
USING (auth.uid() IS NOT NULL);