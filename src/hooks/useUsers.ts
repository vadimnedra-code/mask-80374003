import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PublicProfile {
  user_id: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  status: string | null;
  last_seen: string | null;
  bio: string | null;
}

export const useUsers = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<PublicProfile[]>([]);
  const [blockedByUsers, setBlockedByUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch users who have blocked current user (to hide them)
  const fetchBlockedBy = useCallback(async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('blocked_users')
      .select('blocker_id')
      .eq('blocked_id', user.id);
    
    if (data) {
      setBlockedByUsers(data.map(b => b.blocker_id));
    }
  }, [user]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('profiles_public')
        .select('*')
        .order('display_name');

      if (error) {
        console.error('Error fetching users:', error);
      } else {
        setUsers(data as PublicProfile[]);
      }
      setLoading(false);
    };

    fetchUsers();
    fetchBlockedBy();

    // Subscribe to profile changes
    const channel = supabase
      .channel('all-public-profiles')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles_public',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setUsers((prev) => [...prev, payload.new as PublicProfile]);
          } else if (payload.eventType === 'UPDATE') {
            setUsers((prev) =>
              prev.map((u) => (u.user_id === (payload.new as PublicProfile).user_id ? (payload.new as PublicProfile) : u))
            );
          } else if (payload.eventType === 'DELETE') {
            setUsers((prev) => prev.filter((u) => u.user_id !== (payload.old as PublicProfile).user_id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBlockedBy]);

  const searchUsers = useCallback((query: string) => {
    // Filter out users who have blocked the current user
    const availableUsers = users.filter(u => !blockedByUsers.includes(u.user_id));
    
    if (!query.trim()) return availableUsers;
    const lowerQuery = query.toLowerCase();
    return availableUsers.filter(
      (u) =>
        u.display_name.toLowerCase().includes(lowerQuery) ||
        u.username?.toLowerCase().includes(lowerQuery)
    );
  }, [users, blockedByUsers]);

  const getUserById = useCallback((userId: string) => {
    return users.find(u => u.user_id === userId);
  }, [users]);

  return { users, loading, searchUsers, getUserById, refetchBlockedBy: fetchBlockedBy };
};
