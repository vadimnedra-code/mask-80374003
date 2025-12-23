-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create a restrictive policy: users can only view their own profile OR profiles of users they share a chat with
CREATE POLICY "Users can view own profile and chat partners"
ON public.profiles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM public.chat_participants cp1
    JOIN public.chat_participants cp2 ON cp1.chat_id = cp2.chat_id
    WHERE cp1.user_id = auth.uid() 
    AND cp2.user_id = profiles.user_id
  )
);