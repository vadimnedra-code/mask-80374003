import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from './useProfile';

export const useUsers = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('display_name');

      if (error) {
        console.error('Error fetching users:', error);
      } else {
        setUsers(data as Profile[]);
      }
      setLoading(false);
    };

    fetchUsers();

    // Subscribe to profile changes
    const channel = supabase
      .channel('all-profiles')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setUsers((prev) => [...prev, payload.new as Profile]);
          } else if (payload.eventType === 'UPDATE') {
            setUsers((prev) =>
              prev.map((u) => (u.user_id === (payload.new as Profile).user_id ? (payload.new as Profile) : u))
            );
          } else if (payload.eventType === 'DELETE') {
            setUsers((prev) => prev.filter((u) => u.user_id !== (payload.old as Profile).user_id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const searchUsers = (query: string) => {
    if (!query.trim()) return users;
    const lowerQuery = query.toLowerCase();
    return users.filter(
      (u) =>
        u.display_name.toLowerCase().includes(lowerQuery) ||
        u.username?.toLowerCase().includes(lowerQuery)
    );
  };

  return { users, loading, searchUsers };
};
