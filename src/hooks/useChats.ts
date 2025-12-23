import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

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
        const { data: participants } = await supabase
          .from('chat_participants')
          .select('user_id, profiles(display_name, avatar_url, status, last_seen)')
          .eq('chat_id', chat.id);

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

        return {
          ...chat,
          participants: (participants || []).map((p: any) => ({
            user_id: p.user_id,
            display_name: p.profiles?.display_name || 'Unknown',
            avatar_url: p.profiles?.avatar_url,
            status: p.profiles?.status || 'offline',
            last_seen: p.profiles?.last_seen,
          })),
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

  const createChat = async (participantIds: string[]) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Create chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert({ is_group: participantIds.length > 1 })
      .select()
      .single();

    if (chatError) return { error: chatError };

    // Add participants
    const participants = [user.id, ...participantIds].map(userId => ({
      chat_id: chat.id,
      user_id: userId,
    }));

    const { error: partError } = await supabase
      .from('chat_participants')
      .insert(participants);

    if (partError) return { error: partError };

    await fetchChats();
    return { data: chat, error: null };
  };

  return { chats, loading, createChat, refetch: fetchChats };
};
