-- Create a security definer function to check chat participation (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_chat_participant(_chat_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_id = _chat_id AND user_id = _user_id
  )
$$;

-- Create a function to check if a chat has any participants
CREATE OR REPLACE FUNCTION public.chat_has_participants(_chat_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_id = _chat_id
  )
$$;

-- Drop old policies that cause recursion
DROP POLICY IF EXISTS "Users can view their chat participations" ON public.chat_participants;
DROP POLICY IF EXISTS "Authenticated users can join chats" ON public.chat_participants;

-- Create new SELECT policy - simple check, no recursion
CREATE POLICY "Users can view their chat participations"
ON public.chat_participants FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create new INSERT policy:
-- 1. User can add themselves to a new chat (no participants yet - they're creating it)
-- 2. Existing participant can add others (invite functionality)
CREATE POLICY "Users can be added to chats properly"
ON public.chat_participants FOR INSERT
TO authenticated
WITH CHECK (
  -- Adding yourself to a brand new chat (you're creating it)
  (user_id = auth.uid() AND NOT public.chat_has_participants(chat_id))
  OR
  -- An existing participant is adding someone
  public.is_chat_participant(chat_id, auth.uid())
);