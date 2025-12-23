-- 1) Public-safe profiles table (no phone numbers)
CREATE TABLE IF NOT EXISTS public.profiles_public (
  user_id uuid PRIMARY KEY,
  username text NULL,
  display_name text NOT NULL,
  avatar_url text NULL,
  status text NULL,
  last_seen timestamptz NULL,
  bio text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles_public ENABLE ROW LEVEL SECURITY;

-- Anyone who is logged in can discover users (for "new chat" search)
DROP POLICY IF EXISTS "Authenticated users can view all public profiles" ON public.profiles_public;
CREATE POLICY "Authenticated users can view all public profiles"
ON public.profiles_public
FOR SELECT
TO authenticated
USING (true);

-- Users can manage only their own public profile row
DROP POLICY IF EXISTS "Users can insert their own public profile" ON public.profiles_public;
CREATE POLICY "Users can insert their own public profile"
ON public.profiles_public
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own public profile" ON public.profiles_public;
CREATE POLICY "Users can update their own public profile"
ON public.profiles_public
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Keep updated_at fresh
DROP TRIGGER IF EXISTS update_profiles_public_updated_at ON public.profiles_public;
CREATE TRIGGER update_profiles_public_updated_at
BEFORE UPDATE ON public.profiles_public
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Sync trigger from private profiles -> public profiles
CREATE OR REPLACE FUNCTION public.sync_profiles_public()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.profiles_public WHERE user_id = OLD.user_id;
    RETURN OLD;
  END IF;

  INSERT INTO public.profiles_public (
    user_id,
    username,
    display_name,
    avatar_url,
    status,
    last_seen,
    bio
  ) VALUES (
    NEW.user_id,
    NEW.username,
    NEW.display_name,
    NEW.avatar_url,
    NEW.status,
    NEW.last_seen,
    NEW.bio
  )
  ON CONFLICT (user_id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url,
    status = EXCLUDED.status,
    last_seen = EXCLUDED.last_seen,
    bio = EXCLUDED.bio,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_to_public ON public.profiles;
CREATE TRIGGER profiles_sync_to_public
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profiles_public();

-- Backfill existing rows
INSERT INTO public.profiles_public (user_id, username, display_name, avatar_url, status, last_seen, bio)
SELECT user_id, username, display_name, avatar_url, status, last_seen, bio
FROM public.profiles
ON CONFLICT (user_id) DO UPDATE SET
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  avatar_url = EXCLUDED.avatar_url,
  status = EXCLUDED.status,
  last_seen = EXCLUDED.last_seen,
  bio = EXCLUDED.bio,
  updated_at = now();

-- 3) Re-lock private profiles so phone numbers aren't exposed
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
