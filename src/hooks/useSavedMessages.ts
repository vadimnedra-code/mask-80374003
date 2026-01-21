import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SavedMessage {
  id: string;
  message_id: string;
  chat_id: string;
  saved_at: string;
  message?: {
    id: string;
    content: string | null;
    message_type: string;
    media_url: string | null;
    created_at: string;
    sender_id: string;
  };
}

export const useSavedMessages = () => {
  const { user } = useAuth();
  const [savedMessages, setSavedMessages] = useState<SavedMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedMessages = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('saved_messages')
      .select(`
        id,
        message_id,
        chat_id,
        saved_at
      `)
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false });

    if (error) {
      console.error('Error fetching saved messages:', error);
      setLoading(false);
      return;
    }

    // Fetch message details for each saved message
    const messagesWithDetails = await Promise.all(
      (data || []).map(async (saved) => {
        const { data: messageData } = await supabase
          .from('messages')
          .select('id, content, message_type, media_url, created_at, sender_id')
          .eq('id', saved.message_id)
          .single();

        return {
          ...saved,
          message: messageData || undefined,
        };
      })
    );

    setSavedMessages(messagesWithDetails);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSavedMessages();

    if (!user) return;

    const channel = supabase
      .channel('saved-messages-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'saved_messages',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchSavedMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchSavedMessages]);

  const saveMessage = useCallback(async (messageId: string, chatId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('saved_messages')
      .insert({
        user_id: user.id,
        message_id: messageId,
        chat_id: chatId,
      });

    if (error) {
      console.error('Error saving message:', error);
      return { error };
    }

    return { error: null };
  }, [user]);

  const unsaveMessage = useCallback(async (messageId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('saved_messages')
      .delete()
      .eq('user_id', user.id)
      .eq('message_id', messageId);

    if (error) {
      console.error('Error unsaving message:', error);
      return { error };
    }

    return { error: null };
  }, [user]);

  const isMessageSaved = useCallback((messageId: string) => {
    return savedMessages.some((sm) => sm.message_id === messageId);
  }, [savedMessages]);

  return {
    savedMessages,
    loading,
    saveMessage,
    unsaveMessage,
    isMessageSaved,
    refetch: fetchSavedMessages,
  };
};
