import { useEffect, useState, useRef, useCallback } from 'react';
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
    role?: string;
    archived_at?: string | null;
    muted_until?: string | null;
  }[];
  lastMessage?: {
    content: string | null;
    created_at: string;
    sender_id: string;
    deleted_for_everyone?: boolean;
  };
  unreadCount: number;
  pinned_at: string | null;
  archived_at: string | null;
  muted_until: string | null;
}

export const useChats = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const getChatSortTimestamp = useCallback((chat: ChatWithDetails) => {
    // Prefer real activity (last message time). This fixes cases where chats.updated_at
    // doesn't track message inserts and empty/new chats float to the top.
    const ts = chat.lastMessage?.created_at || chat.updated_at || chat.created_at;
    return new Date(ts).getTime();
  }, []);

  const fetchChats = useCallback(async () => {
    if (!user) {
      console.log('[useChats] No user, skipping fetch');
      return;
    }

    console.log('[useChats] Fetching chats for user:', user.id);

    // Get chats where user is a participant (including pinned_at, archived_at, muted_until)
    const { data: participations, error: partError } = await supabase
      .from('chat_participants')
      .select('chat_id, pinned_at, archived_at, muted_until, role')
      .eq('user_id', user.id);

    if (partError) {
      console.error('[useChats] Error fetching participations:', partError);
      setLoading(false);
      return;
    }

    console.log('[useChats] Found', participations?.length || 0, 'chat participations');

    // Create maps for participant-specific data
    const pinnedMap = new Map(participations.map(p => [p.chat_id, p.pinned_at]));
    const archivedMap = new Map(participations.map(p => [p.chat_id, p.archived_at]));
    const mutedMap = new Map(participations.map(p => [p.chat_id, p.muted_until]));
    const roleMap = new Map(participations.map(p => [p.chat_id, p.role]));

    const chatIds = participations.map(p => p.chat_id);

    if (chatIds.length === 0) {
      console.log('[useChats] No chats found');
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
        // Get participants first (including roles, archived_at, muted_until)
        const { data: participantsData } = await supabase
          .from('chat_participants')
          .select('user_id, role, archived_at, muted_until')
          .eq('chat_id', chat.id);

        // Then get profiles for each participant
        const participantUserIds = (participantsData || []).map(p => p.user_id);
        const { data: profilesData } = await supabase
          .from('profiles_public')
          .select('user_id, display_name, avatar_url, status, last_seen')
          .in('user_id', participantUserIds);

        const { data: lastMessages } = await supabase
          .from('messages')
          .select('content, created_at, sender_id, deleted_for_everyone')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chat.id)
          .eq('is_read', false)
          .neq('sender_id', user.id);

        // Map participants with their profiles and roles
        const profilesMap = new Map((profilesData || []).map(p => [p.user_id, p]));
        const participantDataMap = new Map((participantsData || []).map(p => [p.user_id, p]));
        
        return {
          ...chat,
          participants: participantUserIds.map((userId) => {
            const profile = profilesMap.get(userId);
            const participantData = participantDataMap.get(userId);
            return {
              user_id: userId,
              display_name: profile?.display_name || 'Unknown',
              avatar_url: profile?.avatar_url,
              status: profile?.status || 'offline',
              last_seen: profile?.last_seen,
              role: participantData?.role || 'member',
              archived_at: participantData?.archived_at,
              muted_until: participantData?.muted_until,
            };
          }),
          lastMessage: lastMessages?.[0],
          unreadCount: unreadCount || 0,
          pinned_at: pinnedMap.get(chat.id) || null,
          archived_at: archivedMap.get(chat.id) || null,
          muted_until: mutedMap.get(chat.id) || null,
        };
      })
    );

    // Sort chats: pinned first (by pinned_at desc), then by last activity (last message)
    chatsWithDetails.sort((a, b) => {
      if (a.pinned_at && !b.pinned_at) return -1;
      if (!a.pinned_at && b.pinned_at) return 1;
      if (a.pinned_at && b.pinned_at) {
        return new Date(b.pinned_at).getTime() - new Date(a.pinned_at).getTime();
      }

      return getChatSortTimestamp(b) - getChatSortTimestamp(a);
    });

    setChats(chatsWithDetails);
    setLoading(false);
  }, [user, getChatSortTimestamp]);

  useEffect(() => {
    fetchChats();

    // Subscribe to chat updates - only to chat_participants for new chats
    if (!user) return;

    const debouncedFetch = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        fetchChats();
      }, 300);
    };

    const channel = supabase
      .channel('chats-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_participants',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          debouncedFetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
        },
        () => {
          debouncedFetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => debouncedFetch()
      )
      .subscribe();

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [user, fetchChats]);

  const findExistingDirectChat = async (otherUserId: string): Promise<string | null> => {
    if (!user) return null;

    // Get all chats where current user participates
    const { data: myChats } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', user.id);

    if (!myChats || myChats.length === 0) return null;

    // For each chat, check if it's a 1-on-1 with the target user
    for (const { chat_id } of myChats) {
      // Check if it's not a group chat
      const { data: chatData } = await supabase
        .from('chats')
        .select('is_group')
        .eq('id', chat_id)
        .single();

      if (chatData?.is_group) continue;

      // Get all participants of this chat
      const { data: participants } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('chat_id', chat_id);

      if (!participants || participants.length !== 2) continue;

      const participantIds = participants.map(p => p.user_id);
      if (participantIds.includes(user.id) && participantIds.includes(otherUserId)) {
        return chat_id;
      }
    }

    return null;
  };

  const createChat = async (participantIds: string[], groupName?: string, groupAvatar?: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const isGroup = participantIds.length > 1;

    // For 1-on-1 chats, check if one already exists
    if (!isGroup && participantIds.length === 1) {
      const existingChatId = await findExistingDirectChat(participantIds[0]);
      if (existingChatId) {
        return { data: { id: existingChatId }, error: null };
      }
    }

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

  const deleteChat = async (chatId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      // Delete messages first
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('chat_id', chatId);

      if (messagesError) {
        console.error('Error deleting messages:', messagesError);
        return { error: messagesError };
      }

      // Delete chat participants
      const { error: participantsError } = await supabase
        .from('chat_participants')
        .delete()
        .eq('chat_id', chatId);

      if (participantsError) {
        console.error('Error deleting participants:', participantsError);
        return { error: participantsError };
      }

      // Delete the chat itself
      const { error: chatError } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (chatError) {
        console.error('Error deleting chat:', chatError);
        return { error: chatError };
      }

      // Update local state
      setChats(prev => prev.filter(c => c.id !== chatId));
      return { error: null };
    } catch (err) {
      console.error('Unexpected error deleting chat:', err);
      return { error: err };
    }
  };

  const togglePinChat = async (chatId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const chat = chats.find(c => c.id === chatId);
    const isPinned = !!chat?.pinned_at;
    const newPinnedAt = isPinned ? null : new Date().toISOString();

    const { error } = await supabase
      .from('chat_participants')
      .update({ pinned_at: newPinnedAt })
      .eq('chat_id', chatId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error toggling pin:', error);
      return { error };
    }

    // Update local state
    setChats(prev => {
      const updated = prev.map(c => 
        c.id === chatId ? { ...c, pinned_at: newPinnedAt } : c
      );
      // Re-sort after pin change
      updated.sort((a, b) => {
        if (a.pinned_at && !b.pinned_at) return -1;
        if (!a.pinned_at && b.pinned_at) return 1;
        if (a.pinned_at && b.pinned_at) {
          return new Date(b.pinned_at).getTime() - new Date(a.pinned_at).getTime();
        }
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
      return updated;
    });

    return { error: null };
  };

  return { chats, loading, createChat, findExistingDirectChat, deleteChat, togglePinChat, refetch: fetchChats };
};
