-- Add pinned_at column to chat_participants to track when a chat was pinned by user
ALTER TABLE public.chat_participants 
ADD COLUMN pinned_at timestamp with time zone DEFAULT NULL;

-- Create index for faster sorting of pinned chats
CREATE INDEX idx_chat_participants_pinned ON public.chat_participants(user_id, pinned_at DESC NULLS LAST);