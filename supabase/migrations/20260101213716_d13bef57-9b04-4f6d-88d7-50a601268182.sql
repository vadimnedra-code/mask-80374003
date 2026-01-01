-- =============================================
-- CRITICAL SECURITY FIX: login_tokens policies
-- =============================================

-- Drop dangerous policies that allow public/anon access
DROP POLICY IF EXISTS "Service role can manage tokens" ON public.login_tokens;
DROP POLICY IF EXISTS "Users can read own tokens" ON public.login_tokens;

-- Create secure policies - only service role via edge functions should manage tokens
-- No direct user access to tokens table at all
CREATE POLICY "No direct user access to tokens"
ON public.login_tokens
FOR SELECT
TO authenticated
USING (false);

-- =============================================
-- FIX: Update all public role policies to authenticated
-- =============================================

-- blocked_users
DROP POLICY IF EXISTS "Users can block others" ON public.blocked_users;
DROP POLICY IF EXISTS "Users can unblock others" ON public.blocked_users;
DROP POLICY IF EXISTS "Users can view their blocks" ON public.blocked_users;

CREATE POLICY "Users can block others"
ON public.blocked_users
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = blocker_id) AND (auth.uid() <> blocked_id));

CREATE POLICY "Users can unblock others"
ON public.blocked_users
FOR DELETE
TO authenticated
USING (auth.uid() = blocker_id);

CREATE POLICY "Users can view their blocks"
ON public.blocked_users
FOR SELECT
TO authenticated
USING (auth.uid() = blocker_id);

-- calls
DROP POLICY IF EXISTS "Users can create calls" ON public.calls;
DROP POLICY IF EXISTS "Users can update calls they are part of" ON public.calls;
DROP POLICY IF EXISTS "Users can view calls they are part of" ON public.calls;

CREATE POLICY "Users can create calls"
ON public.calls
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can update calls they are part of"
ON public.calls
FOR UPDATE
TO authenticated
USING ((auth.uid() = caller_id) OR (auth.uid() = callee_id));

CREATE POLICY "Users can view calls they are part of"
ON public.calls
FOR SELECT
TO authenticated
USING ((auth.uid() = caller_id) OR (auth.uid() = callee_id));

-- chat_participants (already has authenticated on insert, fix others)
DROP POLICY IF EXISTS "Users can leave chats" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can view participants in their chats" ON public.chat_participants;

CREATE POLICY "Users can leave chats"
ON public.chat_participants
FOR DELETE
TO authenticated
USING ((user_id = auth.uid()) OR is_chat_participant(chat_id, auth.uid()));

CREATE POLICY "Users can update their own participation"
ON public.chat_participants
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can view participants in their chats"
ON public.chat_participants
FOR SELECT
TO authenticated
USING (is_chat_participant(chat_id, auth.uid()));

-- chats
DROP POLICY IF EXISTS "Authenticated users can create chats" ON public.chats;
DROP POLICY IF EXISTS "Chat participants can delete chat" ON public.chats;
DROP POLICY IF EXISTS "Chat participants can update chat" ON public.chats;
DROP POLICY IF EXISTS "Users can view chats they participate in" ON public.chats;

CREATE POLICY "Authenticated users can create chats"
ON public.chats
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() IS NOT NULL) AND (auth.uid() = created_by));

CREATE POLICY "Chat participants can delete chat"
ON public.chats
FOR DELETE
TO authenticated
USING (EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.chat_id = chats.id 
    AND chat_participants.user_id = auth.uid()
));

CREATE POLICY "Chat participants can update chat"
ON public.chats
FOR UPDATE
TO authenticated
USING (EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.chat_id = chats.id 
    AND chat_participants.user_id = auth.uid()
));

CREATE POLICY "Users can view chats they participate in"
ON public.chats
FOR SELECT
TO authenticated
USING ((auth.uid() = created_by) OR EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.chat_id = chats.id 
    AND chat_participants.user_id = auth.uid()
));

-- =============================================
-- FIX: Storage - make chat-media private
-- =============================================

DROP POLICY IF EXISTS "Anyone can view chat media" ON storage.objects;

CREATE POLICY "Chat participants can view media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'chat-media' AND 
    auth.uid() IS NOT NULL
);

-- Update upload policy to authenticated only
DROP POLICY IF EXISTS "Authenticated users can upload chat media" ON storage.objects;

CREATE POLICY "Authenticated users can upload chat media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'chat-media' AND 
    auth.uid() IS NOT NULL AND
    (auth.uid())::text = (storage.foldername(name))[1]
);

-- Update delete policy to authenticated only  
DROP POLICY IF EXISTS "Users can delete their own chat media" ON storage.objects;

CREATE POLICY "Users can delete their own chat media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'chat-media' AND 
    (auth.uid())::text = (storage.foldername(name))[1]
);