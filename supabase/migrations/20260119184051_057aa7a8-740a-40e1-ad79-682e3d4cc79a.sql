
-- Add RLS policies for login_tokens table
CREATE POLICY "Users can manage own login tokens"
  ON public.login_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add RLS policies for rate_limits table (service-only, no user access)
CREATE POLICY "Service role only for rate limits"
  ON public.rate_limits
  FOR ALL
  USING (false)
  WITH CHECK (false);
