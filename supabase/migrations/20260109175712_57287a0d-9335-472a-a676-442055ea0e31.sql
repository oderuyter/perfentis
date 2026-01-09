-- Fix the log_audit_event function search_path 
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action TEXT,
  _message TEXT,
  _category TEXT DEFAULT 'admin',
  _severity TEXT DEFAULT 'info',
  _entity_type TEXT DEFAULT NULL,
  _entity_id TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (action, message, category, severity, entity_type, entity_id, metadata, actor_id)
  VALUES (_action, _message, _category, _severity, _entity_type, _entity_id, _metadata, auth.uid())
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;