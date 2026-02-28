
-- Drop the restrictive "mark as read" policy and replace with one that allows both is_read and is_delivered updates
DROP POLICY IF EXISTS "Users can mark messages as read in their chats" ON public.messages;

CREATE POLICY "Users can mark messages as delivered or read in their chats"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.chat_id = messages.chat_id
    AND chat_participants.user_id = auth.uid()
  )
  AND sender_id <> auth.uid()
)
WITH CHECK (
  (is_read = true OR is_delivered = true)
);
