import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface GroupInvite {
  id: string;
  chat_id: string;
  token: string;
  password_hash: string | null;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  created_by: string;
  created_at: string;
  revoked_at: string | null;
}

export interface CreateInviteOptions {
  password?: string;
  expiresIn?: '10m' | '30m' | '1h' | '1d' | '7d' | 'never';
  maxUses?: number | null;
}

export const useGroupInvites = (chatId: string | null) => {
  const { user } = useAuth();
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvites = useCallback(async () => {
    if (!chatId) {
      setInvites([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('group_invites')
      .select('*')
      .eq('chat_id', chatId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invites:', error);
    }

    setInvites(data || []);
    setLoading(false);
  }, [chatId]);

  useEffect(() => {
    fetchInvites();

    if (!chatId) return;

    const channel = supabase
      .channel(`group-invites-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_invites',
          filter: `chat_id=eq.${chatId}`,
        },
        () => {
          fetchInvites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, fetchInvites]);

  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 16; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };

  const createInvite = useCallback(async (options: CreateInviteOptions = {}) => {
    if (!chatId || !user) return { error: new Error('Not authenticated'), data: null };

    // QR invites are one-time use with TTL 10-30 min by default
    const now = new Date();
    let expiresAt: string;
    if (options.expiresIn && options.expiresIn !== 'never') {
      const durations: Record<string, number> = {
        '10m': 10 * 60 * 1000,
        '30m': 30 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
      };
      expiresAt = new Date(now.getTime() + (durations[options.expiresIn] || 30 * 60 * 1000)).toISOString();
    } else {
      // Default: 30 min TTL for privacy
      expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    }

    const token = generateToken();

    const { data, error } = await supabase
      .from('group_invites')
      .insert({
        chat_id: chatId,
        token,
        password_hash: options.password || null,
        expires_at: expiresAt,
        max_uses: options.maxUses ?? 1, // One-time use by default
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invite:', error);
      return { error, data: null };
    }

    return { error: null, data };
  }, [chatId, user]);

  const revokeInvite = useCallback(async (inviteId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('group_invites')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', inviteId);

    if (error) {
      console.error('Error revoking invite:', error);
      return { error };
    }

    return { error: null };
  }, [user]);

  const joinViaInvite = useCallback(async (token: string, password?: string) => {
    const { data, error } = await supabase
      .rpc('join_group_via_invite', {
        _token: token,
        _password: password || null,
      });

    if (error) {
      console.error('Error joining via invite:', error);
      return { error, chatId: null };
    }

    return { error: null, chatId: data };
  }, []);

  const getInviteLink = useCallback((token: string) => {
    return `${window.location.origin}/join/${token}`;
  }, []);

  const getActiveInvite = useCallback(() => {
    return invites.find((invite) => {
      if (invite.revoked_at) return false;
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) return false;
      if (invite.max_uses && invite.use_count >= invite.max_uses) return false;
      return true;
    });
  }, [invites]);

  return {
    invites,
    loading,
    createInvite,
    revokeInvite,
    joinViaInvite,
    getInviteLink,
    getActiveInvite,
    refetch: fetchInvites,
  };
};
