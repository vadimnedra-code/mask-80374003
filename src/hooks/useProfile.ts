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
    } else if (data) {
      // Phone lives in a private, owner-only table
      const { data: privateData } = await supabase
        .from('user_private_data')
        .select('phone')
        .eq('user_id', userId)
        .maybeSingle();

      setProfile({ ...data, phone: privateData?.phone ?? null } as Profile);
    } else {
      setProfile(null);
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

    const { phone, ...profileUpdates } = updates;

    let error: Error | null = null;

    if (Object.keys(profileUpdates).length > 0) {
      const res = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('user_id', currentUserId);
      error = res.error;
    }

    // Phone is stored in a private, owner-only table
    if (!error && phone !== undefined) {
      const res = await supabase
        .from('user_private_data')
        .upsert({ user_id: currentUserId, phone }, { onConflict: 'user_id' });
      error = res.error;
    }

    // Auto-register phone hash for contact discovery
    if (!error && phone) {
      try {
        const normalized = phone.replace(/[^\d+]/g, '');
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(normalized.startsWith('+') ? normalized : '+' + normalized));
        const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        await supabase.from('phone_hashes').upsert({ user_id: currentUserId, phone_hash: hash }, { onConflict: 'user_id' });
      } catch (e) {
        console.warn('[useProfile] Phone hash registration failed:', e);
      }
    }

    return { error };
  }, []);

  const updateStatus = useCallback(async (status: 'online' | 'offline' | 'away') => {
    const currentUserId = userIdRef.current;
    if (!currentUserId) return;

    // Batch status update with last_seen to reduce network calls
    try {
      await supabase
        .from('profiles')
        .update({ status, last_seen: new Date().toISOString() })
        .eq('user_id', currentUserId);
    } catch (err) {
      // Silently fail - status updates are not critical
      console.warn('[useProfile] Status update failed:', err);
    }
  }, []);

  return { profile, loading, updateProfile, updateStatus, refetch: fetchProfile };
};
