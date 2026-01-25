-- ============================================
-- AI Studio Schema for MASK
-- ============================================

-- Enum for artifact types
CREATE TYPE public.artifact_type AS ENUM (
  'document', 'summary', 'presentation', 'image', 'table', 'text'
);

-- Enum for communication channels
CREATE TYPE public.comm_channel AS ENUM ('email', 'sms', 'voice');

-- Enum for communication status
CREATE TYPE public.comm_status AS ENUM ('pending', 'sent', 'delivered', 'failed');

-- ============================================
-- Files table (uploaded documents with TTL)
-- ============================================
CREATE TABLE public.studio_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  is_vault BOOLEAN NOT NULL DEFAULT false,
  ttl_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.studio_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for studio_files
CREATE POLICY "Users can manage their own files"
ON public.studio_files
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Artifacts table (generated results with TTL)
-- ============================================
CREATE TABLE public.studio_artifacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  artifact_type artifact_type NOT NULL,
  title TEXT NOT NULL,
  source_file_id UUID REFERENCES public.studio_files(id) ON DELETE SET NULL,
  storage_path TEXT,
  text_content TEXT,
  metadata JSONB DEFAULT '{}',
  is_vault BOOLEAN NOT NULL DEFAULT false,
  ttl_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.studio_artifacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for studio_artifacts
CREATE POLICY "Users can manage their own artifacts"
ON public.studio_artifacts
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Outbound messages table (email/SMS tracking)
-- ============================================
CREATE TABLE public.outbound_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  channel comm_channel NOT NULL,
  masked_to TEXT NOT NULL,
  subject TEXT,
  body_preview TEXT,
  artifact_id UUID REFERENCES public.studio_artifacts(id) ON DELETE SET NULL,
  status comm_status NOT NULL DEFAULT 'pending',
  external_id TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.outbound_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for outbound_messages
CREATE POLICY "Users can manage their own outbound messages"
ON public.outbound_messages
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Call sessions table (anonymous voice calls)
-- ============================================
CREATE TABLE public.call_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  masked_number TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'initiated',
  external_call_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for call_sessions
CREATE POLICY "Users can manage their own call sessions"
ON public.call_sessions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Extend user_ai_settings with new permissions
-- ============================================
ALTER TABLE public.user_ai_settings
ADD COLUMN IF NOT EXISTS allow_file_analysis BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_outbound_email BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_outbound_sms BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_outbound_calls BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS always_confirm_before_send BOOLEAN NOT NULL DEFAULT true;

-- ============================================
-- Storage bucket for studio files
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('studio-files', 'studio-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for studio-files bucket
CREATE POLICY "Users can upload studio files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'studio-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their studio files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'studio-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their studio files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'studio-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- Function to cleanup expired files and artifacts
-- ============================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_studio_items()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete expired files (not in vault)
  DELETE FROM public.studio_files
  WHERE is_vault = false 
    AND ttl_expires_at IS NOT NULL 
    AND ttl_expires_at < now();
  
  -- Delete expired artifacts (not in vault)
  DELETE FROM public.studio_artifacts
  WHERE is_vault = false 
    AND ttl_expires_at IS NOT NULL 
    AND ttl_expires_at < now();
END;
$$;

-- ============================================
-- Triggers for updated_at
-- ============================================
CREATE TRIGGER update_studio_files_updated_at
  BEFORE UPDATE ON public.studio_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_studio_artifacts_updated_at
  BEFORE UPDATE ON public.studio_artifacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();