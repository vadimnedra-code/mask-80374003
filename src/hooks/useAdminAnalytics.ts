import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AdminAnalytics {
  total_users: number;
  online_users: number;
  total_chats: number;
  total_messages: number;
  messages_today: number;
  messages_week: number;
  new_users_today: number;
  new_users_week: number;
  active_calls: number;
  group_chats: number;
  messages_by_day: { date: string; count: number }[] | null;
  users_by_day: { date: string; count: number }[] | null;
}

export const useAdminAnalytics = () => {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuth();

  const checkAdminRole = useCallback(async () => {
    if (!user?.id) {
      setIsAdmin(false);
      return false;
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (error) {
      console.error('Error checking admin role:', error);
      setIsAdmin(false);
      return false;
    }

    const hasAdminRole = !!data;
    setIsAdmin(hasAdminRole);
    return hasAdminRole;
  }, [user?.id]);

  const fetchAnalytics = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const hasRole = await checkAdminRole();
      if (!hasRole) {
        setError('Access denied: admin role required');
        setLoading(false);
        return;
      }

      const { data, error: rpcError } = await supabase.rpc('get_admin_analytics');

      if (rpcError) {
        console.error('Error fetching analytics:', rpcError);
        setError(rpcError.message);
        setLoading(false);
        return;
      }

      setAnalytics(data as unknown as AdminAnalytics);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [user?.id, checkAdminRole]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Subscribe to realtime changes for live updates
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin_analytics')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => fetchAnalytics()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => fetchAnalytics()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, fetchAnalytics]);

  return {
    analytics,
    loading,
    error,
    isAdmin,
    refetch: fetchAnalytics,
  };
};
