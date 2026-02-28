
-- 1. Rename ip_address to ip_hash in user_sessions
ALTER TABLE public.user_sessions RENAME COLUMN ip_address TO ip_hash;

-- 2. Create rotating_salt table for IP hashing
CREATE TABLE IF NOT EXISTS public.ip_rotating_salt (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salt text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Insert initial salt
INSERT INTO public.ip_rotating_salt (salt) VALUES (encode(gen_random_bytes(32), 'hex'));

-- Enable RLS
ALTER TABLE public.ip_rotating_salt ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read current salt (for client-side hashing)
CREATE POLICY "Authenticated can read current salt"
  ON public.ip_rotating_salt FOR SELECT
  USING (auth.uid() IS NOT NULL AND expires_at > now());

-- 3. Round last_seen to nearest hour via trigger on profiles
CREATE OR REPLACE FUNCTION public.round_last_seen()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.last_seen IS NOT NULL THEN
    NEW.last_seen := date_trunc('hour', NEW.last_seen);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_round_last_seen
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.round_last_seen();

-- 4. Add rate limiting function for search (max 10 searches per minute per user)
CREATE OR REPLACE FUNCTION public.check_search_rate_limit(_user_id uuid)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  recent_count integer;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.rate_limits
  WHERE ip_address = _user_id::text
    AND endpoint = 'search'
    AND window_start > (now() - interval '1 minute');
  
  IF recent_count >= 10 THEN
    RETURN false;
  END IF;
  
  INSERT INTO public.rate_limits (ip_address, endpoint, request_count)
  VALUES (_user_id::text, 'search', 1);
  
  RETURN true;
END;
$$;

-- 5. Cron cleanup function for expired salts
CREATE OR REPLACE FUNCTION public.cleanup_expired_salts()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  -- Delete expired salts (keep at least 1)
  DELETE FROM public.ip_rotating_salt
  WHERE expires_at < now()
    AND id NOT IN (
      SELECT id FROM public.ip_rotating_salt
      ORDER BY created_at DESC LIMIT 1
    );
  
  -- Create new salt if current one is expired
  IF NOT EXISTS (SELECT 1 FROM public.ip_rotating_salt WHERE expires_at > now()) THEN
    INSERT INTO public.ip_rotating_salt (salt) VALUES (encode(gen_random_bytes(32), 'hex'));
  END IF;
END;
$$;
