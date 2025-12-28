import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const permissionGrantedRef = useRef(false);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.log('Push notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      permissionGrantedRef.current = true;
      return true;
    }

    if (Notification.permission === 'denied') {
      console.log('Notification permission denied');
      return false;
    }

    const permission = await Notification.requestPermission();
    permissionGrantedRef.current = permission === 'granted';
    return permissionGrantedRef.current;
  }, []);

  // Show notification
  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!permissionGrantedRef.current && Notification.permission !== 'granted') {
      return;
    }

    // Don't show if document is visible
    if (document.visibilityState === 'visible') {
      return;
    }

    try {
      new Notification(title, {
        icon: '/app-icon.png',
        badge: '/app-icon.png',
        ...options,
      });
    } catch (err) {
      console.error('Error showing notification:', err);
    }
  }, []);

  // Subscribe to new messages
  useEffect(() => {
    if (!user) return;

    // Request permission on mount
    requestPermission();

    // Listen for new messages
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const message = payload.new as {
            id: string;
            sender_id: string;
            content: string | null;
            message_type: string;
            chat_id: string;
          };

          // Don't notify for own messages
          if (message.sender_id === user.id) return;

          // Check if user is participant of this chat
          const { data: participant } = await supabase
            .from('chat_participants')
            .select('id')
            .eq('chat_id', message.chat_id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (!participant) return;

          // Get sender info
          const { data: sender } = await supabase
            .from('profiles_public')
            .select('display_name, avatar_url')
            .eq('user_id', message.sender_id)
            .maybeSingle();

          // Prepare notification content
          let body = message.content || '';
          if (message.message_type === 'image') {
            body = '📷 Изображение';
          } else if (message.message_type === 'video') {
            body = '🎥 Видео';
          } else if (message.message_type === 'voice') {
            body = '🎤 Голосовое сообщение';
          } else if (message.message_type === 'file') {
            body = '📎 Файл';
          }

          showNotification(sender?.display_name || 'Новое сообщение', {
            body,
            tag: message.chat_id,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, requestPermission, showNotification]);

  return {
    requestPermission,
    showNotification,
    isSupported: 'Notification' in window,
    permission: typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  };
};
