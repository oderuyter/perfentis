-- Add meeting_link column to coach_appointments for video call links
ALTER TABLE public.coach_appointments 
ADD COLUMN IF NOT EXISTS meeting_link text;

-- Add comment for documentation
COMMENT ON COLUMN public.coach_appointments.meeting_link IS 'External video meeting URL (Zoom, Meet, Teams, etc.)';