import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  userReacted: boolean;
}

export const useMessageReactions = (chatId: string | null) => {
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  const { user } = useAuth();

  const fetchReactions = useCallback(async (messageIds: string[]) => {
    if (!messageIds.length) return;

    const { data, error } = await supabase
      .from('message_reactions')
      .select('*')
      .in('message_id', messageIds);

    if (error) {
      console.error('Error fetching reactions:', error);
      return;
    }

    const grouped: Record<string, Reaction[]> = {};
    data?.forEach((reaction) => {
      if (!grouped[reaction.message_id]) {
        grouped[reaction.message_id] = [];
      }
      grouped[reaction.message_id].push(reaction);
    });

    setReactions(grouped);
  }, []);

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });

    if (error) {
      // If duplicate, try to remove instead (toggle behavior)
      if (error.code === '23505') {
        await removeReaction(messageId, emoji);
      } else {
        console.error('Error adding reaction:', error);
      }
    }
  }, [user]);

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji);

    if (error) {
      console.error('Error removing reaction:', error);
    }
  }, [user]);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return;

    const messageReactions = reactions[messageId] || [];
    const existingReaction = messageReactions.find(
      r => r.user_id === user.id && r.emoji === emoji
    );

    if (existingReaction) {
      await removeReaction(messageId, emoji);
    } else {
      await addReaction(messageId, emoji);
    }
  }, [user, reactions, addReaction, removeReaction]);

  const getReactionGroups = useCallback((messageId: string): ReactionGroup[] => {
    const messageReactions = reactions[messageId] || [];
    const groups: Record<string, { count: number; userReacted: boolean }> = {};

    messageReactions.forEach((reaction) => {
      if (!groups[reaction.emoji]) {
        groups[reaction.emoji] = { count: 0, userReacted: false };
      }
      groups[reaction.emoji].count++;
      if (reaction.user_id === user?.id) {
        groups[reaction.emoji].userReacted = true;
      }
    });

    return Object.entries(groups).map(([emoji, data]) => ({
      emoji,
      ...data,
    }));
  }, [reactions, user]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`reactions-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newReaction = payload.new as Reaction;
            setReactions(prev => ({
              ...prev,
              [newReaction.message_id]: [
                ...(prev[newReaction.message_id] || []),
                newReaction,
              ],
            }));
          } else if (payload.eventType === 'DELETE') {
            const oldReaction = payload.old as Reaction;
            setReactions(prev => ({
              ...prev,
              [oldReaction.message_id]: (prev[oldReaction.message_id] || [])
                .filter(r => r.id !== oldReaction.id),
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  return {
    reactions,
    fetchReactions,
    addReaction,
    removeReaction,
    toggleReaction,
    getReactionGroups,
  };
};
