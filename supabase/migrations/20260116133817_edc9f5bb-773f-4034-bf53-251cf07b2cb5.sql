-- Create the missing trigger that automatically adds context-based participants
-- The function add_default_conversation_participants already exists
DROP TRIGGER IF EXISTS add_default_conversation_participants ON public.conversations;

CREATE TRIGGER add_default_conversation_participants
  AFTER INSERT ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.add_default_conversation_participants();