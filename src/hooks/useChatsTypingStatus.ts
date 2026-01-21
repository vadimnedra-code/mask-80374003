import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ChatTypingStatus {
  chatId: string;
  typingUsers: { userId: string; displayName: string }[];
}

export const useChatsTypingStatus = (chatIds: string[]) => {
  const { user } = useAuth();
  const [typingByChatId, setTypingByChatId] = useState<Record<string, { userId: string; displayName: string }[]>>({});

  const fetchTypingStatuses = useCallback(async () => {
    if (!user || chatIds.length === 0) return;

    const { data, error } = await supabase
      .from('typing_status')
      .select('chat_id, user_id')
      .in('chat_id', chatIds)
      .eq('is_typing', true)
      .neq('user_id', user.id);

    if (error) {
      console.error('Error fetching typing statuses:', error);
      return;
    }

    if (!data || data.length === 0) {
      setTypingByChatId({});
      return;
    }

    // Get display names for all typing users
    const userIds = [...new Set(data.map(t => t.user_id))];
    const { data: profiles } = await supabase
      .from('profiles_public')
      .select('user_id, display_name')
      .in('user_id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

    // Group by chat_id
    const grouped: Record<string, { userId: string; displayName: string }[]> = {};
    for (const item of data) {
      if (!grouped[item.chat_id]) {
        grouped[item.chat_id] = [];
      }
      grouped[item.chat_id].push({
        userId: item.user_id,
        displayName: profileMap.get(item.user_id) || 'Пользователь',
      });
    }

    setTypingByChatId(grouped);
  }, [user, chatIds.join(',')]);

  useEffect(() => {
    fetchTypingStatuses();

    if (!user || chatIds.length === 0) return;

    // Subscribe to typing status changes for all chats
    const channel = supabase
      .channel('all-chats-typing')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_status',
        },
        async (payload) => {
          const typingStatus = payload.new as { chat_id: string; user_id: string; is_typing: boolean } | undefined;
          const oldStatus = payload.old as { chat_id: string; user_id: string } | undefined;

          // Handle DELETE
          if (payload.eventType === 'DELETE' && oldStatus) {
            if (!chatIds.includes(oldStatus.chat_id)) return;
            setTypingByChatId(prev => {
              const chatTyping = prev[oldStatus.chat_id] || [];
              const filtered = chatTyping.filter(u => u.userId !== oldStatus.user_id);
              if (filtered.length === 0) {
                const { [oldStatus.chat_id]: _, ...rest } = prev;
                return rest;
              }
              return { ...prev, [oldStatus.chat_id]: filtered };
            });
            return;
          }

          if (!typingStatus || typingStatus.user_id === user.id) return;
          if (!chatIds.includes(typingStatus.chat_id)) return;

          if (typingStatus.is_typing) {
            // Fetch display name
            const { data: profile } = await supabase
              .from('profiles_public')
              .select('display_name')
              .eq('user_id', typingStatus.user_id)
              .maybeSingle();

            setTypingByChatId(prev => {
              const chatTyping = prev[typingStatus.chat_id] || [];
              if (chatTyping.some(u => u.userId === typingStatus.user_id)) return prev;
              return {
                ...prev,
                [typingStatus.chat_id]: [
                  ...chatTyping,
                  { userId: typingStatus.user_id, displayName: profile?.display_name || 'Пользователь' },
                ],
              };
            });
          } else {
            setTypingByChatId(prev => {
              const chatTyping = prev[typingStatus.chat_id] || [];
              const filtered = chatTyping.filter(u => u.userId !== typingStatus.user_id);
              if (filtered.length === 0) {
                const { [typingStatus.chat_id]: _, ...rest } = prev;
                return rest;
              }
              return { ...prev, [typingStatus.chat_id]: filtered };
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, chatIds.join(','), fetchTypingStatuses]);

  const getTypingText = useCallback((chatId: string): string | null => {
    const typingUsers = typingByChatId[chatId];
    if (!typingUsers || typingUsers.length === 0) return null;
    
    if (typingUsers.length === 1) {
      return 'печатает...';
    }
    return 'печатают...';
  }, [typingByChatId]);

  return {
    typingByChatId,
    getTypingText,
  };
};