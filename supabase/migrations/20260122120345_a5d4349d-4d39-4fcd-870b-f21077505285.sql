-- Fix critical security issue: One-Time Prekeys Can Be Marked as Used by Anyone
-- Drop the overly permissive UPDATE policy
DROP POLICY IF EXISTS "Users can consume one-time prekeys" ON public.e2ee_one_time_prekeys;

-- Create a more restrictive policy that only allows marking keys as used 
-- when the user is in a chat with the key owner
CREATE POLICY "Users can consume one-time prekeys in valid key exchange"
ON public.e2ee_one_time_prekeys
FOR UPDATE
USING (
  -- User can only update their own prekeys OR
  -- User is in a chat with the prekey owner (valid key exchange scenario)
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM chat_participants cp1
    JOIN chat_participants cp2 ON cp1.chat_id = cp2.chat_id
    WHERE cp1.user_id = auth.uid() 
    AND cp2.user_id = e2ee_one_time_prekeys.user_id
    AND cp1.user_id != cp2.user_id
  )
)
WITH CHECK (used = true);

-- Fix group_invites: restrict SELECT to only show invites for token lookup, not full enumeration
DROP POLICY IF EXISTS "Anyone can view non-revoked invites by token" ON public.group_invites;

-- Only allow viewing invite by exact token match (requires RPC for actual lookup)
-- For now, restrict to chat participants only for enumeration
CREATE POLICY "Chat participants can view their group invites"
ON public.group_invites
FOR SELECT
USING (
  is_chat_participant(chat_id, auth.uid())
);