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

const ICE_SERVERS: RTCIceServer[] = [
  // STUN servers
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  // Free TURN servers from OpenRelay
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  // Additional free TURN from Metered
  {
    urls: 'turn:a.relay.metered.ca:80',
    username: 'e8dd65c92d865b653b024fe8',
    credential: 'uWdWNmkhvyqTmhWu',
  },
  {
    urls: 'turn:a.relay.metered.ca:443',
    username: 'e8dd65c92d865b653b024fe8',
    credential: 'uWdWNmkhvyqTmhWu',
  },
  {
    urls: 'turn:a.relay.metered.ca:443?transport=tcp',
    username: 'e8dd65c92d865b653b024fe8',
    credential: 'uWdWNmkhvyqTmhWu',
  },
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
  const localStreamRef = useRef<MediaStream | null>(null);
  const callSubscription = useRef<any>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const processedCandidates = useRef<Set<string>>(new Set());
  const isCleaningUp = useRef(false);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (isCleaningUp.current) return;
    isCleaningUp.current = true;
    
    console.log('Cleaning up WebRTC resources');
    
    // Stop all tracks on local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      localStreamRef.current = null;
    }
    
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    
    if (callSubscription.current) {
      supabase.removeChannel(callSubscription.current);
      callSubscription.current = null;
    }
    
    pendingCandidates.current = [];
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
    
    isCleaningUp.current = false;
  }, []);

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
    
    console.log('Requesting media with constraints:', JSON.stringify(constraints));
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log('Got media stream with tracks:', stream.getTracks().map(t => `${t.kind}:${t.enabled}`).join(', '));
    return stream;
  }, []);

  const addPendingCandidates = useCallback(async () => {
    if (!peerConnection.current || !peerConnection.current.remoteDescription) {
      return;
    }
    
    console.log('Adding pending candidates:', pendingCandidates.current.length);
    for (const candidate of pendingCandidates.current) {
      try {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('Added pending ICE candidate');
      } catch (err) {
        console.error('Error adding pending ICE candidate:', err);
      }
    }
    pendingCandidates.current = [];
  }, []);

  const setupPeerConnection = useCallback((callId: string, callType: 'voice' | 'video') => {
    console.log('Setting up peer connection for call:', callId, 'type:', callType);
    
    // Create peer connection
    const pc = new RTCPeerConnection({ 
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
    });
    
    peerConnection.current = pc;
    
    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log('New ICE candidate generated');
        
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
    
    pc.onicegatheringstatechange = () => {
      console.log('ICE gathering state:', pc.iceGatheringState);
    };
    
    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        console.log('ICE connected!');
        setCallState(prev => ({ ...prev, status: 'active' }));
        options.onCallAccepted?.();
      } else if (pc.iceConnectionState === 'failed') {
        console.log('ICE connection failed, restarting...');
        pc.restartIce();
      }
    };
    
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
    };
    
    // Handle incoming remote stream - CRITICAL
    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind, 'streams:', event.streams.length);
      
      if (event.streams && event.streams[0]) {
        const remoteStream = event.streams[0];
        console.log('Setting remote stream with tracks:', remoteStream.getTracks().map(t => t.kind).join(', '));
        setCallState(prev => ({ ...prev, remoteStream }));
      } else {
        // Create a new stream if none provided
        console.log('No stream in event, creating new MediaStream');
        const newStream = new MediaStream([event.track]);
        setCallState(prev => {
          const existingStream = prev.remoteStream;
          if (existingStream) {
            existingStream.addTrack(event.track);
            return { ...prev, remoteStream: existingStream };
          }
          return { ...prev, remoteStream: newStream };
        });
      }
    };
    
    return pc;
  }, [options]);

  const subscribeToCall = useCallback((callId: string, isCaller: boolean) => {
    console.log('Subscribing to call updates:', callId, 'isCaller:', isCaller);
    
    const channelName = `call-${callId}-${Date.now()}`;
    callSubscription.current = supabase
      .channel(channelName)
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
          console.log('Call update:', call.status, 'answer:', !!call.answer, 'ice:', call.ice_candidates?.length || 0);
          
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
          if (isCaller && call.answer && peerConnection.current) {
            if (!peerConnection.current.remoteDescription) {
              console.log('Setting remote description (answer)');
              try {
                const answer = new RTCSessionDescription(call.answer);
                await peerConnection.current.setRemoteDescription(answer);
                console.log('Remote description set successfully');
                // Add any pending ICE candidates
                await addPendingCandidates();
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
                
                if (peerConnection.current.remoteDescription) {
                  try {
                    await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
                    console.log('Added ICE candidate from update');
                  } catch (err) {
                    console.error('Error adding ICE candidate:', err);
                  }
                } else {
                  // Queue for later
                  pendingCandidates.current.push(candidate);
                  console.log('Queued ICE candidate (no remote description yet)');
                }
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Call subscription status:', status);
      });
  }, [cleanup, options, addPendingCandidates]);

  const startCall = useCallback(async (calleeId: string, chatId: string, callType: 'voice' | 'video' = 'voice') => {
    if (!user) return;
    
    console.log('Starting call to:', calleeId, 'type:', callType);
    isCleaningUp.current = false;
    
    try {
      // Get media stream first
      const stream = await getMediaStream(callType);
      localStreamRef.current = stream;
      
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
      
      // Setup peer connection
      const pc = setupPeerConnection(call.id, callType);
      
      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        console.log('Adding local track:', track.kind);
        pc.addTrack(track, stream);
      });
      
      // Create offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video',
      });
      await pc.setLocalDescription(offer);
      console.log('Created and set local offer');
      
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
    isCleaningUp.current = false;
    
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
      localStreamRef.current = stream;
      
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
      const pc = setupPeerConnection(callId, callType);
      
      // Add tracks to peer connection BEFORE setting remote description
      stream.getTracks().forEach(track => {
        console.log('Adding local track:', track.kind);
        pc.addTrack(track, stream);
      });
      
      // Set remote description (offer)
      if (call.offer) {
        console.log('Setting remote description (offer)');
        const offerData = call.offer as unknown as RTCSessionDescriptionInit;
        await pc.setRemoteDescription(new RTCSessionDescription(offerData));
        console.log('Remote description set');
        
        // Process existing ICE candidates
        if (call.ice_candidates) {
          console.log('Processing', call.ice_candidates.length, 'existing ICE candidates');
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
        
        // Create answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log('Created and set local answer');
        
        // Update call with answer
        await supabase
          .from('calls')
          .update({
            answer: JSON.parse(JSON.stringify(answer)),
            status: 'active',
            started_at: new Date().toISOString(),
          })
          .eq('id', callId);
        
        console.log('Call updated with answer');
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
    const stream = localStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
        console.log('Mute toggled:', !audioTrack.enabled);
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCallState(prev => ({ ...prev, isVideoOff: !videoTrack.enabled }));
        console.log('Video toggled:', !videoTrack.enabled);
      }
    }
  }, []);

  const switchCamera = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream || callState.callType !== 'video') return;
    
    const videoTrack = stream.getVideoTracks()[0];
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
      stream.removeTrack(videoTrack);
      stream.addTrack(newVideoTrack);
      
      setCallState(prev => ({ ...prev, localStream: stream }));
      console.log('Camera switched to:', newFacingMode);
    } catch (err) {
      console.error('Error switching camera:', err);
    }
  }, [callState.callType]);

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
