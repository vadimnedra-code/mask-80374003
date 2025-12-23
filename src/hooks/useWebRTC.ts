import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CallState {
  callId: string | null;
  status: 'idle' | 'calling' | 'ringing' | 'connecting' | 'active' | 'ended';
  isMuted: boolean;
  isVideoOff: boolean;
  remoteUserId: string | null;
  callType: 'voice' | 'video';
}

interface UseWebRTCOptions {
  onCallEnded?: () => void;
  onCallAccepted?: () => void;
  onCallRejected?: () => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onLocalStream?: (stream: MediaStream) => void;
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
    isVideoOff: false,
    remoteUserId: null,
    callType: 'voice',
  });
  
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const callSubscription = useRef<any>(null);
  const currentCallType = useRef<'voice' | 'video'>('voice');

  useEffect(() => {
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
    
    if (remoteStream.current) {
      remoteStream.current = null;
    }
    
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    
    if (callSubscription.current) {
      supabase.removeChannel(callSubscription.current);
      callSubscription.current = null;
    }
    
    setCallState({
      callId: null,
      status: 'idle',
      isMuted: false,
      isVideoOff: false,
      remoteUserId: null,
      callType: 'voice',
    });
  }, []);

  const setupPeerConnection = useCallback(async (callId: string, callType: 'voice' | 'video') => {
    console.log('Setting up peer connection for call:', callId, 'type:', callType);
    currentCallType.current = callType;
    
    peerConnection.current = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    
    // Handle ICE candidates
    peerConnection.current.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log('New ICE candidate:', event.candidate);
        
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
    
    // Handle incoming remote stream
    peerConnection.current.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      if (event.streams[0]) {
        remoteStream.current = event.streams[0];
        options.onRemoteStream?.(event.streams[0]);
      }
    };
    
    // Get local media stream
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: callType === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        } : false,
      };
      
      localStream.current = await navigator.mediaDevices.getUserMedia(constraints);
      options.onLocalStream?.(localStream.current);
      
      localStream.current.getTracks().forEach(track => {
        if (peerConnection.current && localStream.current) {
          peerConnection.current.addTrack(track, localStream.current);
        }
      });
    } catch (error) {
      console.error('Error accessing media devices:', error);
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
          
          if (call.status === 'rejected') {
            options.onCallRejected?.();
            cleanup();
          } else if (call.status === 'ended') {
            options.onCallEnded?.();
            cleanup();
          } else if (call.status === 'active' && call.answer && peerConnection.current) {
            if (!peerConnection.current.remoteDescription && call.answer) {
              console.log('Setting remote description (answer)');
              const answer = new RTCSessionDescription(call.answer);
              await peerConnection.current.setRemoteDescription(answer);
            }
          }
          
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
    
    console.log('Starting call to:', calleeId, 'type:', callType);
    
    try {
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
        isVideoOff: false,
        remoteUserId: calleeId,
        callType,
      });
      
      const pc = await setupPeerConnection(call.id, callType);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      await supabase
        .from('calls')
        .update({ 
          offer: JSON.parse(JSON.stringify(offer)),
          status: 'ringing' 
        })
        .eq('id', call.id);
      
      setCallState(prev => ({ ...prev, status: 'ringing' }));
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
      const { data: call, error } = await supabase
        .from('calls')
        .select('*')
        .eq('id', callId)
        .single();
      
      if (error || !call) {
        throw error || new Error('Call not found');
      }
      
      const callType = call.call_type as 'voice' | 'video';
      
      setCallState({
        callId: call.id,
        status: 'connecting',
        isMuted: false,
        isVideoOff: false,
        remoteUserId: call.caller_id,
        callType,
      });
      
      const pc = await setupPeerConnection(callId, callType);
      
      if (call.offer) {
        const offerData = call.offer as unknown as RTCSessionDescriptionInit;
        const offer = new RTCSessionDescription(offerData);
        await pc.setRemoteDescription(offer);
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        await supabase
          .from('calls')
          .update({
            answer: JSON.parse(JSON.stringify(answer)),
            status: 'active',
            started_at: new Date().toISOString(),
          })
          .eq('id', callId);
        
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

  const toggleVideo = useCallback(() => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCallState(prev => ({ ...prev, isVideoOff: !videoTrack.enabled }));
      }
    }
  }, []);

  const getLocalStream = useCallback(() => localStream.current, []);
  const getRemoteStream = useCallback(() => remoteStream.current, []);

  return {
    callState,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    getLocalStream,
    getRemoteStream,
    cleanup,
  };
};
