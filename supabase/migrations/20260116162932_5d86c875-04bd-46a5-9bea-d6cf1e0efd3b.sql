-- Create task templates table for CRM
CREATE TABLE public.crm_task_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  context_type TEXT NOT NULL,
  context_id UUID NOT NULL,
  name TEXT NOT NULL,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_task_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for task templates
CREATE POLICY "Users can view task templates for their contexts" 
ON public.crm_task_templates 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert task templates" 
ON public.crm_task_templates 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update task templates" 
ON public.crm_task_templates 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete task templates" 
ON public.crm_task_templates 
FOR DELETE 
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_crm_task_templates_context ON public.crm_task_templates(context_type, context_id);

-- Add trigger for updated_at
CREATE TRIGGER update_crm_task_templates_updated_at
BEFORE UPDATE ON public.crm_task_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();