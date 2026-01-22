-- Make chat-media bucket private to prevent unauthorized access
UPDATE storage.buckets 
SET public = false 
WHERE id = 'chat-media';

-- Drop old overly permissive policy
DROP POLICY IF EXISTS "Anyone can view chat media" ON storage.objects;

-- Create proper participant-based access policy for viewing
CREATE POLICY "Chat participants can view media"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-media' 
  AND auth.uid() IS NOT NULL
  AND (
    -- Allow users to view their own uploads
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Allow viewing media in chats the user is part of
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.chat_participants cp ON cp.chat_id = m.chat_id
      WHERE m.media_url LIKE '%' || name
      AND cp.user_id = auth.uid()
    )
  )
);