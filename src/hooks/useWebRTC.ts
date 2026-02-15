import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { VIDEO_QUALITY_CONSTRAINTS, VideoQuality } from '@/hooks/useConnectionStats';
import { useCallDiagnosticLogs } from '@/hooks/useCallDiagnosticLogs';
import { useAutoReconnect, ReconnectionState } from '@/hooks/useAutoReconnect';

// Cached TURN credentials (exported for pre-warming)
let cachedIceServers: RTCIceServer[] | null = null;
let cacheExpiry = 0;
let pendingFetch: Promise<RTCIceServer[]> | null = null;

export interface PeerConnectionState {
  iceConnectionState: string;
  iceGatheringState: string;
  connectionState: string;
  signalingState: string;
}

export interface CallState {
  callId: string | null;
  status: 'idle' | 'calling' | 'ringing' | 'connecting' | 'active' | 'ended';
  isMuted: boolean;
  isVideoOff: boolean;
  remoteUserId: string | null;
  callType: 'voice' | 'video';
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerConnectionState: PeerConnectionState | null;
  error: string | null;
  reconnectionState: ReconnectionState | null;
}

interface UseWebRTCOptions {
  onCallEnded?: () => void;
  onCallAccepted?: () => void;
  onCallRejected?: () => void;
}

const GOOGLE_STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export const fetchTurnCredentials = async (): Promise<RTCIceServer[]> => {
  // Return cached if still valid (cache for 10 min, credentials last ~24h)
  if (cachedIceServers && Date.now() < cacheExpiry) {
    return cachedIceServers;
  }

  // Deduplicate in-flight requests so concurrent callers share one fetch
  if (pendingFetch) return pendingFetch;

  pendingFetch = (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.warn('No auth session, using fallback ICE servers');
        return GOOGLE_STUN_SERVERS;
      }

      const { data, error } = await supabase.functions.invoke('get-turn-credentials', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error || !data?.iceServers) {
        console.error('Failed to fetch TURN credentials:', error);
        return GOOGLE_STUN_SERVERS;
      }

      // Always include Google STUN servers alongside Metered TURN/STUN
      const mergedServers = [...GOOGLE_STUN_SERVERS, ...data.iceServers];
      cachedIceServers = mergedServers;
      cacheExpiry = Date.now() + 10 * 60 * 1000; // 10 min cache
      console.log('Fetched TURN credentials:', mergedServers.length, 'servers (incl. Google STUN)');
      return cachedIceServers;
    } catch (err) {
      console.error('Error fetching TURN credentials:', err);
      return GOOGLE_STUN_SERVERS;
    } finally {
      pendingFetch = null;
    }
  })();

  return pendingFetch;
};

// Detect if running on mobile
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const useWebRTC = (options: UseWebRTCOptions = {}) => {
  const { user } = useAuth();
  const { logs: diagnosticLogs, addLog, clearLogs, copyReportToClipboard } = useCallDiagnosticLogs();
  
  const [callState, setCallState] = useState<CallState>({
    callId: null,
    status: 'idle',
    isMuted: false,
    isVideoOff: false,
    remoteUserId: null,
    callType: 'voice',
    localStream: null,
    remoteStream: null,
    peerConnectionState: null,
    error: null,
    reconnectionState: null,
  });
  
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callSubscription = useRef<any>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const processedCandidates = useRef<Set<string>>(new Set());
  const isCleaningUp = useRef(false);
  const tracksAddedRef = useRef(false);
  const answerSentRef = useRef(false);
  const autoReconnectHandlerRef = useRef<((state: RTCIceConnectionState) => void) | null>(null);

  const isMountedRef = useRef(true);

  const resetCallState = useCallback(() => {
    // Avoid state updates after unmount (React StrictMode mounts/unmounts twice in dev)
    if (!isMountedRef.current) return;
    setCallState({
      callId: null,
      status: 'idle',
      isMuted: false,
      isVideoOff: false,
      remoteUserId: null,
      callType: 'voice',
      localStream: null,
      remoteStream: null,
      peerConnectionState: null,
      error: null,
      reconnectionState: null,
    });
  }, []);

  const cleanupResources = useCallback(() => {
    if (isCleaningUp.current) return;
    isCleaningUp.current = true;

    console.log('Cleaning up WebRTC resources');

    // Stop all tracks on local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
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
    tracksAddedRef.current = false;
    answerSentRef.current = false;

    isCleaningUp.current = false;
  }, []);

  const cleanup = useCallback(
    (opts?: { resetState?: boolean }) => {
      cleanupResources();
      if (opts?.resetState === false) return;
      resetCallState();
    },
    [cleanupResources, resetCallState]
  );

  // Handle network changes on mobile (WiFi <-> Cellular switches)
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network online');
      if (peerConnection.current && callState.status === 'active') {
        console.log('Restarting ICE after network change');
        peerConnection.current.restartIce();
      }
    };
    
    const handleOffline = () => {
      console.log('Network offline');
      if (callState.status === 'active') {
        setCallState(prev => ({ 
          ...prev, 
          error: 'Нет подключения к сети' 
        }));
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [callState.status]);

  // Auto-reconnect integration
  const {
    reconnectionState,
    handleConnectionStateChange,
    cancelReconnect,
    forceReconnect,
  } = useAutoReconnect(
    peerConnection.current,
    callState.callId,
    callState.status,
    {
      maxAttempts: 5,
      baseDelay: 1000,
      maxDelay: 10000,
      onReconnecting: (attempt) => {
        console.log(`[WebRTC] Reconnecting attempt ${attempt}`);
        addLog('connection', 'Auto-reconnect attempt', `Attempt ${attempt}`);
        setCallState(prev => ({
          ...prev,
          error: `Переподключение (${attempt}/5)...`,
        }));
      },
      onReconnected: () => {
        console.log('[WebRTC] Reconnected successfully');
        addLog('connection', 'Auto-reconnect successful');
        setCallState(prev => ({
          ...prev,
          error: null,
        }));
      },
      onReconnectFailed: () => {
        console.log('[WebRTC] Reconnection failed after max attempts');
        addLog('error', 'Auto-reconnect failed', 'Max attempts reached');
        setCallState(prev => ({
          ...prev,
          error: 'Не удалось восстановить соединение',
        }));
        // End call after failed reconnection
        options.onCallEnded?.();
      },
    }
  );

  // Update reconnection state in call state
  useEffect(() => {
    setCallState(prev => ({
      ...prev,
      reconnectionState,
    }));
  }, [reconnectionState]);

  // Store handler ref for peer connection to use
  useEffect(() => {
    autoReconnectHandlerRef.current = handleConnectionStateChange;
  }, [handleConnectionStateChange]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // On unmount we only cleanup resources; state reset on unmount can crash React in some dev/HMR/StrictMode paths.
      cleanup({ resetState: false });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getMediaStream = useCallback(async (callType: 'voice' | 'video'): Promise<MediaStream> => {
    const mobile = isMobile();
    
    // More conservative constraints for mobile
    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      // Lower sample rate for mobile to reduce bandwidth
      ...(mobile && { sampleRate: 16000 }),
    };
    
    const videoConstraints: MediaTrackConstraints | boolean = callType === 'video' ? {
      // Lower resolution for mobile to save bandwidth
      width: { ideal: mobile ? 640 : 1280, max: mobile ? 1280 : 1920 },
      height: { ideal: mobile ? 480 : 720, max: mobile ? 720 : 1080 },
      facingMode: 'user',
      frameRate: { ideal: mobile ? 24 : 30, max: 30 },
    } : false;
    
    const constraints: MediaStreamConstraints = {
      audio: audioConstraints,
      video: videoConstraints,
    };
    
    console.log('Requesting media with constraints:', JSON.stringify(constraints), 'mobile:', mobile);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Got media stream with tracks:', stream.getTracks().map(t => `${t.kind}:${t.enabled}`).join(', '));
      return stream;
    } catch (err) {
      console.error('Failed to get media stream:', err);
      // Fallback to basic constraints on mobile
      if (mobile) {
        console.log('Retrying with basic constraints...');
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === 'video',
        });
        return fallbackStream;
      }
      throw err;
    }
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

  const updatePeerConnectionState = useCallback(() => {
    if (peerConnection.current) {
      setCallState(prev => ({
        ...prev,
        peerConnectionState: {
          iceConnectionState: peerConnection.current?.iceConnectionState || 'N/A',
          iceGatheringState: peerConnection.current?.iceGatheringState || 'N/A',
          connectionState: peerConnection.current?.connectionState || 'N/A',
          signalingState: peerConnection.current?.signalingState || 'N/A',
        },
      }));
    }
  }, []);

  const setupPeerConnection = useCallback(async (callId: string, callType: 'voice' | 'video') => {
    const mobile = isMobile();
    console.log('Setting up peer connection for call:', callId, 'type:', callType, 'mobile:', mobile);
    addLog('info', 'Setting up peer connection', `callId: ${callId}, type: ${callType}, mobile: ${mobile}`);
    
    // Fetch dynamic TURN credentials from Metered
    const iceServers = await fetchTurnCredentials();
    addLog('ice', 'ICE servers loaded', `${iceServers.length} servers`);
    
    // Create peer connection with mobile-optimized settings
    const pc = new RTCPeerConnection({ 
      iceServers,
      iceCandidatePoolSize: mobile ? 5 : 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    });
    
    peerConnection.current = pc;
    addLog('connection', 'RTCPeerConnection created', `bundlePolicy: max-bundle, mobile: ${mobile}`);
    
    // Handle ICE candidates – use atomic RPC to avoid races
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log('New ICE candidate generated');
        addLog('ice', 'Local ICE candidate generated', `type: ${event.candidate.type}, protocol: ${event.candidate.protocol}`);
        try {
          const candidateJson = event.candidate.toJSON() as Record<string, unknown>;
          const { error } = await supabase.rpc('append_call_ice_candidate', {
            _call_id: callId,
            _candidate: candidateJson as any,
          });
          if (error) {
            console.error('Error appending ICE candidate via RPC:', error);
            addLog('error', 'Failed to send ICE candidate', error.message);
          }
        } catch (err) {
          console.error('Error saving ICE candidate:', err);
          addLog('error', 'Exception sending ICE candidate', String(err));
        }
      }
    };
    
    pc.onicegatheringstatechange = () => {
      console.log('ICE gathering state:', pc.iceGatheringState);
      addLog('ice', 'ICE gathering state changed', pc.iceGatheringState);
      updatePeerConnectionState();
    };
    
    // ICE restart timer - restart ICE if stuck at "checking" for too long
    let iceCheckingTimer: ReturnType<typeof setTimeout> | null = null;
    
    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
      addLog('ice', 'ICE connection state changed', pc.iceConnectionState);
      updatePeerConnectionState();
      
      // Clear any pending ICE restart timer
      if (iceCheckingTimer) {
        clearTimeout(iceCheckingTimer);
        iceCheckingTimer = null;
      }
      
      // Notify auto-reconnect handler about state changes
      if (autoReconnectHandlerRef.current) {
        autoReconnectHandlerRef.current(pc.iceConnectionState as RTCIceConnectionState);
      }
      
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        console.log('ICE connected!');
        addLog('connection', 'ICE connected successfully');
        setCallState(prev => ({ ...prev, status: 'active', error: null }));
        options.onCallAccepted?.();
      } else if (pc.iceConnectionState === 'checking') {
        setCallState(prev => ({ ...prev, status: 'connecting', error: null }));
        
        // If stuck at "checking" for 8 seconds, restart ICE
        iceCheckingTimer = setTimeout(() => {
          if (pc.iceConnectionState === 'checking') {
            console.log('[WebRTC] ICE stuck at checking for 8s, restarting ICE...');
            addLog('ice', 'ICE restart triggered', 'Stuck at checking for 8 seconds');
            pc.restartIce();
          }
        }, 8000);
      } else if (pc.iceConnectionState === 'failed') {
        // Immediate ICE restart on failure before auto-reconnect kicks in
        console.log('[WebRTC] ICE failed, attempting restart...');
        addLog('ice', 'ICE failed, restarting', 'Immediate restart attempt');
        pc.restartIce();
      }
      // Note: 'disconnected' states are handled by useAutoReconnect
    };
    
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      addLog('connection', 'Connection state changed', pc.connectionState);
      updatePeerConnectionState();
    };
    
    pc.onsignalingstatechange = () => {
      console.log('Signaling state:', pc.signalingState);
      addLog('sdp', 'Signaling state changed', pc.signalingState);
      updatePeerConnectionState();
    };
    
    // Handle incoming remote stream - CRITICAL
    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind, 'streams:', event.streams.length);
      addLog('media', 'Remote track received', `kind: ${event.track.kind}, enabled: ${event.track.enabled}`);
      
      if (event.streams && event.streams[0]) {
        const remoteStream = event.streams[0];
        console.log('Setting remote stream with tracks:', remoteStream.getTracks().map(t => t.kind).join(', '));
        addLog('media', 'Remote stream set', `tracks: ${remoteStream.getTracks().map(t => t.kind).join(', ')}`);
        setCallState(prev => ({ ...prev, remoteStream }));
      } else {
        // Create a new stream if none provided
        console.log('No stream in event, creating new MediaStream');
        addLog('media', 'Creating new MediaStream for remote track');
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
  }, [addLog, options, updatePeerConnectionState]);

  const subscribeToCall = useCallback(
    (callId: string, isCaller: boolean) => {
      console.log('Subscribing to call updates:', callId, 'isCaller:', isCaller);
      addLog('info', 'Subscribing to call updates', `callId: ${callId}, role: ${isCaller ? 'caller' : 'callee'}`);

      // Remove existing subscription first
      if (callSubscription.current) {
        supabase.removeChannel(callSubscription.current);
        callSubscription.current = null;
      }

      const handleCallUpdate = async (call: any) => {
        addLog(
          'info',
          'Call row update',
          `status: ${call.status}, offer: ${!!call.offer}, answer: ${!!call.answer}, ice: ${call.ice_candidates?.length || 0}`
        );

        if (call.status === 'rejected') {
          addLog('connection', 'Call rejected');
          options.onCallRejected?.();
          cleanup();
          return;
        }

        if (call.status === 'ended') {
          addLog('connection', 'Call ended');
          options.onCallEnded?.();
          cleanup();
          return;
        }

        // If caller and answer received, set remote description
        if (isCaller && call.answer && peerConnection.current) {
          if (!peerConnection.current.remoteDescription) {
            addLog('sdp', 'Caller received answer; setting remote description');
            try {
              const answer = new RTCSessionDescription(call.answer);
              await peerConnection.current.setRemoteDescription(answer);
              addLog('sdp', 'Caller remote description (answer) set');
              setCallState((prev) => ({ ...prev, status: 'connecting' }));
              await addPendingCandidates();
            } catch (err) {
              console.error('Error setting remote description (answer):', err);
              addLog('error', 'Failed to set remote description (answer)', String(err));
            }
          }
        }

        // If callee and offer received: only handle if tracks are added AND we haven't sent answer yet
        if (!isCaller && call.offer && peerConnection.current && !answerSentRef.current) {
          // Wait for tracks to be added before processing offer
          if (!tracksAddedRef.current) {
            addLog('info', 'Offer received but tracks not ready yet; will be handled by acceptCall');
            return;
          }

          if (!peerConnection.current.remoteDescription) {
            addLog('sdp', 'Callee received offer via subscription; setting remote description & creating answer');
            try {
              answerSentRef.current = true; // Mark that we're handling answer

              const offer = new RTCSessionDescription(call.offer);
              await peerConnection.current.setRemoteDescription(offer);
              addLog('sdp', 'Callee remote description (offer) set');

              await addPendingCandidates();

              const answer = await peerConnection.current.createAnswer();
              await peerConnection.current.setLocalDescription(answer);
              addLog('sdp', 'Callee created & set local answer');

              const { error } = await supabase
                .from('calls')
                .update({
                  answer: JSON.parse(JSON.stringify(answer)),
                  status: 'active',
                  started_at: new Date().toISOString(),
                })
                .eq('id', callId);

              if (error) {
                addLog('error', 'Failed to update call with answer', error.message);
                answerSentRef.current = false; // Reset on failure
              } else {
                addLog('connection', 'Call updated with answer');
              }
            } catch (err) {
              console.error('Callee: error handling offer from update:', err);
              addLog('error', 'Callee failed to handle offer', String(err));
              answerSentRef.current = false; // Reset on failure
            }
          }
        }

        // Process ICE candidates - for BOTH caller and callee
        // Each candidate is tagged with {sender_id, candidate} by the RPC
        if (call.ice_candidates && call.ice_candidates.length > 0 && peerConnection.current) {
          const total = call.ice_candidates.length as number;
          addLog('ice', 'Remote ICE candidates update', `total in call: ${total}`);

          for (const entry of call.ice_candidates) {
            // Skip our own candidates (tagged with sender_id by the DB function)
            const tagged = entry as { sender_id?: string; candidate?: any };
            const actualCandidate = tagged.candidate || entry;
            const senderId = tagged.sender_id;

            // If tagged, skip candidates we sent ourselves
            if (senderId && senderId === user?.id) continue;

            const candidateKey = JSON.stringify(actualCandidate);
            if (processedCandidates.current.has(candidateKey)) continue;
            processedCandidates.current.add(candidateKey);

            if (peerConnection.current.remoteDescription) {
              try {
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(actualCandidate));
              } catch (err) {
                console.error('Error adding ICE candidate:', err);
                addLog('error', 'Failed to add remote ICE candidate', String(err));
              }
            } else {
              pendingCandidates.current.push(actualCandidate);
            }
          }
        }
      };

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
            console.log('Call update received:', call.status, 'answer:', !!call.answer, 'offer:', !!call.offer, 'ice:', call.ice_candidates?.length || 0);
            await handleCallUpdate(call);
          }
        )
        .subscribe(async (status) => {
          console.log('Call subscription status:', status);
          addLog('info', 'Call subscription status', status);

          // Note: We don't process offer here for callee - let acceptCall handle it after tracks are ready
          if (status === 'SUBSCRIBED' && isCaller) {
            const { data, error } = await supabase.from('calls').select('*').eq('id', callId).single();
            if (error) {
              addLog('error', 'Failed to fetch call after subscribe', error.message);
            } else if (data) {
              await handleCallUpdate(data);
            }
          }
        });
    },
    [addLog, addPendingCandidates, cleanup, options, updatePeerConnectionState]
  );

  const startCall = useCallback(
    async (calleeId: string, chatId: string, callType: 'voice' | 'video' = 'voice') => {
      if (!user) return;

      clearLogs();
      processedCandidates.current.clear();
      pendingCandidates.current = [];

      console.log('Starting call to:', calleeId, 'type:', callType);
      addLog('info', 'Starting outgoing call', `to: ${calleeId}, type: ${callType}`);
      isCleaningUp.current = false;

      try {
        // Run media acquisition, call record creation, and TURN fetch in parallel
        const [stream, callResult, iceServers] = await Promise.all([
          getMediaStream(callType),
          supabase
            .from('calls')
            .insert({
              caller_id: user.id,
              callee_id: calleeId,
              chat_id: chatId,
              call_type: callType,
              status: 'pending',
            })
            .select()
            .single(),
          fetchTurnCredentials(),
        ]);

        const { data: call, error } = callResult;
        if (error || !call) {
          stream.getTracks().forEach((t) => t.stop());
          throw error || new Error('Failed to create call');
        }

        localStreamRef.current = stream;

        setCallState({
          callId: call.id,
          status: 'calling',
          isMuted: false,
          isVideoOff: false,
          remoteUserId: calleeId,
          callType,
          localStream: stream,
          remoteStream: null,
          peerConnectionState: null,
          error: null,
          reconnectionState: null,
        });

        // Setup peer connection with pre-fetched ICE servers
        const pc = await setupPeerConnection(call.id, callType);

        // Subscribe EARLY so we can't miss a fast answer update
        subscribeToCall(call.id, true);

        // Add tracks to peer connection
        stream.getTracks().forEach((track) => {
          console.log('Adding local track:', track.kind);
          pc.addTrack(track, stream);
        });

        // Create offer
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: callType === 'video',
        });
        await pc.setLocalDescription(offer);
        addLog('sdp', 'Created local offer');

        // Update call with offer + send VoIP push in parallel (neither blocks connection)
        const offerUpdate = supabase
          .from('calls')
          .update({
            offer: JSON.parse(JSON.stringify(offer)),
            status: 'ringing',
          })
          .eq('id', call.id);

        const voipPush = (async () => {
          try {
            const { data: callerProfile } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('user_id', user.id)
              .single();

            await supabase.functions.invoke('send-voip-push', {
              body: {
                callee_id: calleeId,
                caller_id: user.id,
                caller_name: callerProfile?.display_name || 'Неизвестный',
                call_id: call.id,
                is_video: callType === 'video',
              },
            });
            console.log('VoIP push sent');
          } catch (pushError) {
            console.log('VoIP push not sent (may not be configured):', pushError);
          }
        })();

        await Promise.all([offerUpdate, voipPush]);

        setCallState((prev) => ({ ...prev, status: 'ringing' }));

        return call.id;
      } catch (error) {
        console.error('Error starting call:', error);
        addLog('error', 'Outgoing call start failed', String(error));
        cleanup();
        throw error;
      }
    },
    [user, clearLogs, addLog, getMediaStream, setupPeerConnection, subscribeToCall, cleanup]
  );

  const acceptCall = useCallback(
    async (callId: string) => {
      if (!user) throw new Error('Not authenticated');

      clearLogs();
      processedCandidates.current.clear();
      pendingCandidates.current = [];
      tracksAddedRef.current = false;
      answerSentRef.current = false;

      console.log('Accepting call:', callId);
      addLog('info', 'Accepting incoming call', `callId: ${callId}`);
      isCleaningUp.current = false;

      try {
        // Pre-warm TURN credentials while we fetch call details and media in parallel
        addLog('media', 'Requesting local media + call details + TURN in parallel');

        // Fetch call details first (we need call_type to request correct media)
        const { data: call, error } = await supabase.from('calls').select('*').eq('id', callId).single();
        if (error || !call) throw error || new Error('Call not found');

        const callType = call.call_type as 'voice' | 'video';

        // Immediately show call UI
        setCallState({
          callId: call.id,
          status: 'connecting',
          isMuted: false,
          isVideoOff: false,
          remoteUserId: call.caller_id,
          callType,
          localStream: null,
          remoteStream: null,
          peerConnectionState: null,
          error: null,
          reconnectionState: null,
        });

        // Run TURN fetch + media acquisition in parallel (both are slow network/permission ops)
        const [, stream] = await Promise.all([
          fetchTurnCredentials(), // pre-warm cache so setupPeerConnection is instant
          getMediaStream(callType),
        ]);

        localStreamRef.current = stream;

        // Setup peer connection (TURN credentials are now cached — instant)
        const pc = await setupPeerConnection(callId, callType);

        setCallState((prev) => (prev.callId === callId ? { ...prev, localStream: stream } : prev));

        // Add tracks to peer connection BEFORE setting remote description
        stream.getTracks().forEach((track) => {
          console.log('Adding local track:', track.kind);
          pc.addTrack(track, stream);
        });

        // Mark tracks as ready - subscription handler can now process offers if needed
        tracksAddedRef.current = true;
        addLog('media', 'Local tracks added', `count: ${stream.getTracks().length}`);

        // Subscribe to call updates AFTER tracks are ready
        subscribeToCall(callId, false);

        // Use already-fetched call data (no redundant re-fetch needed — offer was in the first query)

        // If offer is present, handle it now
        if (call.offer && !answerSentRef.current) {
          answerSentRef.current = true;
          addLog('sdp', 'Offer present; setting remote description');
          const offerData = call.offer as unknown as RTCSessionDescriptionInit;
          await pc.setRemoteDescription(new RTCSessionDescription(offerData));
          addLog('sdp', 'Remote description (offer) set');

          // Process existing ICE candidates (tagged with {sender_id, candidate})
          if (call.ice_candidates) {
            addLog('ice', 'Processing existing ICE candidates', `count: ${call.ice_candidates.length}`);
            for (const entry of call.ice_candidates as any[]) {
              const tagged = entry as { sender_id?: string; candidate?: any };
              const actualCandidate = tagged.candidate || entry;
              const senderId = tagged.sender_id;

              // Skip our own candidates
              if (senderId && senderId === user?.id) continue;

              const candidateKey = JSON.stringify(actualCandidate);
              if (processedCandidates.current.has(candidateKey)) continue;
              processedCandidates.current.add(candidateKey);
              try {
                await pc.addIceCandidate(new RTCIceCandidate(actualCandidate));
              } catch (err) {
                console.error('Error adding ICE candidate:', err);
                addLog('error', 'Failed to add existing ICE candidate', String(err));
              }
            }
          }

          await addPendingCandidates();

          // Create answer
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          addLog('sdp', 'Created & set local answer');

          // Update call with answer
          const { error: updateError } = await supabase
            .from('calls')
            .update({
              answer: JSON.parse(JSON.stringify(answer)),
              status: 'active',
              started_at: new Date().toISOString(),
            })
            .eq('id', callId);

          if (updateError) {
            addLog('error', 'Failed to update call with answer', updateError.message);
            answerSentRef.current = false;
          } else {
            addLog('connection', 'Call updated with answer');
          }
        } else if (!call.offer) {
          addLog('sdp', 'Offer not ready yet', 'Waiting for realtime update');
        }
      } catch (error) {
        console.error('Error accepting call:', error);
        addLog('error', 'Accept call failed', String(error));
        cleanup();
        throw error;
      }
    },
    [user, clearLogs, addLog, getMediaStream, setupPeerConnection, subscribeToCall, addPendingCandidates, cleanup]
  );

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

  const changeVideoQuality = useCallback(async (quality: VideoQuality) => {
    const stream = localStreamRef.current;
    if (!stream || callState.callType !== 'video') return;
    
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;
    
    try {
      // For 'auto', use medium as default
      const targetQuality = quality === 'auto' ? 'medium' : quality;
      const constraints = VIDEO_QUALITY_CONSTRAINTS[targetQuality];
      
      console.log('Changing video quality to:', quality, constraints);
      
      // Apply constraints to the existing track
      await videoTrack.applyConstraints(constraints);
      
      console.log('Video quality changed successfully');
      
      // Log the new settings
      const settings = videoTrack.getSettings();
      console.log('New video settings:', {
        width: settings.width,
        height: settings.height,
        frameRate: settings.frameRate,
      });
    } catch (err) {
      console.error('Error changing video quality:', err);
      
      // If applyConstraints fails, try to get a new track with the desired constraints
      try {
        const targetQuality = quality === 'auto' ? 'medium' : quality;
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: VIDEO_QUALITY_CONSTRAINTS[targetQuality],
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
        console.log('Video quality changed via new track');
      } catch (innerErr) {
        console.error('Error getting new video track:', innerErr);
      }
    }
  }, [callState.callType]);

  // Return peerConnection ref getter to always get current value
  const getPeerConnection = useCallback(() => peerConnection.current, []);

  return {
    callState,
    peerConnection: peerConnection.current,
    getPeerConnection,
    diagnosticLogs,
    copyDiagnosticReport: copyReportToClipboard,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
    changeVideoQuality,
    cleanup,
    cancelReconnect,
    forceReconnect,
  };
};
