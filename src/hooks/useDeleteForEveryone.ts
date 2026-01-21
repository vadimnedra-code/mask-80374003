import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const DELETE_FOR_EVERYONE_LIMIT_HOURS = 48;

export const useDeleteForEveryone = () => {
  const { user } = useAuth();

  const canDeleteForEveryone = useCallback((messageCreatedAt: string | Date, senderId: string) => {
    if (!user) return false;
    if (senderId !== user.id) return false;

    const createdAt = new Date(messageCreatedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    return hoursDiff <= DELETE_FOR_EVERYONE_LIMIT_HOURS;
  }, [user]);

  const deleteForEveryone = useCallback(async (messageId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    // First verify the message belongs to the user and is within time limit
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('sender_id, created_at')
      .eq('id', messageId)
      .single();

    if (fetchError || !message) {
      return { error: new Error('Message not found') };
    }

    if (!canDeleteForEveryone(message.created_at, message.sender_id)) {
      return { error: new Error('Cannot delete this message for everyone') };
    }

    // Update the message to mark as deleted for everyone
    const { error } = await supabase
      .from('messages')
      .update({
        deleted_for_everyone: true,
        deleted_at: new Date().toISOString(),
        content: null,
        media_url: null,
        encrypted_content: null,
      })
      .eq('id', messageId)
      .eq('sender_id', user.id);

    if (error) {
      console.error('Error deleting for everyone:', error);
      return { error };
    }

    return { error: null };
  }, [user, canDeleteForEveryone]);

  const getRemainingTime = useCallback((messageCreatedAt: string | Date) => {
    const createdAt = new Date(messageCreatedAt);
    const deadline = new Date(createdAt.getTime() + DELETE_FOR_EVERYONE_LIMIT_HOURS * 60 * 60 * 1000);
    const now = new Date();
    const remaining = deadline.getTime() - now.getTime();

    if (remaining <= 0) return null;

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}ч ${minutes}м`;
    }
    return `${minutes}м`;
  }, []);

  return {
    canDeleteForEveryone,
    deleteForEveryone,
    getRemainingTime,
  };
};
