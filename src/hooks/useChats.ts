import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Chat {
  id: string;
  is_group: boolean;
  group_name: string | null;
  group_avatar: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatWithDetails extends Chat {
  participants: {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    status: string;
    last_seen: string;
  }[];
  lastMessage?: {
    content: string | null;
    created_at: string;
    sender_id: string;
  };
  unreadCount: number;
}

export const useChats = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChats = async () => {
    if (!user) return;

    // Get chats where user is a participant
    const { data: participations, error: partError } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', user.id);

    if (partError) {
      console.error('Error fetching participations:', partError);
      setLoading(false);
      return;
    }

    const chatIds = participations.map(p => p.chat_id);

    if (chatIds.length === 0) {
      setChats([]);
      setLoading(false);
      return;
    }

    // Get chat details
    const { data: chatsData, error: chatsError } = await supabase
      .from('chats')
      .select('*')
      .in('id', chatIds)
      .order('updated_at', { ascending: false });

    if (chatsError) {
      console.error('Error fetching chats:', chatsError);
      setLoading(false);
      return;
    }

    // Get participants for each chat
    const chatsWithDetails: ChatWithDetails[] = await Promise.all(
      (chatsData || []).map(async (chat) => {
        // Get participants first
        const { data: participantsData } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('chat_id', chat.id);

        // Then get profiles for each participant
        const participantUserIds = (participantsData || []).map(p => p.user_id);
        const { data: profilesData } = await supabase
          .from('profiles_public')
          .select('user_id, display_name, avatar_url, status, last_seen')
          .in('user_id', participantUserIds);

        const { data: lastMessages } = await supabase
          .from('messages')
          .select('content, created_at, sender_id')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chat.id)
          .eq('is_read', false)
          .neq('sender_id', user.id);

        // Map participants with their profiles
        const profilesMap = new Map((profilesData || []).map(p => [p.user_id, p]));
        
        return {
          ...chat,
          participants: participantUserIds.map((userId) => {
            const profile = profilesMap.get(userId);
            return {
              user_id: userId,
              display_name: profile?.display_name || 'Unknown',
              avatar_url: profile?.avatar_url,
              status: profile?.status || 'offline',
              last_seen: profile?.last_seen,
            };
          }),
          lastMessage: lastMessages?.[0],
          unreadCount: unreadCount || 0,
        };
      })
    );

    setChats(chatsWithDetails);
    setLoading(false);
  };

  useEffect(() => {
    fetchChats();

    // Subscribe to chat updates
    if (!user) return;

    const channel = supabase
      .channel('chats-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const createChat = async (participantIds: string[], groupName?: string, groupAvatar?: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const isGroup = participantIds.length > 1;

    // Create chat with created_by set to current user
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert({ 
        is_group: isGroup, 
        created_by: user.id,
        group_name: isGroup ? groupName || null : null,
        group_avatar: isGroup ? groupAvatar || null : null,
      })
      .select()
      .single();

    if (chatError) return { error: chatError };

    // Add participants (insert creator first to satisfy RLS)
    const { error: selfPartError } = await supabase
      .from('chat_participants')
      .insert({ chat_id: chat.id, user_id: user.id });

    if (selfPartError) return { error: selfPartError };

    if (participantIds.length > 0) {
      const otherParticipants = participantIds.map((participantUserId) => ({
        chat_id: chat.id,
        user_id: participantUserId,
      }));

      const { error: otherPartError } = await supabase
        .from('chat_participants')
        .insert(otherParticipants);

      if (otherPartError) return { error: otherPartError };
    }

    await fetchChats();
    return { data: chat, error: null };
  };

  return { chats, loading, createChat, refetch: fetchChats };
};
