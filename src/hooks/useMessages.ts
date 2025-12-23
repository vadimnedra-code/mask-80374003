import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string | null;
  message_type: 'text' | 'image' | 'video' | 'voice' | 'file';
  media_url: string | null;
  reply_to: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export const useMessages = (chatId: string | null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!chatId || !user) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data as Message[]);
    }
    setLoading(false);
  }, [chatId, user]);

  useEffect(() => {
    fetchMessages();

    if (!chatId) return;

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.new.id ? (payload.new as Message) : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, fetchMessages]);

  const sendMessage = async (content: string, type: 'text' | 'image' | 'video' | 'voice' | 'file' = 'text', mediaUrl?: string) => {
    if (!chatId || !user) return { error: new Error('Not authenticated') };

    const { error } = await supabase.from('messages').insert({
      chat_id: chatId,
      sender_id: user.id,
      content,
      message_type: type,
      media_url: mediaUrl,
    });

    if (error) {
      console.error('Error sending message:', error);
    }

    return { error };
  };

  const markAsRead = async () => {
    if (!chatId || !user) return;

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('chat_id', chatId)
      .neq('sender_id', user.id);
  };

  return { messages, loading, sendMessage, markAsRead };
};
