/**
 * Hook for managing encrypted messages using Signal Protocol E2EE
 * Wraps useMessages with encryption/decryption capabilities
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { useE2EEncryption } from '@/hooks/useE2EEncryption';

export interface EncryptedMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string | null;
  message_type: 'text' | 'image' | 'video' | 'voice' | 'file';
  media_url: string | null;
  reply_to: string | null;
  is_read: boolean;
  is_delivered: boolean;
  is_encrypted: boolean;
  encrypted_content: string | null;
  created_at: string;
  updated_at: string;
  // Decrypted content (client-side only)
  decryptedContent?: string;
  decryptionFailed?: boolean;
}

const PAGE_SIZE = 50;

interface UseEncryptedMessagesOptions {
  recipientId?: string; // For direct chats
  enableE2EE?: boolean;
}

export const useEncryptedMessages = (
  chatId: string | null,
  options: UseEncryptedMessagesOptions = {}
) => {
  const { user } = useAuth();
  const { playMessageSound } = useNotificationSound();
  const { isInitialized, encrypt, decrypt, hasE2EEKeys } = useE2EEncryption();
  
  const [messages, setMessages] = useState<EncryptedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [recipientHasE2EE, setRecipientHasE2EE] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const initialLoadRef = useRef(true);
  const { recipientId, enableE2EE = true } = options;

  // Check if recipient supports E2EE
  useEffect(() => {
    const checkRecipientE2EE = async () => {
      if (recipientId && enableE2EE) {
        const hasKeys = await hasE2EEKeys(recipientId);
        setRecipientHasE2EE(hasKeys);
      }
    };
    checkRecipientE2EE();
  }, [recipientId, enableE2EE, hasE2EEKeys]);

  // Decrypt a single message
  const decryptMessageContent = useCallback(async (
    msg: EncryptedMessage
  ): Promise<EncryptedMessage> => {
    if (!msg.is_encrypted || !msg.encrypted_content) {
      return msg;
    }

    // Don't decrypt our own messages - we already know the content
    if (msg.sender_id === user?.id) {
      return {
        ...msg,
        decryptedContent: msg.content || '[Encrypted]'
      };
    }

    try {
      // Detect PreKeyMessage by checking the first byte of base64-decoded data
      // PreKeyMessage protocol has a different structure than MessageSignedProtocol
      // Try PreKeyMessage first, then fall back to regular message
      let decrypted: string | null = null;
      
      // First try as PreKeyMessage (used for initial session establishment)
      try {
        decrypted = await decrypt(msg.sender_id, msg.encrypted_content, true);
      } catch (preKeyError) {
        // If PreKeyMessage fails, try as regular message
        try {
          decrypted = await decrypt(msg.sender_id, msg.encrypted_content, false);
        } catch (regularError) {
          console.warn('Failed to decrypt as both PreKeyMessage and regular message:', regularError);
        }
      }
      
      if (decrypted) {
        return {
          ...msg,
          decryptedContent: decrypted
        };
      }
    } catch (e) {
      console.warn('Failed to decrypt message:', e);
    }

    return {
      ...msg,
      decryptionFailed: true,
      decryptedContent: '🔒 Не удалось расшифровать'
    };
  }, [user?.id, decrypt]);

  // Fetch messages with pagination (latest PAGE_SIZE)
  const fetchMessages = useCallback(async () => {
    if (!chatId || !user) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, encrypted_content, is_encrypted, is_delivered')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (error) {
        console.error('[useEncryptedMessages] Error fetching messages:', error);
        setLoading(false);
        return;
      }

      // Reverse to get ascending order for display
      const sorted = (data as EncryptedMessage[]).reverse();
      setHasMore(data.length === PAGE_SIZE);

      // Mark undelivered messages from others as delivered
      const undeliveredIds = sorted
        .filter(m => m.sender_id !== user.id && !m.is_delivered)
        .map(m => m.id);
      if (undeliveredIds.length > 0) {
        supabase
          .from('messages')
          .update({ is_delivered: true })
          .in('id', undeliveredIds)
          .then(() => {});
      }

      const decryptedMessages = await Promise.all(
        sorted.map(async (msg) => {
          try {
            return await decryptMessageContent(msg);
          } catch (e) {
            return {
              ...msg,
              decryptionFailed: true,
              decryptedContent: msg.content || '🔒 Не удалось расшифровать'
            };
          }
        })
      );

      setMessages(decryptedMessages);
    } catch (e) {
      console.error('[useEncryptedMessages] Unexpected error:', e);
    } finally {
      setLoading(false);
    }
  }, [chatId, user, decryptMessageContent]);

  // Load older messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!chatId || !user || !hasMore || loadingMore) return;
    
    const oldestMessage = messages[0];
    if (!oldestMessage) return;

    setLoadingMore(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, encrypted_content, is_encrypted, is_delivered')
        .eq('chat_id', chatId)
        .lt('created_at', oldestMessage.created_at)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (error) {
        console.error('[useEncryptedMessages] Error loading more:', error);
        return;
      }

      if (data.length < PAGE_SIZE) {
        setHasMore(false);
      }

      const sorted = (data as EncryptedMessage[]).reverse();
      const decrypted = await Promise.all(
        sorted.map(async (msg) => {
          try {
            return await decryptMessageContent(msg);
          } catch (e) {
            return { ...msg, decryptionFailed: true, decryptedContent: msg.content || '🔒' };
          }
        })
      );

      setMessages(prev => [...decrypted, ...prev]);
    } finally {
      setLoadingMore(false);
    }
  }, [chatId, user, hasMore, loadingMore, messages, decryptMessageContent]);

  // Set up realtime subscription
  useEffect(() => {
    initialLoadRef.current = true;
    fetchMessages().then(() => {
      initialLoadRef.current = false;
    });

    if (!chatId) return;

    const channel = supabase
      .channel(`encrypted-messages-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          const newMessage = payload.new as EncryptedMessage;
          const decrypted = await decryptMessageContent(newMessage);
          
          setMessages((prev) => {
            const exists = prev.some(m => m.id === newMessage.id);
            const hasTempVersion = prev.some(
              m => m.id.startsWith('temp-') && 
                   m.sender_id === newMessage.sender_id && 
                   m.content === newMessage.content
            );
            
            if (exists) {
              return prev.map(m => m.id === newMessage.id ? decrypted : m);
            }
            
            if (hasTempVersion) {
              return prev.map(m => {
                if (m.id.startsWith('temp-') && 
                    m.sender_id === newMessage.sender_id && 
                    m.content === newMessage.content) {
                  return decrypted;
                }
                return m;
              });
            }
            
            return [...prev, decrypted];
          });
          
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
        async (payload) => {
          const updated = await decryptMessageContent(payload.new as EncryptedMessage);
          setMessages((prev) =>
            prev.map((msg) => msg.id === payload.new.id ? updated : msg)
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
  }, [chatId, fetchMessages, decryptMessageContent, playMessageSound, user?.id]);

  // Send encrypted message
  const sendMessage = async (
    content: string,
    type: 'text' | 'image' | 'video' | 'voice' | 'file' = 'text',
    mediaUrl?: string
  ) => {
    if (!chatId || !user) return { error: new Error('Not authenticated') };

    const shouldEncrypt = enableE2EE && isInitialized && recipientHasE2EE && recipientId;
    
    let encryptedContent: string | null = null;
    let isEncrypted = false;

    if (shouldEncrypt) {
      try {
        const encrypted = await encrypt(recipientId, content);
        if (encrypted) {
          encryptedContent = encrypted.encryptedContent;
          isEncrypted = true;
        }
      } catch (e) {
        console.warn('Encryption failed, sending unencrypted:', e);
      }
    }

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: EncryptedMessage = {
      id: tempId,
      chat_id: chatId,
      sender_id: user.id,
      content: isEncrypted ? '🔒 Зашифрованное сообщение' : content,
      message_type: type,
      media_url: mediaUrl || null,
      reply_to: null,
      is_read: false,
      is_delivered: false,
      is_encrypted: isEncrypted,
      encrypted_content: encryptedContent,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      decryptedContent: content // We know the original content
    };
    
    setMessages(prev => [...prev, optimisticMessage]);

    // Insert to database
    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: user.id,
        content: isEncrypted ? '🔒 Зашифрованное сообщение' : content,
        message_type: type,
        media_url: mediaUrl || null,
        is_encrypted: isEncrypted,
        encrypted_content: isEncrypted && encryptedContent ? encryptedContent : null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } else if (data) {
      setMessages(prev => prev.map(m => 
        m.id === tempId 
          ? { ...data as EncryptedMessage, decryptedContent: content }
          : m
      ));
    }

    return { error };
  };

  // Upload file
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

    // Note: Editing encrypted messages requires re-encryption
    // For simplicity, we're updating the plain content
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

  // Get displayable content (decrypted or plain)
  const getDisplayContent = (msg: EncryptedMessage): string => {
    if (msg.is_encrypted) {
      return msg.decryptedContent || msg.content || '🔒 Зашифровано';
    }
    return msg.content || '';
  };

  return {
    messages,
    loading,
    uploading,
    loadingMore,
    hasMore,
    loadMoreMessages,
    sendMessage,
    sendMediaMessage,
    sendVoiceMessage,
    markAsRead,
    editMessage,
    deleteMessage,
    refetch: fetchMessages,
    // E2EE status
    isE2EEEnabled: enableE2EE && isInitialized && recipientHasE2EE,
    recipientHasE2EE,
    getDisplayContent
  };
};
