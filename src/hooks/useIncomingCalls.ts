import { useState, useEffect, useCallback, useRef } from 'react';
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
  const incomingCallRef = useRef<IncomingCall | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  useEffect(() => {
    if (!user) return;

    console.log('Setting up incoming call listener for user:', user.id);

    // Subscribe to new calls where user is the callee
    const channel = supabase
      .channel(`incoming-calls-${user.id}`)
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
          console.log('Incoming call INSERT received:', call.id, 'status:', call.status);
          
          if (call.status === 'pending' || call.status === 'ringing') {
            // Fetch caller info
            const { data: callerProfile } = await supabase
              .from('profiles_public')
              .select('display_name, avatar_url')
              .eq('user_id', call.caller_id)
              .maybeSingle();
            
            const newCall = {
              id: call.id,
              caller_id: call.caller_id,
              callee_id: call.callee_id,
              chat_id: call.chat_id,
              call_type: call.call_type,
              status: call.status,
              caller_name: callerProfile?.display_name || 'Неизвестный',
              caller_avatar: callerProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${call.caller_id}`,
            };
            
            console.log('Setting incoming call:', newCall.id);
            setIncomingCall(newCall);
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
          console.log('Call UPDATE received:', call.id, 'status:', call.status);
          
          // Clear incoming call if it's no longer ringing
          if (call.status !== 'pending' && call.status !== 'ringing') {
            const currentCall = incomingCallRef.current;
            if (currentCall?.id === call.id) {
              console.log('Clearing incoming call (status changed to:', call.status, ')');
              setIncomingCall(null);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Incoming calls subscription status:', status);
      });

    return () => {
      console.log('Removing incoming calls channel');
      supabase.removeChannel(channel);
    };
  }, [user]);

  const clearIncomingCall = useCallback(() => {
    console.log('Manually clearing incoming call');
    setIncomingCall(null);
  }, []);

  return {
    incomingCall,
    clearIncomingCall,
  };
};
