-- Allow chat participants to mark messages as read
CREATE POLICY "Users can mark messages as read in their chats"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.chat_id = messages.chat_id
    AND chat_participants.user_id = auth.uid()
  )
  AND sender_id != auth.uid()
)
WITH CHECK (
  -- Only allow updating is_read field to true
  is_read = true
);