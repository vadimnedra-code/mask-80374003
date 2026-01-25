-- ============================================
-- MASK AI Personal Bot - Database Schema
-- ============================================

-- Create enum for memory modes
CREATE TYPE public.ai_memory_mode AS ENUM ('none', 'local', 'cloud_encrypted');

-- Create enum for AI session modes
CREATE TYPE public.ai_session_mode AS ENUM ('chat', 'onboarding', 'incognito');

-- Create enum for AI action types
CREATE TYPE public.ai_action_type AS ENUM ('summarise', 'extract_tasks', 'draft_reply', 'translate', 'privacy_check');

-- ============================================
-- User AI Settings Table
-- ============================================
CREATE TABLE public.user_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  memory_mode ai_memory_mode NOT NULL DEFAULT 'none',
  allow_chat_analysis BOOLEAN NOT NULL DEFAULT false,
  allow_selected_chats_only BOOLEAN NOT NULL DEFAULT true,
  preferred_language TEXT DEFAULT 'ru',
  tone_style TEXT DEFAULT 'neutral',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  privacy_preset TEXT DEFAULT 'balanced', -- 'max_privacy', 'balanced', 'max_comfort'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_ai_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own AI settings"
ON public.user_ai_settings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- AI Sessions Table (for tracking conversations)
-- ============================================
CREATE TABLE public.ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  mode ai_session_mode NOT NULL DEFAULT 'chat',
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.ai_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own AI sessions"
ON public.ai_sessions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- AI Messages Table (chat history with AI)
-- ============================================
CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.ai_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own AI messages"
ON public.ai_messages
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_ai_messages_session ON public.ai_messages(session_id, created_at);

-- ============================================
-- AI Memory Items Table (cloud encrypted memory)
-- ============================================
CREATE TABLE public.ai_memory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('preference', 'note', 'template', 'fact')),
  encrypted_blob BYTEA NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_memory_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own AI memory"
ON public.ai_memory_items
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- AI Actions Log (for utility actions like summarise)
-- ============================================
CREATE TABLE public.ai_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type ai_action_type NOT NULL,
  target_chat_id UUID REFERENCES public.chats(id) ON DELETE SET NULL,
  input_metadata JSONB, -- e.g., message count, date range (NO content)
  result_summary TEXT, -- brief summary of what was done
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own AI actions"
ON public.ai_actions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- AI Permissions Table (granular control)
-- ============================================
CREATE TABLE public.ai_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  can_summarise BOOLEAN NOT NULL DEFAULT false,
  can_extract_tasks BOOLEAN NOT NULL DEFAULT false,
  can_draft_reply BOOLEAN NOT NULL DEFAULT false,
  can_translate BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own AI permissions"
ON public.ai_permissions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Unique constraint per user-chat combo
CREATE UNIQUE INDEX idx_ai_permissions_user_chat ON public.ai_permissions(user_id, chat_id);

-- ============================================
-- Triggers for updated_at
-- ============================================
CREATE TRIGGER update_user_ai_settings_updated_at
  BEFORE UPDATE ON public.user_ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_memory_items_updated_at
  BEFORE UPDATE ON public.ai_memory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Function to check if user has completed onboarding
-- ============================================
CREATE OR REPLACE FUNCTION public.has_completed_ai_onboarding(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT onboarding_completed FROM public.user_ai_settings WHERE user_id = _user_id),
    false
  )
$$;

-- ============================================
-- Function to initialize AI settings for new user
-- ============================================
CREATE OR REPLACE FUNCTION public.initialize_ai_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_ai_settings (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger: auto-create AI settings when profile is created
CREATE TRIGGER create_ai_settings_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_ai_settings();