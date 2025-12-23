-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view own profile and chat partners" ON public.profiles;

-- Create policy that allows authenticated users to view all profiles
-- This is necessary for the user search/discovery feature in a messenger app
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);