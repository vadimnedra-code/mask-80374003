import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type MessageType = 'text' | 'image' | 'video' | 'voice' | 'file';
export type FilterType = 'all' | 'text' | 'media';

export interface SearchResult {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string | null;
  message_type: MessageType;
  media_url: string | null;
  created_at: string;
  chat_name: string;
  chat_avatar: string | null;
  sender_name: string;
}

export const useMessageSearch = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const search = useCallback(async (searchQuery: string, filterType: FilterType = 'all') => {
    if (!user || !searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setQuery(searchQuery);
    setFilter(filterType);

    try {
      // Get user's chat IDs first
      const { data: participations } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', user.id);

      if (!participations?.length) {
        setResults([]);
        setLoading(false);
        return;
      }

      const chatIds = participations.map(p => p.chat_id);

      // Build message query
      let messageQuery = supabase
        .from('messages')
        .select(`
          id,
          chat_id,
          sender_id,
          content,
          message_type,
          media_url,
          created_at
        `)
        .in('chat_id', chatIds)
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply filter
      if (filterType === 'text') {
        messageQuery = messageQuery.eq('message_type', 'text');
      } else if (filterType === 'media') {
        messageQuery = messageQuery.in('message_type', ['image', 'video', 'file', 'voice']);
      }

      // Search in content
      if (filterType !== 'media') {
        messageQuery = messageQuery.ilike('content', `%${searchQuery}%`);
      }

      const { data: messages, error } = await messageQuery;

      if (error) {
        console.error('Search error:', error);
        setResults([]);
        setLoading(false);
        return;
      }

      // Get chat and sender details
      const uniqueChatIds = [...new Set(messages?.map(m => m.chat_id) || [])];
      const uniqueSenderIds = [...new Set(messages?.map(m => m.sender_id) || [])];

      const [chatsResult, profilesResult] = await Promise.all([
        supabase
          .from('chats')
          .select('id, is_group, group_name, group_avatar')
          .in('id', uniqueChatIds),
        supabase
          .from('profiles_public')
          .select('user_id, display_name, avatar_url')
          .in('user_id', [...uniqueSenderIds, user.id])
      ]);

      const chatsMap = new Map(chatsResult.data?.map(c => [c.id, c]) || []);
      const profilesMap = new Map(profilesResult.data?.map(p => [p.user_id, p]) || []);

      // Get participants for non-group chats to determine chat name
      const nonGroupChatIds = chatsResult.data?.filter(c => !c.is_group).map(c => c.id) || [];
      let chatParticipantsMap = new Map<string, string>();

      if (nonGroupChatIds.length > 0) {
        const { data: participants } = await supabase
          .from('chat_participants')
          .select('chat_id, user_id')
          .in('chat_id', nonGroupChatIds)
          .neq('user_id', user.id);

        for (const p of participants || []) {
          const profile = profilesMap.get(p.user_id);
          if (profile) {
            chatParticipantsMap.set(p.chat_id, profile.display_name);
          }
        }
      }

      // Map results
      const searchResults: SearchResult[] = (messages || []).map(msg => {
        const chat = chatsMap.get(msg.chat_id);
        const sender = profilesMap.get(msg.sender_id);
        
        let chatName = 'Чат';
        let chatAvatar: string | null = null;

        if (chat?.is_group) {
          chatName = chat.group_name || 'Группа';
          chatAvatar = chat.group_avatar;
        } else {
          chatName = chatParticipantsMap.get(msg.chat_id) || 'Чат';
        }

        return {
          id: msg.id,
          chat_id: msg.chat_id,
          sender_id: msg.sender_id,
          content: msg.content,
          message_type: msg.message_type as MessageType,
          media_url: msg.media_url,
          created_at: msg.created_at,
          chat_name: chatName,
          chat_avatar: chatAvatar,
          sender_name: sender?.display_name || 'Пользователь',
        };
      });

      setResults(searchResults);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const clearSearch = useCallback(() => {
    setResults([]);
    setQuery('');
    setFilter('all');
  }, []);

  return {
    results,
    loading,
    query,
    filter,
    search,
    setFilter,
    clearSearch,
  };
};
