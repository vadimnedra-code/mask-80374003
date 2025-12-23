import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface IncomingCall {
  id: string;
  caller_id: string;
  callee_id: string;
  chat_id: string;
  call_type: 'voice' | 'video';
  status: string;
  caller_name?: string;
  caller_avatar?: string;
}

export const useIncomingCalls = () => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  useEffect(() => {
    if (!user) return;

    console.log('Setting up incoming call listener for user:', user.id);

    // Subscribe to new calls where user is the callee
    const channel = supabase
      .channel('incoming-calls')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
          filter: `callee_id=eq.${user.id}`,
        },
        async (payload) => {
          const call = payload.new as any;
          console.log('Incoming call received:', call);
          
          if (call.status === 'pending' || call.status === 'ringing') {
            // Fetch caller info
            const { data: callerProfile } = await supabase
              .from('profiles_public')
              .select('display_name, avatar_url')
              .eq('user_id', call.caller_id)
              .single();
            
            setIncomingCall({
              id: call.id,
              caller_id: call.caller_id,
              callee_id: call.callee_id,
              chat_id: call.chat_id,
              call_type: call.call_type,
              status: call.status,
              caller_name: callerProfile?.display_name || 'Unknown',
              caller_avatar: callerProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${call.caller_id}`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `callee_id=eq.${user.id}`,
        },
        (payload) => {
          const call = payload.new as any;
          console.log('Call status updated:', call.status);
          
          // Clear incoming call if it's no longer ringing
          if (call.status !== 'pending' && call.status !== 'ringing') {
            if (incomingCall?.id === call.id) {
              setIncomingCall(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, incomingCall?.id]);

  const clearIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  return {
    incomingCall,
    clearIncomingCall,
  };
};
