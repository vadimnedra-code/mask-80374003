import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationSound } from '@/hooks/useNotificationSound';

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string | null;
  message_type: 'text' | 'image' | 'video' | 'voice' | 'file';
  media_url: string | null;
  reply_to: string | null;
  is_read: boolean;
  is_delivered: boolean;
  created_at: string;
  updated_at: string;
}

export const useMessages = (chatId: string | null) => {
  const { user } = useAuth();
  const { playMessageSound } = useNotificationSound();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const initialLoadRef = useRef(true);

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
      const msgs = data as Message[];
      setMessages(msgs);
      
      // Mark undelivered messages from others as delivered
      const undeliveredIds = msgs
        .filter(m => m.sender_id !== user?.id && !m.is_delivered)
        .map(m => m.id);
      if (undeliveredIds.length > 0) {
        supabase
          .from('messages')
          .update({ is_delivered: true })
          .in('id', undeliveredIds)
          .then(() => {});
      }
    }
    setLoading(false);
  }, [chatId, user]);

  useEffect(() => {
    initialLoadRef.current = true;
    fetchMessages().then(() => {
      // Delay setting initialLoad to false to avoid sound on rapid message load
      setTimeout(() => {
        initialLoadRef.current = false;
      }, 500);
    });

    if (!chatId) return;

    // Subscribe to message changes
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
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            // Check if message already exists (avoid duplicates from optimistic updates)
            const exists = prev.some(m => m.id === newMessage.id);
            // Also check for temp messages that should be replaced
            const hasTempVersion = prev.some(m => m.id.startsWith('temp-') && m.sender_id === newMessage.sender_id && m.content === newMessage.content);
            
            if (exists) {
              // Update existing message if needed
              return prev.map(m => m.id === newMessage.id ? newMessage : m);
            }
            
            if (hasTempVersion) {
              // Replace temp message with real one
              return prev.map(m => {
                if (m.id.startsWith('temp-') && m.sender_id === newMessage.sender_id && m.content === newMessage.content) {
                  return newMessage;
                }
                return m;
              });
            }
            
            return [...prev, newMessage];
          });
          
          // Play sound for incoming messages (not our own and not initial load)
          if (!initialLoadRef.current && newMessage.sender_id !== user?.id) {
            playMessageSound();
          }
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
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
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

    // Optimistic update - add message immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      chat_id: chatId,
      sender_id: user.id,
      content,
      message_type: type,
      media_url: mediaUrl || null,
      reply_to: null,
      is_read: false,
      is_delivered: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, optimisticMessage]);

    const { data, error } = await supabase.from('messages').insert({
      chat_id: chatId,
      sender_id: user.id,
      content,
      message_type: type,
      media_url: mediaUrl,
    }).select().single();

    if (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } else if (data) {
      // Replace temp message with real one
      setMessages(prev => prev.map(m => m.id === tempId ? (data as Message) : m));
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

  const editMessage = async (messageId: string, newContent: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('messages')
      .update({ content: newContent, updated_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('sender_id', user.id);

    if (error) {
      console.error('Error editing message:', error);
    }

    return { error };
  };

  const deleteMessage = async (messageId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', user.id);

    if (error) {
      console.error('Error deleting message:', error);
    }

    return { error };
  };

  return { 
    messages, 
    loading, 
    uploading, 
    sendMessage, 
    sendMediaMessage, 
    sendVoiceMessage, 
    markAsRead,
    editMessage,
    deleteMessage,
    refetch: fetchMessages
  };
};