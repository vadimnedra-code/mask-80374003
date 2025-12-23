-- Allow users to read all participants for chats they belong to
-- Existing policy is restrictive (ANDed), so we replace it.
DROP POLICY IF EXISTS "Users can view their chat participations" ON public.chat_participants;

CREATE POLICY "Users can view participants in their chats"
ON public.chat_participants
FOR SELECT
USING (
  public.is_chat_participant(chat_id, auth.uid())
);