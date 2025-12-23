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
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

interface UseWebRTCOptions {
  onCallEnded?: () => void;
  onCallAccepted?: () => void;
  onCallRejected?: () => void;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
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
    localStream: null,
    remoteStream: null,
  });
  
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const callSubscription = useRef<any>(null);
  const processedCandidates = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    console.log('Cleaning up WebRTC resources');
    
    // Stop all tracks on local stream
    if (callState.localStream) {
      callState.localStream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
    }
    
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    
    if (callSubscription.current) {
      supabase.removeChannel(callSubscription.current);
      callSubscription.current = null;
    }
    
    processedCandidates.current.clear();
    
    setCallState({
      callId: null,
      status: 'idle',
      isMuted: false,
      isVideoOff: false,
      remoteUserId: null,
      callType: 'voice',
      localStream: null,
      remoteStream: null,
    });
  }, [callState.localStream]);

  const getMediaStream = useCallback(async (callType: 'voice' | 'video'): Promise<MediaStream> => {
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: callType === 'video' ? {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        facingMode: 'user',
        frameRate: { ideal: 30 },
      } : false,
    };
    
    console.log('Requesting media with constraints:', constraints);
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log('Got media stream:', stream.getTracks().map(t => t.kind));
    return stream;
  }, []);

  const setupPeerConnection = useCallback(async (callId: string, callType: 'voice' | 'video', existingStream?: MediaStream) => {
    console.log('Setting up peer connection for call:', callId, 'type:', callType);
    
    // Create peer connection
    peerConnection.current = new RTCPeerConnection({ 
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
    });
    
    // Handle ICE candidates
    peerConnection.current.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log('New ICE candidate:', event.candidate.candidate?.substring(0, 50));
        
        try {
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
        } catch (err) {
          console.error('Error saving ICE candidate:', err);
        }
      }
    };
    
    // Handle ICE connection state
    peerConnection.current.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', peerConnection.current?.iceConnectionState);
    };
    
    // Handle connection state changes
    peerConnection.current.onconnectionstatechange = () => {
      const state = peerConnection.current?.connectionState;
      console.log('Connection state:', state);
      
      if (state === 'connected') {
        setCallState(prev => ({ ...prev, status: 'active' }));
        options.onCallAccepted?.();
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        console.log('Connection ended with state:', state);
      }
    };
    
    // Handle incoming remote stream
    peerConnection.current.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind, event.streams.length);
      if (event.streams[0]) {
        console.log('Setting remote stream');
        setCallState(prev => ({ ...prev, remoteStream: event.streams[0] }));
      }
    };
    
    // Get or use existing local stream
    const stream = existingStream || await getMediaStream(callType);
    setCallState(prev => ({ ...prev, localStream: stream }));
    
    // Add tracks to peer connection
    stream.getTracks().forEach(track => {
      if (peerConnection.current) {
        console.log('Adding track to peer connection:', track.kind);
        peerConnection.current.addTrack(track, stream);
      }
    });
    
    return peerConnection.current;
  }, [getMediaStream, options]);

  const subscribeToCall = useCallback((callId: string, isCaller: boolean) => {
    console.log('Subscribing to call updates:', callId, 'isCaller:', isCaller);
    
    callSubscription.current = supabase
      .channel(`call-${callId}-${Date.now()}`)
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
          console.log('Call update received:', call.status, 'hasAnswer:', !!call.answer);
          
          if (call.status === 'rejected') {
            console.log('Call was rejected');
            options.onCallRejected?.();
            cleanup();
            return;
          }
          
          if (call.status === 'ended') {
            console.log('Call was ended');
            options.onCallEnded?.();
            cleanup();
            return;
          }
          
          // If caller and answer received, set remote description
          if (isCaller && call.status === 'active' && call.answer && peerConnection.current) {
            if (!peerConnection.current.remoteDescription) {
              console.log('Setting remote description (answer)');
              try {
                const answer = new RTCSessionDescription(call.answer);
                await peerConnection.current.setRemoteDescription(answer);
                console.log('Remote description set successfully');
              } catch (err) {
                console.error('Error setting remote description:', err);
              }
            }
          }
          
          // Process ICE candidates
          if (call.ice_candidates && call.ice_candidates.length > 0 && peerConnection.current) {
            for (const candidate of call.ice_candidates) {
              const candidateKey = JSON.stringify(candidate);
              if (!processedCandidates.current.has(candidateKey)) {
                processedCandidates.current.add(candidateKey);
                try {
                  if (peerConnection.current.remoteDescription) {
                    await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
                    console.log('Added ICE candidate');
                  }
                } catch (err) {
                  console.error('Error adding ICE candidate:', err);
                }
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Call subscription status:', status);
      });
  }, [cleanup, options]);

  const startCall = useCallback(async (calleeId: string, chatId: string, callType: 'voice' | 'video' = 'voice') => {
    if (!user) return;
    
    console.log('Starting call to:', calleeId, 'type:', callType);
    
    try {
      // Get media stream first
      const stream = await getMediaStream(callType);
      
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
        stream.getTracks().forEach(t => t.stop());
        throw error || new Error('Failed to create call');
      }
      
      setCallState({
        callId: call.id,
        status: 'calling',
        isMuted: false,
        isVideoOff: false,
        remoteUserId: calleeId,
        callType,
        localStream: stream,
        remoteStream: null,
      });
      
      // Setup peer connection with existing stream
      const pc = await setupPeerConnection(call.id, callType, stream);
      
      // Create offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video',
      });
      await pc.setLocalDescription(offer);
      console.log('Created offer');
      
      // Update call with offer
      await supabase
        .from('calls')
        .update({ 
          offer: JSON.parse(JSON.stringify(offer)),
          status: 'ringing' 
        })
        .eq('id', call.id);
      
      setCallState(prev => ({ ...prev, status: 'ringing' }));
      
      // Subscribe to call updates
      subscribeToCall(call.id, true);
      
      return call.id;
    } catch (error) {
      console.error('Error starting call:', error);
      cleanup();
      throw error;
    }
  }, [user, getMediaStream, setupPeerConnection, subscribeToCall, cleanup]);

  const acceptCall = useCallback(async (callId: string) => {
    if (!user) return;
    
    console.log('Accepting call:', callId);
    
    try {
      // Fetch call details
      const { data: call, error } = await supabase
        .from('calls')
        .select('*')
        .eq('id', callId)
        .single();
      
      if (error || !call) {
        throw error || new Error('Call not found');
      }
      
      const callType = call.call_type as 'voice' | 'video';
      
      // Get media stream
      const stream = await getMediaStream(callType);
      
      setCallState({
        callId: call.id,
        status: 'connecting',
        isMuted: false,
        isVideoOff: false,
        remoteUserId: call.caller_id,
        callType,
        localStream: stream,
        remoteStream: null,
      });
      
      // Setup peer connection
      const pc = await setupPeerConnection(callId, callType, stream);
      
      // Set remote description (offer)
      if (call.offer) {
        console.log('Setting remote description (offer)');
        const offerData = call.offer as unknown as RTCSessionDescriptionInit;
        await pc.setRemoteDescription(new RTCSessionDescription(offerData));
        
        // Create answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log('Created answer');
        
        // Update call with answer
        await supabase
          .from('calls')
          .update({
            answer: JSON.parse(JSON.stringify(answer)),
            status: 'active',
            started_at: new Date().toISOString(),
          })
          .eq('id', callId);
        
        // Process existing ICE candidates
        if (call.ice_candidates) {
          for (const candidate of call.ice_candidates as RTCIceCandidateInit[]) {
            const candidateKey = JSON.stringify(candidate);
            if (!processedCandidates.current.has(candidateKey)) {
              processedCandidates.current.add(candidateKey);
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
                console.log('Added existing ICE candidate');
              } catch (err) {
                console.error('Error adding ICE candidate:', err);
              }
            }
          }
        }
      }
      
      // Subscribe to updates
      subscribeToCall(callId, false);
      
    } catch (error) {
      console.error('Error accepting call:', error);
      cleanup();
      throw error;
    }
  }, [user, getMediaStream, setupPeerConnection, subscribeToCall, cleanup]);

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
    if (callState.localStream) {
      const audioTrack = callState.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
        console.log('Mute toggled:', !audioTrack.enabled);
      }
    }
  }, [callState.localStream]);

  const toggleVideo = useCallback(() => {
    if (callState.localStream) {
      const videoTrack = callState.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCallState(prev => ({ ...prev, isVideoOff: !videoTrack.enabled }));
        console.log('Video toggled:', !videoTrack.enabled);
      }
    }
  }, [callState.localStream]);

  const switchCamera = useCallback(async () => {
    if (!callState.localStream || callState.callType !== 'video') return;
    
    const videoTrack = callState.localStream.getVideoTracks()[0];
    if (!videoTrack) return;
    
    try {
      const currentFacingMode = videoTrack.getSettings().facingMode;
      const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
      });
      
      const newVideoTrack = newStream.getVideoTracks()[0];
      
      // Replace track in peer connection
      const sender = peerConnection.current?.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(newVideoTrack);
      }
      
      // Stop old track
      videoTrack.stop();
      
      // Update local stream
      callState.localStream.removeTrack(videoTrack);
      callState.localStream.addTrack(newVideoTrack);
      
      setCallState(prev => ({ ...prev, localStream: callState.localStream }));
      console.log('Camera switched to:', newFacingMode);
    } catch (err) {
      console.error('Error switching camera:', err);
    }
  }, [callState.localStream, callState.callType]);

  return {
    callState,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
    cleanup,
  };
};
