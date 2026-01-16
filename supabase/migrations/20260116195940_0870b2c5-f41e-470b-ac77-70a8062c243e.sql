-- Create custom fields system for CRM

-- Table: crm_custom_fields - defines field schema per context
CREATE TABLE public.crm_custom_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  context_type TEXT NOT NULL CHECK (context_type IN ('gym', 'coach', 'event')),
  context_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'dropdown', 'date', 'checkbox')),
  field_options JSONB DEFAULT '[]'::jsonb, -- For dropdown: array of {label, value} objects
  display_order INTEGER NOT NULL DEFAULT 0,
  show_on_card BOOLEAN NOT NULL DEFAULT false,
  show_on_overview BOOLEAN NOT NULL DEFAULT true,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: crm_custom_field_values - stores values per lead
CREATE TABLE public.crm_custom_field_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_id UUID NOT NULL REFERENCES public.crm_custom_fields(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  value_text TEXT,
  value_number NUMERIC,
  value_date DATE,
  value_boolean BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(field_id, lead_id)
);

-- Indexes for performance
CREATE INDEX idx_crm_custom_fields_context ON public.crm_custom_fields(context_type, context_id);
CREATE INDEX idx_crm_custom_fields_active ON public.crm_custom_fields(is_active) WHERE is_active = true;
CREATE INDEX idx_crm_custom_field_values_lead ON public.crm_custom_field_values(lead_id);
CREATE INDEX idx_crm_custom_field_values_field ON public.crm_custom_field_values(field_id);

-- Enable RLS
ALTER TABLE public.crm_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_custom_field_values ENABLE ROW LEVEL SECURITY;

-- RLS policies for crm_custom_fields
CREATE POLICY "Users can view custom fields for accessible contexts" 
ON public.crm_custom_fields 
FOR SELECT 
USING (public.user_has_crm_access(context_type, context_id));

CREATE POLICY "Users can create custom fields for accessible contexts" 
ON public.crm_custom_fields 
FOR INSERT 
WITH CHECK (public.user_has_crm_access(context_type, context_id));

CREATE POLICY "Users can update custom fields for accessible contexts" 
ON public.crm_custom_fields 
FOR UPDATE 
USING (public.user_has_crm_access(context_type, context_id))
WITH CHECK (public.user_has_crm_access(context_type, context_id));

CREATE POLICY "Users can delete custom fields for accessible contexts" 
ON public.crm_custom_fields 
FOR DELETE 
USING (public.user_has_crm_access(context_type, context_id));

-- RLS policies for crm_custom_field_values
CREATE POLICY "Users can view field values for accessible leads" 
ON public.crm_custom_field_values 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.crm_leads l
    WHERE l.id = crm_custom_field_values.lead_id
    AND public.user_has_crm_access(l.context_type, l.context_id)
  )
);

CREATE POLICY "Users can create field values for accessible leads" 
ON public.crm_custom_field_values 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.crm_leads l
    WHERE l.id = crm_custom_field_values.lead_id
    AND public.user_has_crm_access(l.context_type, l.context_id)
  )
);

CREATE POLICY "Users can update field values for accessible leads" 
ON public.crm_custom_field_values 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.crm_leads l
    WHERE l.id = crm_custom_field_values.lead_id
    AND public.user_has_crm_access(l.context_type, l.context_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.crm_leads l
    WHERE l.id = crm_custom_field_values.lead_id
    AND public.user_has_crm_access(l.context_type, l.context_id)
  )
);

CREATE POLICY "Users can delete field values for accessible leads" 
ON public.crm_custom_field_values 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.crm_leads l
    WHERE l.id = crm_custom_field_values.lead_id
    AND public.user_has_crm_access(l.context_type, l.context_id)
  )
);

-- Trigger for updated_at on custom_fields
CREATE TRIGGER update_crm_custom_fields_updated_at
BEFORE UPDATE ON public.crm_custom_fields
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on custom_field_values
CREATE TRIGGER update_crm_custom_field_values_updated_at
BEFORE UPDATE ON public.crm_custom_field_values
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();