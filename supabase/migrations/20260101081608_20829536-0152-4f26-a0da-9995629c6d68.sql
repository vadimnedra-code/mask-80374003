-- Create table for storing login tokens
CREATE TABLE public.login_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.login_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only read their own tokens
CREATE POLICY "Users can read own tokens"
ON public.login_tokens
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can manage all tokens (for login verification)
CREATE POLICY "Service role can manage tokens"
ON public.login_tokens
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for fast token lookup
CREATE INDEX idx_login_tokens_token ON public.login_tokens(token);