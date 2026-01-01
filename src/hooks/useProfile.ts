import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  status: 'online' | 'offline' | 'away';
  last_seen: string;
  bio: string | null;
  phone: string | null;
}

export const useProfile = (userId?: string) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef(userId);
  
  // Keep ref in sync
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
    } else {
      setProfile(data as Profile);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchProfile();

    if (!userId) return;

    // Subscribe to profile changes
    const channel = supabase
      .channel(`profile-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setProfile(payload.new as Profile);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchProfile]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    const currentUserId = userIdRef.current;
    if (!currentUserId) return { error: new Error('No user ID') };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', currentUserId);

    return { error };
  }, []);

  const updateStatus = useCallback(async (status: 'online' | 'offline' | 'away') => {
    const currentUserId = userIdRef.current;
    if (!currentUserId) return;

    await supabase
      .from('profiles')
      .update({ status, last_seen: new Date().toISOString() })
      .eq('user_id', currentUserId);
  }, []);

  return { profile, loading, updateProfile, updateStatus, refetch: fetchProfile };
};
