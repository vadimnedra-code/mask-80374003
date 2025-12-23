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
  const [uploading, setUploading] = useState(false);

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

  const uploadFile = async (file: File): Promise<{ url: string; type: 'image' | 'video' | 'file' } | null> => {
    if (!user) return null;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName);

      // Determine file type
      let type: 'image' | 'video' | 'file' = 'file';
      if (file.type.startsWith('image/')) {
        type = 'image';
      } else if (file.type.startsWith('video/')) {
        type = 'video';
      }

      return { url: publicUrl, type };
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async (
    content: string, 
    type: 'text' | 'image' | 'video' | 'voice' | 'file' = 'text', 
    mediaUrl?: string
  ) => {
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

  const sendMediaMessage = async (file: File) => {
    const result = await uploadFile(file);
    if (!result) {
      return { error: new Error('Failed to upload file') };
    }

    const content = file.type.startsWith('image/') 
      ? '📷 Изображение' 
      : file.type.startsWith('video/') 
        ? '🎥 Видео' 
        : `📎 ${file.name}`;

    return sendMessage(content, result.type, result.url);
  };

  const sendVoiceMessage = async (audioBlob: Blob, duration: number) => {
    if (!user || !chatId) return { error: new Error('Not authenticated') };

    setUploading(true);
    try {
      const fileName = `${user.id}/${Date.now()}-voice.webm`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, audioBlob, {
          contentType: audioBlob.type || 'audio/webm',
        });

      if (uploadError) {
        console.error('Error uploading voice message:', uploadError);
        return { error: uploadError };
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName);

      const durationText = `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`;
      return sendMessage(`🎤 Голосовое (${durationText})`, 'voice', publicUrl);
    } finally {
      setUploading(false);
    }
  };

  const markAsRead = async () => {
    if (!chatId || !user) return;

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('chat_id', chatId)
      .neq('sender_id', user.id);
  };

  return { messages, loading, uploading, sendMessage, sendMediaMessage, sendVoiceMessage, markAsRead };
};