import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type DisappearTimer = null | 86400 | 604800 | 7776000; // null=off, 24h, 7d, 90d in seconds

export interface DisappearPolicy {
  id: string;
  chat_id: string;
  ttl_seconds: number | null;
  set_by: string;
  updated_at: string;
}

export const useDisappearingMessages = (chatId: string | null) => {
  const { user } = useAuth();
  const [policy, setPolicy] = useState<DisappearPolicy | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPolicy = useCallback(async () => {
    if (!chatId) {
      setPolicy(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('disappear_policies')
      .select('*')
      .eq('chat_id', chatId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching disappear policy:', error);
    }

    setPolicy(data);
    setLoading(false);
  }, [chatId]);

  useEffect(() => {
    fetchPolicy();

    if (!chatId) return;

    const channel = supabase
      .channel(`disappear-policy-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'disappear_policies',
          filter: `chat_id=eq.${chatId}`,
        },
        () => {
          fetchPolicy();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, fetchPolicy]);

  const setDisappearTimer = useCallback(async (ttlSeconds: DisappearTimer) => {
    if (!user || !chatId) return { error: new Error('Not authenticated or no chat') };

    if (ttlSeconds === null) {
      // Delete the policy
      const { error } = await supabase
        .from('disappear_policies')
        .delete()
        .eq('chat_id', chatId);

      if (error) {
        console.error('Error removing disappear policy:', error);
        return { error };
      }
    } else {
      // Upsert the policy
      const { error } = await supabase
        .from('disappear_policies')
        .upsert({
          chat_id: chatId,
          ttl_seconds: ttlSeconds,
          set_by: user.id,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'chat_id',
        });

      if (error) {
        console.error('Error setting disappear policy:', error);
        return { error };
      }
    }

    return { error: null };
  }, [user, chatId]);

  const getTimerLabel = useCallback((ttlSeconds: number | null) => {
    if (!ttlSeconds) return 'Выкл';
    if (ttlSeconds === 86400) return '24 часа';
    if (ttlSeconds === 604800) return '7 дней';
    if (ttlSeconds === 7776000) return '90 дней';
    return `${Math.floor(ttlSeconds / 86400)} дн.`;
  }, []);

  return {
    policy,
    loading,
    setDisappearTimer,
    getTimerLabel,
    isEnabled: !!policy?.ttl_seconds,
    ttlSeconds: policy?.ttl_seconds ?? null,
  };
};
