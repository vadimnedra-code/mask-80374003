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
  const hydrateRef = useRef<(call: any) => Promise<void>>(async () => {});

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  const hydrateIncomingCall = useCallback(
    async (call: any) => {
      if (!user) return;
      if (!call) return;

      if (call.status !== 'pending' && call.status !== 'ringing') return;

      const { data: callerProfile } = await supabase
        .from('profiles_public')
        .select('display_name, avatar_url')
        .eq('user_id', call.caller_id)
        .maybeSingle();

      setIncomingCall({
        id: call.id,
        caller_id: call.caller_id,
        callee_id: call.callee_id,
        chat_id: call.chat_id,
        call_type: (call.call_type as 'voice' | 'video') ?? 'voice',
        status: call.status,
        caller_name: callerProfile?.display_name || 'Неизвестный',
        caller_avatar:
          callerProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${call.caller_id}`,
      });
    },
    [user]
  );

  // Keep ref in sync so realtime callback uses latest version
  useEffect(() => {
    hydrateRef.current = hydrateIncomingCall;
  }, [hydrateIncomingCall]);

  useEffect(() => {
    if (!user) return;

    console.log('Setting up incoming call listener for user:', user.id);

    const fetchLatestIncoming = async () => {
      try {
        const { data: call } = await supabase
          .from('calls')
          .select('*')
          .eq('callee_id', user.id)
          .in('status', ['pending', 'ringing'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (call) {
          console.log('Found existing incoming call:', call.id, 'status:', call.status);
          await hydrateRef.current(call);
        }
      } catch (err) {
        console.error('Error fetching latest incoming call:', err);
      }
    };

    fetchLatestIncoming();

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
          await hydrateRef.current(call);
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
        async (payload) => {
          const call = payload.new as any;
          console.log('Call UPDATE received:', call.id, 'status:', call.status);

          if (call.status === 'pending' || call.status === 'ringing') {
            await hydrateRef.current(call);
            return;
          }

          const currentCall = incomingCallRef.current;
          if (currentCall?.id === call.id) {
            console.log('Clearing incoming call (status changed to:', call.status, ')');
            setIncomingCall(null);
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
  }, [user?.id]); // Only re-subscribe when user identity changes

  const clearIncomingCall = useCallback(() => {
    console.log('Manually clearing incoming call');
    setIncomingCall(null);
  }, []);

  return {
    incomingCall,
    clearIncomingCall,
  };
};
