import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ContactNickname {
  id: string;
  user_id: string;
  contact_user_id: string;
  nickname: string;
}

export const useContactNicknames = () => {
  const { user } = useAuth();
  const [nicknames, setNicknames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchNicknames = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('contact_nicknames')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching nicknames:', error);
      return;
    }

    const nicknameMap = new Map<string, string>();
    (data || []).forEach((n: ContactNickname) => {
      nicknameMap.set(n.contact_user_id, n.nickname);
    });
    setNicknames(nicknameMap);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNicknames();

    if (!user) return;

    // Subscribe to changes
    const channel = supabase
      .channel('contact-nicknames-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_nicknames',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNicknames();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNicknames]);

  const setNickname = useCallback(async (contactUserId: string, nickname: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const trimmedNickname = nickname.trim();

    if (!trimmedNickname) {
      // If empty, remove the nickname
      const { error } = await supabase
        .from('contact_nicknames')
        .delete()
        .eq('user_id', user.id)
        .eq('contact_user_id', contactUserId);

      if (error) {
        console.error('Error removing nickname:', error);
        return { error };
      }

      setNicknames(prev => {
        const newMap = new Map(prev);
        newMap.delete(contactUserId);
        return newMap;
      });

      return { error: null };
    }

    // Upsert nickname
    const { error } = await supabase
      .from('contact_nicknames')
      .upsert({
        user_id: user.id,
        contact_user_id: contactUserId,
        nickname: trimmedNickname,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,contact_user_id',
      });

    if (error) {
      console.error('Error setting nickname:', error);
      return { error };
    }

    setNicknames(prev => {
      const newMap = new Map(prev);
      newMap.set(contactUserId, trimmedNickname);
      return newMap;
    });

    return { error: null };
  }, [user]);

  const getNickname = useCallback((contactUserId: string) => {
    return nicknames.get(contactUserId) || null;
  }, [nicknames]);

  const getDisplayName = useCallback((contactUserId: string, originalName: string) => {
    return nicknames.get(contactUserId) || originalName;
  }, [nicknames]);

  return {
    nicknames,
    loading,
    setNickname,
    getNickname,
    getDisplayName,
    refetch: fetchNicknames,
  };
};
