import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type GroupRole = 'owner' | 'admin' | 'member';

export interface Participant {
  user_id: string;
  role: GroupRole;
  display_name: string;
  avatar_url: string | null;
}

export const useGroupRoles = (chatId: string | null) => {
  const { user } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myRole, setMyRole] = useState<GroupRole>('member');
  const [loading, setLoading] = useState(true);

  const fetchParticipants = useCallback(async () => {
    if (!chatId || !user) {
      setLoading(false);
      return;
    }

    const { data: participantsData, error } = await supabase
      .from('chat_participants')
      .select('user_id, role')
      .eq('chat_id', chatId);

    if (error) {
      console.error('Error fetching participants:', error);
      setLoading(false);
      return;
    }

    // Get profiles for participants
    const userIds = participantsData.map((p) => p.user_id);
    const { data: profiles } = await supabase
      .from('profiles_public')
      .select('user_id, display_name, avatar_url')
      .in('user_id', userIds);

    const profilesMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    const enrichedParticipants: Participant[] = participantsData.map((p) => {
      const profile = profilesMap.get(p.user_id);
      return {
        user_id: p.user_id,
        role: (p.role as GroupRole) || 'member',
        display_name: profile?.display_name || 'Unknown',
        avatar_url: profile?.avatar_url || null,
      };
    });

    setParticipants(enrichedParticipants);
    
    const myParticipation = enrichedParticipants.find((p) => p.user_id === user.id);
    setMyRole(myParticipation?.role || 'member');
    
    setLoading(false);
  }, [chatId, user]);

  useEffect(() => {
    fetchParticipants();

    if (!chatId) return;

    const channel = supabase
      .channel(`group-roles-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_participants',
          filter: `chat_id=eq.${chatId}`,
        },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, fetchParticipants]);

  const canManageParticipants = useCallback(() => {
    return myRole === 'owner' || myRole === 'admin';
  }, [myRole]);

  const canChangeRole = useCallback((targetRole: GroupRole) => {
    if (myRole === 'owner') return true;
    if (myRole === 'admin' && targetRole === 'member') return true;
    return false;
  }, [myRole]);

  const setRole = useCallback(async (userId: string, newRole: GroupRole) => {
    if (!chatId || !user) return { error: new Error('Not authenticated') };

    // Owners can't be demoted by anyone except themselves
    const targetParticipant = participants.find((p) => p.user_id === userId);
    if (targetParticipant?.role === 'owner' && userId !== user.id) {
      return { error: new Error('Cannot change owner role') };
    }

    const { error } = await supabase
      .from('chat_participants')
      .update({ role: newRole })
      .eq('chat_id', chatId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error setting role:', error);
      return { error };
    }

    return { error: null };
  }, [chatId, user, participants]);

  const removeParticipant = useCallback(async (userId: string) => {
    if (!chatId || !user) return { error: new Error('Not authenticated') };

    if (!canManageParticipants()) {
      return { error: new Error('Not authorized') };
    }

    // Can't remove owner
    const targetParticipant = participants.find((p) => p.user_id === userId);
    if (targetParticipant?.role === 'owner') {
      return { error: new Error('Cannot remove owner') };
    }

    // Admins can't remove other admins
    if (myRole === 'admin' && targetParticipant?.role === 'admin') {
      return { error: new Error('Admins cannot remove other admins') };
    }

    const { error } = await supabase
      .from('chat_participants')
      .delete()
      .eq('chat_id', chatId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing participant:', error);
      return { error };
    }

    return { error: null };
  }, [chatId, user, canManageParticipants, myRole, participants]);

  const transferOwnership = useCallback(async (newOwnerId: string) => {
    if (!chatId || !user) return { error: new Error('Not authenticated') };

    if (myRole !== 'owner') {
      return { error: new Error('Only owner can transfer ownership') };
    }

    // Set new owner
    const { error: newOwnerError } = await supabase
      .from('chat_participants')
      .update({ role: 'owner' })
      .eq('chat_id', chatId)
      .eq('user_id', newOwnerId);

    if (newOwnerError) {
      return { error: newOwnerError };
    }

    // Demote current owner to admin
    const { error: demoteError } = await supabase
      .from('chat_participants')
      .update({ role: 'admin' })
      .eq('chat_id', chatId)
      .eq('user_id', user.id);

    if (demoteError) {
      return { error: demoteError };
    }

    return { error: null };
  }, [chatId, user, myRole]);

  return {
    participants,
    myRole,
    loading,
    canManageParticipants,
    canChangeRole,
    setRole,
    removeParticipant,
    transferOwnership,
    refetch: fetchParticipants,
  };
};
