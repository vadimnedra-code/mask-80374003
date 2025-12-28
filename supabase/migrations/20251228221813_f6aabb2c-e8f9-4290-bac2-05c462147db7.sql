-- Create typing_status table for tracking who is typing
CREATE TABLE public.typing_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_typing BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

-- Enable RLS
ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;

-- Users can see typing status in their chats
CREATE POLICY "Users can see typing status in their chats"
  ON public.typing_status
  FOR SELECT
  USING (public.is_chat_participant(chat_id, auth.uid()));

-- Users can update their own typing status
CREATE POLICY "Users can update their own typing status"
  ON public.typing_status
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_chat_participant(chat_id, auth.uid()));

CREATE POLICY "Users can update typing status"
  ON public.typing_status
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their typing status"
  ON public.typing_status
  FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime for typing_status
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_status;