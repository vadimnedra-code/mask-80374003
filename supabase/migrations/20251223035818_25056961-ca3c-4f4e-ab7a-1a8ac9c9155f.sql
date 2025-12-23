-- Add created_by column to chats table
ALTER TABLE public.chats 
ADD COLUMN created_by uuid REFERENCES auth.users(id);

-- Set created_by for existing chats (if any)
-- This won't affect anything since we have no chats yet

-- Update INSERT policy to set created_by automatically
DROP POLICY IF EXISTS "Authenticated users can create chats" ON public.chats;

CREATE POLICY "Authenticated users can create chats"
ON public.chats
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

-- Update SELECT policy to allow creator to see newly created chat
DROP POLICY IF EXISTS "Users can view chats they participate in" ON public.chats;

CREATE POLICY "Users can view chats they participate in"
ON public.chats
FOR SELECT
USING (
  auth.uid() = created_by 
  OR EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.chat_id = chats.id 
    AND chat_participants.user_id = auth.uid()
  )
);