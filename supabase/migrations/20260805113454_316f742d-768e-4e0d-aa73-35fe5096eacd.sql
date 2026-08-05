CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. Private phone storage
CREATE TABLE IF NOT EXISTS public.user_private_data (
  user_id uuid PRIMARY KEY,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_private_data TO authenticated;
GRANT ALL ON public.user_private_data TO service_role;

ALTER TABLE public.user_private_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own private data" ON public.user_private_data;
CREATE POLICY "Users manage own private data"
ON public.user_private_data FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_private_data_updated_at
BEFORE UPDATE ON public.user_private_data
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.user_private_data (user_id, phone)
SELECT user_id, phone FROM public.profiles WHERE phone IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;

-- 2. Hash group invite passwords server-side
CREATE OR REPLACE FUNCTION public.hash_group_invite_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NEW.password_hash IS NOT NULL
     AND NEW.password_hash NOT LIKE '$2%'
     AND (TG_OP = 'INSERT' OR NEW.password_hash IS DISTINCT FROM OLD.password_hash) THEN
    NEW.password_hash := extensions.crypt(NEW.password_hash, extensions.gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_group_invite_password ON public.group_invites;
CREATE TRIGGER trg_hash_group_invite_password
BEFORE INSERT OR UPDATE ON public.group_invites
FOR EACH ROW EXECUTE FUNCTION public.hash_group_invite_password();

-- existing plaintext passwords become hashed
UPDATE public.group_invites
SET password_hash = extensions.crypt(password_hash, extensions.gen_salt('bf'))
WHERE password_hash IS NOT NULL AND password_hash NOT LIKE '$2%';

CREATE OR REPLACE FUNCTION public.join_group_via_invite(_token text, _password text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_invite RECORD;
  v_chat_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_invite
  FROM public.group_invites
  WHERE token = _token
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR use_count < max_uses);

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite link';
  END IF;

  IF v_invite.password_hash IS NOT NULL AND
     (_password IS NULL OR v_invite.password_hash <> extensions.crypt(_password, v_invite.password_hash)) THEN
    RAISE EXCEPTION 'Invalid password';
  END IF;

  v_chat_id := v_invite.chat_id;

  IF is_chat_participant(v_chat_id, auth.uid()) THEN
    RETURN v_chat_id;
  END IF;

  INSERT INTO public.chat_participants (chat_id, user_id, role)
  VALUES (v_chat_id, auth.uid(), 'member');

  UPDATE public.group_invites
  SET use_count = use_count + 1
  WHERE id = v_invite.id;

  RETURN v_chat_id;
END;
$function$;

-- 3. login_tokens: hashed storage, backend-only writes
UPDATE public.login_tokens
SET token = encode(extensions.digest(token, 'sha256'), 'hex')
WHERE token !~ '^[0-9a-f]{64}$';

DROP POLICY IF EXISTS "Users can manage own login tokens" ON public.login_tokens;
CREATE POLICY "Users can delete own login tokens"
ON public.login_tokens FOR DELETE TO authenticated
USING (auth.uid() = user_id);

REVOKE ALL ON public.login_tokens FROM authenticated, anon;
GRANT DELETE ON public.login_tokens TO authenticated;
GRANT ALL ON public.login_tokens TO service_role;

-- 4. reports: admins only can read
DROP POLICY IF EXISTS "Admins can view reports" ON public.reports;
CREATE POLICY "Admins can view reports"
ON public.reports FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));