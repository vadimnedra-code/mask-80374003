-- Drop overly permissive SELECT policies on E2EE tables
DROP POLICY IF EXISTS "Users can view other identity keys" ON public.e2ee_identity_keys;
DROP POLICY IF EXISTS "Users can view other signed prekeys" ON public.e2ee_signed_prekeys;
DROP POLICY IF EXISTS "Users can view unused one-time prekeys" ON public.e2ee_one_time_prekeys;
DROP POLICY IF EXISTS "Users can view prekey bundles" ON public.e2ee_prekey_bundles;

-- Create restrictive policies that require authentication
CREATE POLICY "Authenticated users can view identity keys for key exchange" 
ON public.e2ee_identity_keys 
FOR SELECT 
TO authenticated
USING (
  -- Can view own keys
  auth.uid() = user_id 
  OR 
  -- Or keys of users in shared chats (for E2EE key exchange)
  EXISTS (
    SELECT 1 FROM public.chat_participants cp1
    JOIN public.chat_participants cp2 ON cp1.chat_id = cp2.chat_id
    WHERE cp1.user_id = auth.uid() 
    AND cp2.user_id = e2ee_identity_keys.user_id
    AND cp1.user_id <> cp2.user_id
  )
);

CREATE POLICY "Authenticated users can view signed prekeys for key exchange" 
ON public.e2ee_signed_prekeys 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.chat_participants cp1
    JOIN public.chat_participants cp2 ON cp1.chat_id = cp2.chat_id
    WHERE cp1.user_id = auth.uid() 
    AND cp2.user_id = e2ee_signed_prekeys.user_id
    AND cp1.user_id <> cp2.user_id
  )
);

CREATE POLICY "Authenticated users can view one-time prekeys for key exchange" 
ON public.e2ee_one_time_prekeys 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  (
    used = false AND
    EXISTS (
      SELECT 1 FROM public.chat_participants cp1
      JOIN public.chat_participants cp2 ON cp1.chat_id = cp2.chat_id
      WHERE cp1.user_id = auth.uid() 
      AND cp2.user_id = e2ee_one_time_prekeys.user_id
      AND cp1.user_id <> cp2.user_id
    )
  )
);

CREATE POLICY "Authenticated users can view prekey bundles for key exchange" 
ON public.e2ee_prekey_bundles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.chat_participants cp1
    JOIN public.chat_participants cp2 ON cp1.chat_id = cp2.chat_id
    WHERE cp1.user_id = auth.uid() 
    AND cp2.user_id = e2ee_prekey_bundles.user_id
    AND cp1.user_id <> cp2.user_id
  )
);