
-- Phone hashes for contact discovery
CREATE TABLE public.phone_hashes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  phone_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.phone_hashes ENABLE ROW LEVEL SECURITY;

-- Users can manage their own hash
CREATE POLICY "Users can manage own phone hash" ON public.phone_hashes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Authenticated users can look up hashes (needed for discovery)
CREATE POLICY "Authenticated can lookup hashes" ON public.phone_hashes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- RPC: find users by phone hashes (batch lookup)
CREATE OR REPLACE FUNCTION public.find_contacts_by_hash(_hashes text[])
RETURNS TABLE(phone_hash text, user_id uuid, display_name text, username text, avatar_url text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT ph.phone_hash, ph.user_id, pp.display_name, pp.username, pp.avatar_url
  FROM public.phone_hashes ph
  JOIN public.profiles_public pp ON pp.user_id = ph.user_id
  WHERE ph.phone_hash = ANY(_hashes)
    AND ph.user_id <> auth.uid();
END;
$$;

-- Active sessions tracking
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_name text,
  browser text,
  os text,
  ip_address text,
  is_current boolean NOT NULL DEFAULT false,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sessions" ON public.user_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
