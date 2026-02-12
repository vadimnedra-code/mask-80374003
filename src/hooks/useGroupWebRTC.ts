import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  GroupCallState, 
  GroupCallParticipant, 
  GroupCallPeerConnection,
  GroupCallInfo 
} from '@/types/groupCall';

interface UseGroupWebRTCOptions {
  onCallEnded?: () => void;
  onParticipantJoined?: (participant: GroupCallParticipant) => void;
  onParticipantLeft?: (participant: GroupCallParticipant) => void;
}

const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// Cached TURN credentials for group calls
let groupCachedIceServers: RTCIceServer[] | null = null;
let groupCacheExpiry = 0;

const fetchGroupTurnCredentials = async (): Promise<RTCIceServer[]> => {
  if (groupCachedIceServers && Date.now() < groupCacheExpiry) {
    return groupCachedIceServers;
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return FALLBACK_ICE_SERVERS;

    const { data, error } = await supabase.functions.invoke('get-turn-credentials', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error || !data?.iceServers) return FALLBACK_ICE_SERVERS;

    groupCachedIceServers = data.iceServers;
    groupCacheExpiry = Date.now() + 10 * 60 * 1000;
    return groupCachedIceServers;
  } catch {
    return FALLBACK_ICE_SERVERS;
  }
};

const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

export const useGroupWebRTC = (options: UseGroupWebRTCOptions = {}) => {
  const { user } = useAuth();
  
  const [callState, setCallState] = useState<GroupCallState>({
    callId: null,
    status: 'idle',
    callType: 'voice',
    isGroupCall: true,
    participants: [],
    localStream: null,
    screenStream: null,
    isMuted: false,
    isVideoOff: false,
    isScreenSharing: false,
    error: null,
  });

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const callSubscription = useRef<any>(null);
  const participantsSubscription = useRef<any>(null);
  const peerConnectionsSubscription = useRef<any>(null);
  const processedCandidates = useRef<Set<string>>(new Set());
  const isMountedRef = useRef(true);

  const resetCallState = useCallback(() => {
    if (!isMountedRef.current) return;
    setCallState({
      callId: null,
      status: 'idle',
      callType: 'voice',
      isGroupCall: true,
      participants: [],
      localStream: null,
      screenStream: null,
      isMuted: false,
      isVideoOff: false,
      isScreenSharing: false,
      error: null,
    });
  }, []);

  const cleanupResources = useCallback(() => {
    console.log('[GroupWebRTC] Cleaning up resources');
    
    // Stop local streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    
    // Close all peer connections
    peerConnections.current.forEach((pc, peerId) => {
      console.log('[GroupWebRTC] Closing peer connection:', peerId);
      pc.close();
    });
    peerConnections.current.clear();
    
    // Unsubscribe from channels
    if (callSubscription.current) {
      supabase.removeChannel(callSubscription.current);
      callSubscription.current = null;
    }
    if (participantsSubscription.current) {
      supabase.removeChannel(participantsSubscription.current);
      participantsSubscription.current = null;
    }
    if (peerConnectionsSubscription.current) {
      supabase.removeChannel(peerConnectionsSubscription.current);
      peerConnectionsSubscription.current = null;
    }
    
    processedCandidates.current.clear();
  }, []);

  const cleanup = useCallback(() => {
    cleanupResources();
    resetCallState();
  }, [cleanupResources, resetCallState]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cleanupResources();
    };
  }, [cleanupResources]);

  const getMediaStream = useCallback(async (callType: 'voice' | 'video'): Promise<MediaStream> => {
    const mobile = isMobile();
    
    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };
    
    const videoConstraints: MediaTrackConstraints | boolean = callType === 'video' ? {
      width: { ideal: mobile ? 640 : 1280, max: mobile ? 1280 : 1920 },
      height: { ideal: mobile ? 480 : 720, max: mobile ? 720 : 1080 },
      facingMode: 'user',
      frameRate: { ideal: mobile ? 24 : 30, max: 30 },
    } : false;
    
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints,
      video: videoConstraints,
    });
    
    return stream;
  }, []);

  const createPeerConnection = useCallback(async (
    callId: string, 
    peerId: string, 
    callType: 'voice' | 'video'
  ): Promise<RTCPeerConnection> => {
    console.log('[GroupWebRTC] Creating peer connection for:', peerId);
    
    const iceServers = await fetchGroupTurnCredentials();
    
    const pc = new RTCPeerConnection({
      iceServers,
      iceCandidatePoolSize: 5,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    });
    
    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate && user) {
        console.log('[GroupWebRTC] ICE candidate generated for:', peerId);
        try {
          await supabase.rpc('append_group_call_ice_candidate', {
            _call_id: callId,
            _from_user_id: user.id,
            _to_user_id: peerId,
            _candidate: event.candidate.toJSON() as any,
          });
        } catch (err) {
          console.error('[GroupWebRTC] Error sending ICE candidate:', err);
        }
      }
    };
    
    pc.oniceconnectionstatechange = () => {
      console.log(`[GroupWebRTC] ICE state for ${peerId}:`, pc.iceConnectionState);
      
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setCallState(prev => ({ ...prev, status: 'active', error: null }));
      } else if (pc.iceConnectionState === 'failed') {
        pc.restartIce();
      }
    };
    
    // Handle remote tracks
    pc.ontrack = (event) => {
      console.log('[GroupWebRTC] Remote track received from:', peerId, event.track.kind);
      
      const remoteStream = event.streams[0] || new MediaStream([event.track]);
      
      setCallState(prev => ({
        ...prev,
        participants: prev.participants.map(p => 
          p.user_id === peerId 
            ? { ...p, stream: remoteStream }
            : p
        ),
      }));
    };
    
    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }
    
    peerConnections.current.set(peerId, pc);
    return pc;
  }, [user]);

  const subscribeToCall = useCallback((callId: string) => {
    if (!user) return;
    
    console.log('[GroupWebRTC] Subscribing to call:', callId);
    
    // Subscribe to call status changes
    const callChannel = supabase
      .channel(`group-call-${callId}`)
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
          console.log('[GroupWebRTC] Call update:', call.status);
          
          if (call.status === 'ended') {
            options.onCallEnded?.();
            cleanup();
          }
        }
      )
      .subscribe();
    
    callSubscription.current = callChannel;
    
    // Subscribe to participants changes
    const participantsChannel = supabase
      .channel(`group-call-participants-${callId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_participants',
          filter: `call_id=eq.${callId}`,
        },
        async (payload) => {
          console.log('[GroupWebRTC] Participant event:', payload.eventType);
          
          if (payload.eventType === 'INSERT') {
            const participant = payload.new as any;
            if (participant.user_id !== user.id) {
              await handleNewParticipant(callId, participant);
            }
          } else if (payload.eventType === 'UPDATE') {
            const participant = payload.new as any;
            if (participant.status === 'left') {
              handleParticipantLeft(participant);
            } else {
              updateParticipant(participant);
            }
          } else if (payload.eventType === 'DELETE') {
            const participant = payload.old as any;
            handleParticipantLeft(participant);
          }
        }
      )
      .subscribe();
    
    participantsSubscription.current = participantsChannel;
    
    // Subscribe to peer connections for signaling
    const peerChannel = supabase
      .channel(`group-call-peers-${callId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_peer_connections',
          filter: `call_id=eq.${callId}`,
        },
        async (payload) => {
          await handlePeerConnectionUpdate(callId, payload);
        }
      )
      .subscribe();
    
    peerConnectionsSubscription.current = peerChannel;
  }, [user, cleanup, options]);

  const handleNewParticipant = useCallback(async (callId: string, participant: any) => {
    if (!user) return;
    
    console.log('[GroupWebRTC] New participant:', participant.user_id);
    
    // Fetch profile info
    const { data: profile } = await supabase
      .from('profiles_public')
      .select('display_name, avatar_url')
      .eq('user_id', participant.user_id)
      .single();
    
    const newParticipant: GroupCallParticipant = {
      ...participant,
      display_name: profile?.display_name || 'Unknown',
      avatar_url: profile?.avatar_url,
    };
    
    setCallState(prev => ({
      ...prev,
      participants: [...prev.participants.filter(p => p.user_id !== participant.user_id), newParticipant],
    }));
    
    options.onParticipantJoined?.(newParticipant);
    
    // Create peer connection to new participant
    // Only the user with "smaller" ID initiates the connection to avoid duplicates
    if (user.id < participant.user_id) {
      await initiateConnectionTo(callId, participant.user_id);
    }
  }, [user, options]);

  const handleParticipantLeft = useCallback((participant: any) => {
    console.log('[GroupWebRTC] Participant left:', participant.user_id);
    
    // Close peer connection
    const pc = peerConnections.current.get(participant.user_id);
    if (pc) {
      pc.close();
      peerConnections.current.delete(participant.user_id);
    }
    
    setCallState(prev => ({
      ...prev,
      participants: prev.participants.filter(p => p.user_id !== participant.user_id),
    }));
    
    options.onParticipantLeft?.(participant);
  }, [options]);

  const updateParticipant = useCallback((participant: any) => {
    setCallState(prev => ({
      ...prev,
      participants: prev.participants.map(p =>
        p.user_id === participant.user_id
          ? { ...p, ...participant }
          : p
      ),
    }));
  }, []);

  const handlePeerConnectionUpdate = useCallback(async (callId: string, payload: any) => {
    if (!user) return;
    
    const peerConn = payload.new as any;
    
    // Only process if we're the target
    if (peerConn.to_user_id !== user.id) return;
    
    console.log('[GroupWebRTC] Peer connection update from:', peerConn.from_user_id);
    
    let pc = peerConnections.current.get(peerConn.from_user_id);
    
    // Handle offer
    if (peerConn.offer && !pc) {
      pc = await createPeerConnection(callId, peerConn.from_user_id, callState.callType);
      
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(peerConn.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        // Update with answer
        await supabase
          .from('call_peer_connections')
          .update({
            answer: JSON.parse(JSON.stringify(answer)),
            connection_state: 'answered',
          })
          .eq('call_id', callId)
          .eq('from_user_id', peerConn.from_user_id)
          .eq('to_user_id', user.id);
          
        console.log('[GroupWebRTC] Sent answer to:', peerConn.from_user_id);
      } catch (err) {
        console.error('[GroupWebRTC] Error handling offer:', err);
      }
    }
    
    // Handle answer
    if (peerConn.answer && pc && !pc.remoteDescription) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(peerConn.answer));
        console.log('[GroupWebRTC] Set remote description for:', peerConn.from_user_id);
      } catch (err) {
        console.error('[GroupWebRTC] Error setting answer:', err);
      }
    }
    
    // Handle ICE candidates
    if (peerConn.ice_candidates && peerConn.ice_candidates.length > 0 && pc) {
      for (const candidate of peerConn.ice_candidates) {
        const candidateKey = JSON.stringify(candidate);
        if (processedCandidates.current.has(candidateKey)) continue;
        processedCandidates.current.add(candidateKey);
        
        try {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        } catch (err) {
          console.error('[GroupWebRTC] Error adding ICE candidate:', err);
        }
      }
    }
  }, [user, callState.callType, createPeerConnection]);

  const initiateConnectionTo = useCallback(async (callId: string, peerId: string) => {
    if (!user) return;
    
    console.log('[GroupWebRTC] Initiating connection to:', peerId);
    
    const pc = await createPeerConnection(callId, peerId, callState.callType);
    
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callState.callType === 'video',
      });
      await pc.setLocalDescription(offer);
      
      // Create or update peer connection record
      await supabase
        .from('call_peer_connections')
        .upsert({
          call_id: callId,
          from_user_id: user.id,
          to_user_id: peerId,
          offer: JSON.parse(JSON.stringify(offer)),
          connection_state: 'offering',
        }, {
          onConflict: 'call_id,from_user_id,to_user_id',
        });
        
      console.log('[GroupWebRTC] Sent offer to:', peerId);
    } catch (err) {
      console.error('[GroupWebRTC] Error creating offer:', err);
    }
  }, [user, callState.callType, createPeerConnection]);

  // Start a new group call
  const startGroupCall = useCallback(async (
    chatId: string,
    participantIds: string[],
    callType: 'voice' | 'video' = 'voice'
  ): Promise<string | null> => {
    if (!user || participantIds.length === 0) return null;
    
    console.log('[GroupWebRTC] Starting group call with', participantIds.length, 'participants');
    
    try {
      // Get media stream
      const stream = await getMediaStream(callType);
      localStreamRef.current = stream;
      
      // Create call record
      const { data: call, error: callError } = await supabase
        .from('calls')
        .insert({
          caller_id: user.id,
          callee_id: participantIds[0], // For compatibility
          chat_id: chatId,
          call_type: callType,
          status: 'ringing',
          is_group_call: true,
          max_participants: 8,
        })
        .select()
        .single();
      
      if (callError || !call) {
        stream.getTracks().forEach(t => t.stop());
        throw callError || new Error('Failed to create call');
      }
      
      // Add self as participant
      await supabase
        .from('call_participants')
        .insert({
          call_id: call.id,
          user_id: user.id,
          status: 'active',
          joined_at: new Date().toISOString(),
        });
      
      // Add other participants as pending
      for (const participantId of participantIds) {
        await supabase
          .from('call_participants')
          .insert({
            call_id: call.id,
            user_id: participantId,
            status: 'ringing',
          });
      }
      
      // Fetch participant profiles
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('user_id, display_name, avatar_url')
        .in('user_id', participantIds);
      
      const participants: GroupCallParticipant[] = participantIds.map(id => ({
        id: '',
        call_id: call.id,
        user_id: id,
        status: 'ringing',
        joined_at: null,
        left_at: null,
        is_muted: false,
        is_video_off: false,
        is_screen_sharing: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        display_name: profiles?.find(p => p.user_id === id)?.display_name || 'Unknown',
        avatar_url: profiles?.find(p => p.user_id === id)?.avatar_url,
      }));
      
      setCallState({
        callId: call.id,
        status: 'ringing',
        callType,
        isGroupCall: true,
        participants,
        localStream: stream,
        screenStream: null,
        isMuted: false,
        isVideoOff: false,
        isScreenSharing: false,
        error: null,
      });
      
      subscribeToCall(call.id);
      
      // Send push notifications to all participants
      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();
      
      for (const participantId of participantIds) {
        try {
          await supabase.functions.invoke('send-voip-push', {
            body: {
              callee_id: participantId,
              caller_id: user.id,
              caller_name: callerProfile?.display_name || 'Группа',
              call_id: call.id,
              is_video: callType === 'video',
              is_group: true,
            },
          });
        } catch (e) {
          console.log('[GroupWebRTC] Push not sent to:', participantId);
        }
      }
      
      return call.id;
    } catch (error) {
      console.error('[GroupWebRTC] Error starting call:', error);
      cleanup();
      throw error;
    }
  }, [user, getMediaStream, subscribeToCall, cleanup]);

  // Join an existing group call
  const joinGroupCall = useCallback(async (callId: string): Promise<void> => {
    if (!user) throw new Error('Not authenticated');
    
    console.log('[GroupWebRTC] Joining call:', callId);
    
    try {
      // Get call info
      const { data: call, error: callError } = await supabase
        .from('calls')
        .select('*')
        .eq('id', callId)
        .single();
      
      if (callError || !call) throw callError || new Error('Call not found');
      
      const callType = call.call_type as 'voice' | 'video';
      
      // Get media stream
      const stream = await getMediaStream(callType);
      localStreamRef.current = stream;
      
      // Update our participant status
      await supabase
        .from('call_participants')
        .upsert({
          call_id: callId,
          user_id: user.id,
          status: 'active',
          joined_at: new Date().toISOString(),
        }, {
          onConflict: 'call_id,user_id',
        });
      
      // Get existing participants
      const { data: existingParticipants } = await supabase
        .from('call_participants')
        .select(`
          *,
          profiles_public!call_participants_user_id_fkey (
            display_name,
            avatar_url
          )
        `)
        .eq('call_id', callId)
        .neq('user_id', user.id)
        .in('status', ['active', 'connecting']);
      
      const participants: GroupCallParticipant[] = (existingParticipants || []).map((p: any) => ({
        ...p,
        display_name: p.profiles_public?.display_name || 'Unknown',
        avatar_url: p.profiles_public?.avatar_url,
      }));
      
      setCallState({
        callId,
        status: 'connecting',
        callType,
        isGroupCall: true,
        participants,
        localStream: stream,
        screenStream: null,
        isMuted: false,
        isVideoOff: false,
        isScreenSharing: false,
        error: null,
      });
      
      subscribeToCall(callId);
      
      // Initiate connections to existing participants
      for (const participant of participants) {
        if (user.id < participant.user_id) {
          await initiateConnectionTo(callId, participant.user_id);
        }
      }
      
    } catch (error) {
      console.error('[GroupWebRTC] Error joining call:', error);
      cleanup();
      throw error;
    }
  }, [user, getMediaStream, subscribeToCall, initiateConnectionTo, cleanup]);

  // Leave the call
  const leaveCall = useCallback(async () => {
    if (!callState.callId || !user) return;
    
    console.log('[GroupWebRTC] Leaving call');
    
    // Update our participant status
    await supabase
      .from('call_participants')
      .update({
        status: 'left',
        left_at: new Date().toISOString(),
      })
      .eq('call_id', callState.callId)
      .eq('user_id', user.id);
    
    // Check if we're the last participant
    const { data: activeParticipants } = await supabase
      .from('call_participants')
      .select('id')
      .eq('call_id', callState.callId)
      .in('status', ['active', 'connecting']);
    
    if (!activeParticipants || activeParticipants.length === 0) {
      // End the call if no more active participants
      await supabase
        .from('calls')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', callState.callId);
    }
    
    options.onCallEnded?.();
    cleanup();
  }, [callState.callId, user, options, cleanup]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
        
        // Update participant status in DB
        if (callState.callId && user) {
          supabase
            .from('call_participants')
            .update({ is_muted: !audioTrack.enabled })
            .eq('call_id', callState.callId)
            .eq('user_id', user.id);
        }
      }
    }
  }, [callState.callId, user]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCallState(prev => ({ ...prev, isVideoOff: !videoTrack.enabled }));
        
        if (callState.callId && user) {
          supabase
            .from('call_participants')
            .update({ is_video_off: !videoTrack.enabled })
            .eq('call_id', callState.callId)
            .eq('user_id', user.id);
        }
      }
    }
  }, [callState.callId, user]);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    if (!callState.callId || !user) return;
    
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as any,
        audio: true,
      });
      
      screenStreamRef.current = screenStream;
      
      // Replace video track in all peer connections
      const videoTrack = screenStream.getVideoTracks()[0];
      
      peerConnections.current.forEach((pc, peerId) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });
      
      // Handle screen share stop
      videoTrack.onended = () => {
        stopScreenShare();
      };
      
      setCallState(prev => ({ 
        ...prev, 
        isScreenSharing: true,
        screenStream,
      }));
      
      await supabase
        .from('call_participants')
        .update({ is_screen_sharing: true })
        .eq('call_id', callState.callId)
        .eq('user_id', user.id);
        
      console.log('[GroupWebRTC] Screen sharing started');
    } catch (err) {
      console.error('[GroupWebRTC] Error starting screen share:', err);
    }
  }, [callState.callId, user]);

  // Stop screen sharing
  const stopScreenShare = useCallback(async () => {
    if (!callState.callId || !user) return;
    
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    
    // Restore original video track
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });
      }
    }
    
    setCallState(prev => ({ 
      ...prev, 
      isScreenSharing: false,
      screenStream: null,
    }));
    
    await supabase
      .from('call_participants')
      .update({ is_screen_sharing: false })
      .eq('call_id', callState.callId)
      .eq('user_id', user.id);
      
    console.log('[GroupWebRTC] Screen sharing stopped');
  }, [callState.callId, user]);

  // Switch camera
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
      
      // Replace in all peer connections
      peerConnections.current.forEach((pc) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }
      });
      
      videoTrack.stop();
      stream.removeTrack(videoTrack);
      stream.addTrack(newVideoTrack);
      
      setCallState(prev => ({ ...prev, localStream: stream }));
    } catch (err) {
      console.error('[GroupWebRTC] Error switching camera:', err);
    }
  }, [callState.callType]);

  // Invite new participants to active call
  const inviteToCall = useCallback(async (participantIds: string[]) => {
    if (!callState.callId || !user || participantIds.length === 0) return;
    
    console.log('[GroupWebRTC] Inviting participants:', participantIds);
    
    try {
      // Add participants as pending/ringing
      for (const participantId of participantIds) {
        await supabase
          .from('call_participants')
          .upsert({
            call_id: callState.callId,
            user_id: participantId,
            status: 'ringing',
          }, {
            onConflict: 'call_id,user_id',
          });
      }
      
      // Fetch profiles for the new participants
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('user_id, display_name, avatar_url')
        .in('user_id', participantIds);
      
      const newParticipants: GroupCallParticipant[] = participantIds.map(id => ({
        id: '',
        call_id: callState.callId!,
        user_id: id,
        status: 'ringing',
        joined_at: null,
        left_at: null,
        is_muted: false,
        is_video_off: false,
        is_screen_sharing: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        display_name: profiles?.find(p => p.user_id === id)?.display_name || 'Unknown',
        avatar_url: profiles?.find(p => p.user_id === id)?.avatar_url,
      }));
      
      setCallState(prev => ({
        ...prev,
        participants: [
          ...prev.participants.filter(p => !participantIds.includes(p.user_id)),
          ...newParticipants,
        ],
      }));
      
      // Send push notifications
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();
      
      for (const participantId of participantIds) {
        try {
          await supabase.functions.invoke('send-voip-push', {
            body: {
              callee_id: participantId,
              caller_id: user.id,
              caller_name: inviterProfile?.display_name || 'Группа',
              call_id: callState.callId,
              is_video: callState.callType === 'video',
              is_group: true,
            },
          });
        } catch (e) {
          console.log('[GroupWebRTC] Push not sent to:', participantId);
        }
      }
      
      console.log('[GroupWebRTC] Invited', participantIds.length, 'participants');
    } catch (error) {
      console.error('[GroupWebRTC] Error inviting participants:', error);
      throw error;
    }
  }, [callState.callId, callState.callType, user]);

  return {
    callState,
    startGroupCall,
    joinGroupCall,
    leaveCall,
    inviteToCall,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    switchCamera,
    cleanup,
  };
};
