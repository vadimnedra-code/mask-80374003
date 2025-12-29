-- Create message_reactions table
CREATE TABLE public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Users can view reactions on messages in their chats
CREATE POLICY "Users can view reactions in their chats"
ON public.message_reactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.chat_participants cp ON cp.chat_id = m.chat_id
    WHERE m.id = message_reactions.message_id
    AND cp.user_id = auth.uid()
  )
);

-- Users can add reactions to messages in their chats
CREATE POLICY "Users can add reactions"
ON public.message_reactions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.chat_participants cp ON cp.chat_id = m.chat_id
    WHERE m.id = message_reactions.message_id
    AND cp.user_id = auth.uid()
  )
);

-- Users can remove their own reactions
CREATE POLICY "Users can remove their reactions"
ON public.message_reactions
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;