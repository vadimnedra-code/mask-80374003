-- Fix storage policies to use authenticated only (not public role)
DROP POLICY IF EXISTS "Chat participants can view media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own chat media" ON storage.objects;

-- Recreate storage policies properly with authenticated role
CREATE POLICY "Authenticated users can view chat media"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'chat-media');

CREATE POLICY "Authenticated users can upload their chat media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'chat-media' AND 
    (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own chat media files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'chat-media' AND 
    (auth.uid())::text = (storage.foldername(name))[1]
);

-- Create rate limiting table for edge functions
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address text NOT NULL,
    endpoint text NOT NULL,
    request_count integer NOT NULL DEFAULT 1,
    window_start timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_endpoint ON public.rate_limits(ip_address, endpoint, window_start);

-- Enable RLS but allow edge functions (service role) to manage
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No user policies - only service role can access
-- This is intentional for security