-- Add DELETE policy for chat_participants so users can leave chats
CREATE POLICY "Users can leave chats" 
ON public.chat_participants 
FOR DELETE 
USING (user_id = auth.uid() OR is_chat_participant(chat_id, auth.uid()));

-- Create blocked_users table for private messaging
CREATE TABLE public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

-- Enable RLS on blocked_users
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Users can see their own blocks
CREATE POLICY "Users can view their blocks" 
ON public.blocked_users 
FOR SELECT 
USING (auth.uid() = blocker_id);

-- Users can block others
CREATE POLICY "Users can block others" 
ON public.blocked_users 
FOR INSERT 
WITH CHECK (auth.uid() = blocker_id AND auth.uid() != blocked_id);

-- Users can unblock others
CREATE POLICY "Users can unblock others" 
ON public.blocked_users 
FOR DELETE 
USING (auth.uid() = blocker_id);

-- Function to check if user is blocked
CREATE OR REPLACE FUNCTION public.is_user_blocked(_user_id uuid, _by_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE blocker_id = _by_user_id AND blocked_id = _user_id
  )
$$;

-- Enable realtime for blocked_users
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocked_users;