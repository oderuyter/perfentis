-- Add unique constraint for PR upsert operations
ALTER TABLE public.personal_records
ADD CONSTRAINT personal_records_user_exercise_type_unique 
UNIQUE (user_id, exercise_id, record_type);