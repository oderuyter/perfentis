-- Add structured address fields and differentiate contact vs owner email
ALTER TABLE public.gyms
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS owner_email text,
ADD COLUMN IF NOT EXISTS address_line1 text,
ADD COLUMN IF NOT EXISTS address_line2 text,
ADD COLUMN IF NOT EXISTS address_city text,
ADD COLUMN IF NOT EXISTS address_postcode text,
ADD COLUMN IF NOT EXISTS address_country text;

-- Copy existing email to contact_email for existing gyms
UPDATE public.gyms SET contact_email = email WHERE contact_email IS NULL AND email IS NOT NULL;
UPDATE public.gyms SET address_line1 = address WHERE address_line1 IS NULL AND address IS NOT NULL;