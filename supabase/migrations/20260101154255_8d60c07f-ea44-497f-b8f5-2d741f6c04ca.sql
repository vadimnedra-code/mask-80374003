-- Create or replace the trigger for syncing profiles to profiles_public
DROP TRIGGER IF EXISTS on_profile_changed ON public.profiles;

CREATE TRIGGER on_profile_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profiles_public();