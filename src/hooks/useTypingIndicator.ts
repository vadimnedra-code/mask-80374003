import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TypingUser {
  user_id: string;
  display_name: string;
}

export const useTypingIndicator = (chatId: string | null) => {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Set typing status
  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!chatId || !user) return;
    
    // Avoid unnecessary updates
    if (isTypingRef.current === isTyping) return;
    isTypingRef.current = isTyping;

    try {
      const { error } = await supabase
        .from('typing_status')
        .upsert({
          chat_id: chatId,
          user_id: user.id,
          is_typing: isTyping,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'chat_id,user_id',
        });

      if (error) {
        console.error('Error updating typing status:', error);
      }
    } catch (err) {
      console.error('Error in setTyping:', err);
    }
  }, [chatId, user]);

  // Handle input change - set typing with auto-reset
  const handleTypingStart = useCallback(() => {
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing to true
    setTyping(true);

    // Auto-reset after 3 seconds of no typing
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 3000);
  }, [setTyping]);

  // Stop typing immediately
  const handleTypingStop = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    setTyping(false);
  }, [setTyping]);

  // Subscribe to typing status changes
  useEffect(() => {
    if (!chatId || !user) {
      setTypingUsers([]);
      return;
    }

    // Fetch initial typing users
    const fetchTypingUsers = async () => {
      const { data, error } = await supabase
        .from('typing_status')
        .select('user_id')
        .eq('chat_id', chatId)
        .eq('is_typing', true)
        .neq('user_id', user.id);

      if (error) {
        console.error('Error fetching typing users:', error);
        return;
      }

      if (data && data.length > 0) {
        // Get display names for typing users
        const userIds = data.map(t => t.user_id);
        const { data: profiles } = await supabase
          .from('profiles_public')
          .select('user_id, display_name')
          .in('user_id', userIds);

        if (profiles) {
          setTypingUsers(profiles.map(p => ({
            user_id: p.user_id,
            display_name: p.display_name,
          })));
        }
      } else {
        setTypingUsers([]);
      }
    };

    fetchTypingUsers();

    // Subscribe to changes
    const channel = supabase
      .channel(`typing-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_status',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          const typingStatus = payload.new as { user_id: string; is_typing: boolean } | undefined;
          
          if (!typingStatus || typingStatus.user_id === user.id) return;

          if (typingStatus.is_typing) {
            // Add to typing users
            const { data: profile } = await supabase
              .from('profiles_public')
              .select('display_name')
              .eq('user_id', typingStatus.user_id)
              .maybeSingle();

            setTypingUsers(prev => {
              if (prev.some(u => u.user_id === typingStatus.user_id)) return prev;
              return [...prev, {
                user_id: typingStatus.user_id,
                display_name: profile?.display_name || 'Пользователь',
              }];
            });
          } else {
            // Remove from typing users
            setTypingUsers(prev => prev.filter(u => u.user_id !== typingStatus.user_id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      // Clear typing status on unmount
      setTyping(false);
    };
  }, [chatId, user, setTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const typingText = typingUsers.length > 0
    ? typingUsers.length === 1
      ? `${typingUsers[0].display_name} печатает...`
      : `${typingUsers.map(u => u.display_name).join(', ')} печатают...`
    : null;

  return {
    typingUsers,
    typingText,
    handleTypingStart,
    handleTypingStop,
  };
};
