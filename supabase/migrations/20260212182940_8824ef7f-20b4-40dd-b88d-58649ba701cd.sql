
-- Create helper function to check if two users share a chat
CREATE OR REPLACE FUNCTION public.shares_chat_with(_user_id uuid, _other_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM chat_participants cp1
    JOIN chat_participants cp2 ON cp1.chat_id = cp2.chat_id
    WHERE cp1.user_id = _user_id
      AND cp2.user_id = _other_user_id
      AND cp1.user_id <> cp2.user_id
  )
$$;

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view all public profiles" ON public.profiles_public;

-- New SELECT policy: own profile + shared chat participants only
CREATE POLICY "Users can view own and chat participants profiles"
ON public.profiles_public
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.shares_chat_with(auth.uid(), user_id)
);

-- Create RPC for user discovery (search by username/display_name)
-- This allows finding new users to start chats with
CREATE OR REPLACE FUNCTION public.search_users_public(_query text, _limit int DEFAULT 20)
RETURNS SETOF profiles_public
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  clean_query text;
BEGIN
  -- Sanitize and limit query
  clean_query := left(trim(_query), 50);
  
  IF length(clean_query) < 2 THEN
    RETURN;
  END IF;
  
  -- Escape wildcards
  clean_query := replace(replace(replace(clean_query, '\', '\\'), '%', '\%'), '_', '\_');
  
  RETURN QUERY
  SELECT pp.*
  FROM profiles_public pp
  WHERE pp.user_id <> auth.uid()
    AND (
      pp.display_name ILIKE '%' || clean_query || '%'
      OR pp.username ILIKE '%' || clean_query || '%'
    )
  ORDER BY 
    CASE WHEN pp.username ILIKE clean_query THEN 0
         WHEN pp.display_name ILIKE clean_query THEN 1
         ELSE 2
    END,
    pp.display_name
  LIMIT LEAST(_limit, 50);
END;
$$;
