import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export const useBlockedUsers = () => {
  const { user } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBlockedUsers = useCallback(async () => {
    if (!user) {
      setBlockedUsers([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('blocked_users')
      .select('*')
      .eq('blocker_id', user.id);

    if (error) {
      console.error('Error fetching blocked users:', error);
    } else {
      setBlockedUsers(data as BlockedUser[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchBlockedUsers();

    if (!user) return;

    // Subscribe to changes
    const channel = supabase
      .channel('blocked-users-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blocked_users',
          filter: `blocker_id=eq.${user.id}`,
        },
        () => {
          fetchBlockedUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchBlockedUsers]);

  const blockUser = useCallback(async (userId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('blocked_users')
      .insert({ blocker_id: user.id, blocked_id: userId });

    if (!error) {
      await fetchBlockedUsers();
    }

    return { error };
  }, [user, fetchBlockedUsers]);

  const unblockUser = useCallback(async (userId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', userId);

    if (!error) {
      await fetchBlockedUsers();
    }

    return { error };
  }, [user, fetchBlockedUsers]);

  const isBlocked = useCallback((userId: string) => {
    return blockedUsers.some(b => b.blocked_id === userId);
  }, [blockedUsers]);

  return { 
    blockedUsers, 
    loading, 
    blockUser, 
    unblockUser, 
    isBlocked,
    refetch: fetchBlockedUsers 
  };
};
