-- Add delivery status to messages
-- is_delivered indicates if message reached the server and was saved
-- By default all messages are delivered when saved (since they're in DB)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_delivered boolean NOT NULL DEFAULT true;