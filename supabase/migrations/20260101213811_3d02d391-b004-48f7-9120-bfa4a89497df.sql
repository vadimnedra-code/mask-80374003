-- =============================================
-- FIX REMAINING POLICIES: Update to authenticated role only
-- =============================================

-- message_reactions
DROP POLICY IF EXISTS "Users can view reactions in their chats" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can remove their reactions" ON public.message_reactions;

CREATE POLICY "Users can view reactions in their chats"
ON public.message_reactions
FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1 FROM messages m
    JOIN chat_participants cp ON cp.chat_id = m.chat_id
    WHERE m.id = message_reactions.message_id AND cp.user_id = auth.uid()
));

CREATE POLICY "Users can add reactions"
ON public.message_reactions
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = user_id) AND EXISTS (
    SELECT 1 FROM messages m
    JOIN chat_participants cp ON cp.chat_id = m.chat_id
    WHERE m.id = message_reactions.message_id AND cp.user_id = auth.uid()
));

CREATE POLICY "Users can remove their reactions"
ON public.message_reactions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- messages
DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their chats" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;

CREATE POLICY "Users can view messages in their chats"
ON public.messages
FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.chat_id = messages.chat_id 
    AND chat_participants.user_id = auth.uid()
));

CREATE POLICY "Users can send messages to their chats"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK ((sender_id = auth.uid()) AND EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.chat_id = messages.chat_id 
    AND chat_participants.user_id = auth.uid()
));

CREATE POLICY "Users can update their own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (sender_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
ON public.messages
FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

-- profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- profiles_public
DROP POLICY IF EXISTS "Authenticated users can view all public profiles" ON public.profiles_public;
DROP POLICY IF EXISTS "Users can update their own public profile" ON public.profiles_public;
DROP POLICY IF EXISTS "Users can insert their own public profile" ON public.profiles_public;

CREATE POLICY "Authenticated users can view all public profiles"
ON public.profiles_public
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own public profile"
ON public.profiles_public
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own public profile"
ON public.profiles_public
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- push_subscriptions
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON public.push_subscriptions;

CREATE POLICY "Users can manage their own subscriptions"
ON public.push_subscriptions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- typing_status
DROP POLICY IF EXISTS "Users can see typing status in their chats" ON public.typing_status;
DROP POLICY IF EXISTS "Users can update their own typing status" ON public.typing_status;
DROP POLICY IF EXISTS "Users can update typing status" ON public.typing_status;
DROP POLICY IF EXISTS "Users can delete their typing status" ON public.typing_status;

CREATE POLICY "Users can see typing status in their chats"
ON public.typing_status
FOR SELECT
TO authenticated
USING (is_chat_participant(chat_id, auth.uid()));

CREATE POLICY "Users can insert typing status"
ON public.typing_status
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = user_id) AND is_chat_participant(chat_id, auth.uid()));

CREATE POLICY "Users can update typing status"
ON public.typing_status
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their typing status"
ON public.typing_status
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- voip_tokens
DROP POLICY IF EXISTS "Users can view their own voip tokens" ON public.voip_tokens;
DROP POLICY IF EXISTS "Users can insert their own voip tokens" ON public.voip_tokens;
DROP POLICY IF EXISTS "Users can update their own voip tokens" ON public.voip_tokens;
DROP POLICY IF EXISTS "Users can delete their own voip tokens" ON public.voip_tokens;

CREATE POLICY "Users can view their own voip tokens"
ON public.voip_tokens
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own voip tokens"
ON public.voip_tokens
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voip tokens"
ON public.voip_tokens
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voip tokens"
ON public.voip_tokens
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- login_tokens - remove the old policy and keep it completely locked
DROP POLICY IF EXISTS "No direct user access to tokens" ON public.login_tokens;

-- Only service role (edge functions) can access this table
-- No user-facing policy needed