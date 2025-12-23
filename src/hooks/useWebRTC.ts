import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CallState {
  callId: string | null;
  status: 'idle' | 'calling' | 'ringing' | 'connecting' | 'active' | 'ended';
  isMuted: boolean;
  remoteUserId: string | null;
  callType: 'voice' | 'video';
}

interface UseWebRTCOptions {
  onCallEnded?: () => void;
  onCallAccepted?: () => void;
  onCallRejected?: () => void;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export const useWebRTC = (options: UseWebRTCOptions = {}) => {
  const { user } = useAuth();
  const [callState, setCallState] = useState<CallState>({
    callId: null,
    status: 'idle',
    isMuted: false,
    remoteUserId: null,
    callType: 'voice',
  });
  
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteAudio = useRef<HTMLAudioElement | null>(null);
  const callSubscription = useRef<any>(null);

  // Initialize remote audio element
  useEffect(() => {
    if (!remoteAudio.current) {
      remoteAudio.current = new Audio();
      remoteAudio.current.autoplay = true;
    }
    
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    console.log('Cleaning up WebRTC resources');
    
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }
    
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    
    if (callSubscription.current) {
      supabase.removeChannel(callSubscription.current);
      callSubscription.current = null;
    }
    
    if (remoteAudio.current) {
      remoteAudio.current.srcObject = null;
    }
    
    setCallState({
      callId: null,
      status: 'idle',
      isMuted: false,
      remoteUserId: null,
      callType: 'voice',
    });
  }, []);

  const setupPeerConnection = useCallback(async (callId: string) => {
    console.log('Setting up peer connection for call:', callId);
    
    peerConnection.current = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    
    // Handle ICE candidates
    peerConnection.current.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log('New ICE candidate:', event.candidate);
        
        // Get current candidates and append new one
        const { data: call } = await supabase
          .from('calls')
          .select('ice_candidates')
          .eq('id', callId)
          .single();
        
        const currentCandidates = (call?.ice_candidates || []) as unknown[];
        const newCandidate = event.candidate.toJSON() as unknown;
        
        await supabase
          .from('calls')
          .update({
            ice_candidates: [...currentCandidates, newCandidate] as any
          })
          .eq('id', callId);
      }
    };
    
    // Handle connection state changes
    peerConnection.current.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnection.current?.connectionState);
      
      if (peerConnection.current?.connectionState === 'connected') {
        setCallState(prev => ({ ...prev, status: 'active' }));
        options.onCallAccepted?.();
      } else if (
        peerConnection.current?.connectionState === 'disconnected' ||
        peerConnection.current?.connectionState === 'failed'
      ) {
        endCall();
      }
    };
    
    // Handle incoming audio stream
    peerConnection.current.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      if (remoteAudio.current && event.streams[0]) {
        remoteAudio.current.srcObject = event.streams[0];
      }
    };
    
    // Get local audio stream
    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      
      localStream.current.getTracks().forEach(track => {
        if (peerConnection.current && localStream.current) {
          peerConnection.current.addTrack(track, localStream.current);
        }
      });
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
    
    return peerConnection.current;
  }, [options]);

  const subscribeToCall = useCallback((callId: string) => {
    console.log('Subscribing to call updates:', callId);
    
    callSubscription.current = supabase
      .channel(`call-${callId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `id=eq.${callId}`,
        },
        async (payload) => {
          const call = payload.new as any;
          console.log('Call update received:', call.status);
          
          // Handle call status changes
          if (call.status === 'rejected') {
            options.onCallRejected?.();
            cleanup();
          } else if (call.status === 'ended') {
            options.onCallEnded?.();
            cleanup();
          } else if (call.status === 'active' && call.answer && peerConnection.current) {
            // Caller receives answer
            if (!peerConnection.current.remoteDescription && call.answer) {
              console.log('Setting remote description (answer)');
              const answer = new RTCSessionDescription(call.answer);
              await peerConnection.current.setRemoteDescription(answer);
            }
          }
          
          // Handle ICE candidates
          if (call.ice_candidates && call.ice_candidates.length > 0 && peerConnection.current) {
            const addedCandidates = new Set<string>();
            
            for (const candidate of call.ice_candidates) {
              const candidateKey = JSON.stringify(candidate);
              if (!addedCandidates.has(candidateKey)) {
                addedCandidates.add(candidateKey);
                try {
                  await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
                  console.log('Added ICE candidate');
                } catch (err) {
                  console.error('Error adding ICE candidate:', err);
                }
              }
            }
          }
        }
      )
      .subscribe();
  }, [cleanup, options]);

  const startCall = useCallback(async (calleeId: string, chatId: string, callType: 'voice' | 'video' = 'voice') => {
    if (!user) return;
    
    console.log('Starting call to:', calleeId);
    
    try {
      // Create call record
      const { data: call, error } = await supabase
        .from('calls')
        .insert({
          caller_id: user.id,
          callee_id: calleeId,
          chat_id: chatId,
          call_type: callType,
          status: 'pending',
        })
        .select()
        .single();
      
      if (error || !call) {
        throw error || new Error('Failed to create call');
      }
      
      setCallState({
        callId: call.id,
        status: 'calling',
        isMuted: false,
        remoteUserId: calleeId,
        callType,
      });
      
      // Setup peer connection and create offer
      const pc = await setupPeerConnection(call.id);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Save offer to database - cast to any for JSON compatibility
      await supabase
        .from('calls')
        .update({ 
          offer: JSON.parse(JSON.stringify(offer)),
          status: 'ringing' 
        })
        .eq('id', call.id);
      
      setCallState(prev => ({ ...prev, status: 'ringing' }));
      
      // Subscribe to call updates
      subscribeToCall(call.id);
      
      return call.id;
    } catch (error) {
      console.error('Error starting call:', error);
      cleanup();
      throw error;
    }
  }, [user, setupPeerConnection, subscribeToCall, cleanup]);

  const acceptCall = useCallback(async (callId: string) => {
    if (!user) return;
    
    console.log('Accepting call:', callId);
    
    try {
      // Get call details
      const { data: call, error } = await supabase
        .from('calls')
        .select('*')
        .eq('id', callId)
        .single();
      
      if (error || !call) {
        throw error || new Error('Call not found');
      }
      
      setCallState({
        callId: call.id,
        status: 'connecting',
        isMuted: false,
        remoteUserId: call.caller_id,
        callType: call.call_type as 'voice' | 'video',
      });
      
      // Setup peer connection
      const pc = await setupPeerConnection(callId);
      
      // Set remote description (offer from caller)
      if (call.offer) {
        const offerData = call.offer as unknown as RTCSessionDescriptionInit;
        const offer = new RTCSessionDescription(offerData);
        await pc.setRemoteDescription(offer);
        
        // Create and set answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        // Save answer and update status - cast to any for JSON compatibility
        await supabase
          .from('calls')
          .update({
            answer: JSON.parse(JSON.stringify(answer)),
            status: 'active',
            started_at: new Date().toISOString(),
          })
          .eq('id', callId);
        
        // Add any pending ICE candidates
        if (call.ice_candidates) {
          for (const candidate of call.ice_candidates as RTCIceCandidateInit[]) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.error('Error adding ICE candidate:', err);
            }
          }
        }
      }
      
      // Subscribe to call updates
      subscribeToCall(callId);
      
    } catch (error) {
      console.error('Error accepting call:', error);
      cleanup();
      throw error;
    }
  }, [user, setupPeerConnection, subscribeToCall, cleanup]);

  const rejectCall = useCallback(async (callId: string) => {
    console.log('Rejecting call:', callId);
    
    await supabase
      .from('calls')
      .update({
        status: 'rejected',
        ended_at: new Date().toISOString(),
      })
      .eq('id', callId);
    
    cleanup();
  }, [cleanup]);

  const endCall = useCallback(async () => {
    if (!callState.callId) return;
    
    console.log('Ending call:', callState.callId);
    
    await supabase
      .from('calls')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
      })
      .eq('id', callState.callId);
    
    options.onCallEnded?.();
    cleanup();
  }, [callState.callId, cleanup, options]);

  const toggleMute = useCallback(() => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
      }
    }
  }, []);

  return {
    callState,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    cleanup,
  };
};
