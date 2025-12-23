CREATE POLICY "Chat participants can delete chat"
ON public.chats FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_participants.chat_id = chats.id
    AND chat_participants.user_id = auth.uid()
  )
);