import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useArchiveMute = () => {
  const { user } = useAuth();

  const archiveChat = useCallback(async (chatId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('chat_participants')
      .update({ archived_at: new Date().toISOString() })
      .eq('chat_id', chatId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error archiving chat:', error);
      return { error };
    }

    return { error: null };
  }, [user]);

  const unarchiveChat = useCallback(async (chatId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('chat_participants')
      .update({ archived_at: null })
      .eq('chat_id', chatId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error unarchiving chat:', error);
      return { error };
    }

    return { error: null };
  }, [user]);

  const muteChat = useCallback(async (chatId: string, duration: 'forever' | '8h' | '1w') => {
    if (!user) return { error: new Error('Not authenticated') };

    let mutedUntil: string | null = null;
    
    if (duration === 'forever') {
      // Set to a far future date
      mutedUntil = new Date('2099-12-31').toISOString();
    } else if (duration === '8h') {
      mutedUntil = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    } else if (duration === '1w') {
      mutedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    const { error } = await supabase
      .from('chat_participants')
      .update({ muted_until: mutedUntil })
      .eq('chat_id', chatId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error muting chat:', error);
      return { error };
    }

    return { error: null };
  }, [user]);

  const unmuteChat = useCallback(async (chatId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('chat_participants')
      .update({ muted_until: null })
      .eq('chat_id', chatId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error unmuting chat:', error);
      return { error };
    }

    return { error: null };
  }, [user]);

  const isChatMuted = useCallback((mutedUntil: string | null) => {
    if (!mutedUntil) return false;
    return new Date(mutedUntil) > new Date();
  }, []);

  return {
    archiveChat,
    unarchiveChat,
    muteChat,
    unmuteChat,
    isChatMuted,
  };
};
