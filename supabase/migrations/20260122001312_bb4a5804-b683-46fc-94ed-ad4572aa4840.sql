-- Fix infinite recursion in call_participants RLS policy
DROP POLICY IF EXISTS "Call participants can view participants in their calls" ON public.call_participants;

-- Create a helper function to check call membership without recursion
CREATE OR REPLACE FUNCTION public.is_call_member(p_call_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM calls c
    WHERE c.id = p_call_id
    AND (c.caller_id = p_user_id OR c.callee_id = p_user_id)
  );
$$;

-- Recreate policy using the helper function instead of self-referencing subquery
CREATE POLICY "Call participants can view participants in their calls"
ON public.call_participants
FOR SELECT
USING (is_call_member(call_id, auth.uid()));

-- Fix the VoIP push function authorization issue by adding caller validation
-- This will be done in the edge function code

-- Add rate limiting trigger for messages to prevent spam
CREATE OR REPLACE FUNCTION public.check_message_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  message_count INTEGER;
  last_reset TIMESTAMPTZ;
BEGIN
  -- Get or create rate limit entry
  SELECT COUNT(*) INTO message_count
  FROM messages
  WHERE sender_id = NEW.sender_id
    AND created_at > (NOW() - INTERVAL '1 minute');
  
  -- Allow max 30 messages per minute
  IF message_count >= 30 THEN
    RAISE EXCEPTION 'Rate limit exceeded: too many messages. Please wait before sending more.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for message rate limiting
DROP TRIGGER IF EXISTS message_rate_limit_trigger ON messages;
CREATE TRIGGER message_rate_limit_trigger
BEFORE INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION check_message_rate_limit();