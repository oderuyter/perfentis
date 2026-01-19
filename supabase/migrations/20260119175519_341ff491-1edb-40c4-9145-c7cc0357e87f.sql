-- Enable pgcrypto extension for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recreate the function to ensure it uses the extension properly
CREATE OR REPLACE FUNCTION public.generate_pass_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(extensions.gen_random_bytes(32), 'base64');
END;
$$;