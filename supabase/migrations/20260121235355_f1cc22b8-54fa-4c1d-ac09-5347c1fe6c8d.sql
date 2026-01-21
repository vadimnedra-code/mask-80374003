-- Create table for custom contact nicknames
CREATE TABLE public.contact_nicknames (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_user_id UUID NOT NULL,
  nickname TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, contact_user_id)
);

-- Enable RLS
ALTER TABLE public.contact_nicknames ENABLE ROW LEVEL SECURITY;

-- Users can manage their own nicknames
CREATE POLICY "Users can manage their own nicknames"
ON public.contact_nicknames
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_nicknames;