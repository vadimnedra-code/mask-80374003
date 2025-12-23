import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const [users, setUsers] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);

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
