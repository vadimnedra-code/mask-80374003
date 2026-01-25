import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AIMemoryMode = 'none' | 'local' | 'cloud_encrypted';

export interface AISettings {
  id: string;
  user_id: string;
  memory_mode: AIMemoryMode;
  allow_chat_analysis: boolean;
  allow_selected_chats_only: boolean;
  preferred_language: string;
  tone_style: string;
  onboarding_completed: boolean;
  privacy_preset: string;
  created_at: string;
  updated_at: string;
}

export const useAISettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('user_ai_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching AI settings:', error);
    } else if (data) {
      setSettings(data as unknown as AISettings);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (updates: Partial<AISettings>) => {
    if (!user?.id) return { error: new Error('No user') };

    const { error } = await supabase
      .from('user_ai_settings')
      .update(updates)
      .eq('user_id', user.id);

    if (!error) {
      setSettings(prev => prev ? { ...prev, ...updates } : null);
    }

    return { error };
  }, [user?.id]);

  const completeOnboarding = useCallback(async (privacyPreset: string) => {
    return updateSettings({
      onboarding_completed: true,
      privacy_preset: privacyPreset,
      // Apply preset defaults
      ...(privacyPreset === 'max_privacy' && {
        memory_mode: 'none' as AIMemoryMode,
        allow_chat_analysis: false,
      }),
      ...(privacyPreset === 'balanced' && {
        memory_mode: 'local' as AIMemoryMode,
        allow_chat_analysis: false,
      }),
      ...(privacyPreset === 'max_comfort' && {
        memory_mode: 'cloud_encrypted' as AIMemoryMode,
        allow_chat_analysis: true,
      }),
    });
  }, [updateSettings]);

  return {
    settings,
    loading,
    updateSettings,
    completeOnboarding,
    refetch: fetchSettings,
    needsOnboarding: !loading && (!settings || !settings.onboarding_completed),
  };
};
