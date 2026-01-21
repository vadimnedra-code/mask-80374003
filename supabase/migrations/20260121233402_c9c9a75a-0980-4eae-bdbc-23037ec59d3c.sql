
-- =============================================
-- PHASE 1: PARITY SHIELD - Database Schema
-- =============================================

-- 1. Saved/Starred Messages
CREATE TABLE IF NOT EXISTS public.saved_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, message_id)
);

ALTER TABLE public.saved_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own saved messages"
ON public.saved_messages FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Archive and Mute for chats (add to chat_participants)
ALTER TABLE public.chat_participants 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS muted_until TIMESTAMPTZ;

-- 3. Group roles
DO $$ BEGIN
  CREATE TYPE group_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.chat_participants 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';

-- 4. Group description
ALTER TABLE public.chats 
ADD COLUMN IF NOT EXISTS description TEXT;

-- 5. Disappearing messages policies
CREATE TABLE IF NOT EXISTS public.disappear_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID UNIQUE NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  ttl_seconds INTEGER, -- NULL = off, else seconds (86400=24h, 604800=7d, 7776000=90d)
  set_by UUID NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.disappear_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat participants can view disappear policies"
ON public.disappear_policies FOR SELECT
USING (is_chat_participant(chat_id, auth.uid()));

CREATE POLICY "Chat admins can manage disappear policies"
ON public.disappear_policies FOR ALL
USING (is_chat_participant(chat_id, auth.uid()))
WITH CHECK (is_chat_participant(chat_id, auth.uid()));

-- 6. Group invite links
CREATE TABLE IF NOT EXISTS public.group_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  use_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-revoked invites by token"
ON public.group_invites FOR SELECT
USING (revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Chat participants can manage invites"
ON public.group_invites FOR ALL
USING (is_chat_participant(chat_id, auth.uid()))
WITH CHECK (is_chat_participant(chat_id, auth.uid()));

-- 7. Locked chats (per user)
CREATE TABLE IF NOT EXISTS public.locked_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  locked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, chat_id)
);

ALTER TABLE public.locked_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own locked chats"
ON public.locked_chats FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 8. User reports (anonymous)
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
  -- NO reporter_id for anonymity
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Only insert allowed, no read/update/delete for users
CREATE POLICY "Anyone can submit reports"
ON public.reports FOR INSERT
WITH CHECK (true);

-- 9. Add deleted_for_everyone flag to messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS deleted_for_everyone BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 10. Create function to clean expired messages
CREATE OR REPLACE FUNCTION public.cleanup_expired_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.messages
  WHERE expires_at IS NOT NULL AND expires_at < now();
END;
$$;

-- 11. Function to join group via invite
CREATE OR REPLACE FUNCTION public.join_group_via_invite(
  _token TEXT,
  _password TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invite RECORD;
  v_chat_id UUID;
BEGIN
  -- Find valid invite
  SELECT * INTO v_invite
  FROM public.group_invites
  WHERE token = _token
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR use_count < max_uses);
  
  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite link';
  END IF;
  
  -- Check password if set
  IF v_invite.password_hash IS NOT NULL AND 
     (v_invite.password_hash != crypt(_password, v_invite.password_hash)) THEN
    RAISE EXCEPTION 'Invalid password';
  END IF;
  
  v_chat_id := v_invite.chat_id;
  
  -- Check if already participant
  IF is_chat_participant(v_chat_id, auth.uid()) THEN
    RETURN v_chat_id;
  END IF;
  
  -- Add as member
  INSERT INTO public.chat_participants (chat_id, user_id, role)
  VALUES (v_chat_id, auth.uid(), 'member');
  
  -- Increment use count
  UPDATE public.group_invites
  SET use_count = use_count + 1
  WHERE id = v_invite.id;
  
  RETURN v_chat_id;
END;
$$;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.disappear_policies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_invites;
