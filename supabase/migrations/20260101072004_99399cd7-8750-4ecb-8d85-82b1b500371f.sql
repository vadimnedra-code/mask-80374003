-- Add privacy settings to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_last_seen boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS show_online_status boolean NOT NULL DEFAULT true;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_privacy ON public.profiles(show_last_seen, show_online_status);

-- Update profiles_public to include privacy settings (for sync)
ALTER TABLE public.profiles_public
ADD COLUMN IF NOT EXISTS show_last_seen boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_online_status boolean DEFAULT true;

-- Update sync function to include privacy settings
CREATE OR REPLACE FUNCTION public.sync_profiles_public()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    bio,
    show_last_seen,
    show_online_status
  ) VALUES (
    NEW.user_id,
    NEW.username,
    NEW.display_name,
    NEW.avatar_url,
    CASE WHEN NEW.show_online_status THEN NEW.status ELSE 'offline' END,
    CASE WHEN NEW.show_last_seen THEN NEW.last_seen ELSE NULL END,
    NEW.bio,
    NEW.show_last_seen,
    NEW.show_online_status
  )
  ON CONFLICT (user_id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url,
    status = CASE WHEN NEW.show_online_status THEN NEW.status ELSE 'offline' END,
    last_seen = CASE WHEN NEW.show_last_seen THEN NEW.last_seen ELSE NULL END,
    bio = EXCLUDED.bio,
    show_last_seen = EXCLUDED.show_last_seen,
    show_online_status = EXCLUDED.show_online_status,
    updated_at = now();

  RETURN NEW;
END;
$function$;