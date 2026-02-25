import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  Volume2,
  Volume1,
  Headphones,
  SwitchCamera,
  MessageSquare,
  Settings,
  RefreshCw,
  WifiOff
} from 'lucide-react';
import { Avatar } from './Avatar';
import { CallDiagnostics } from './CallDiagnostics';
import { ConnectionQualityIndicator } from './ConnectionQualityIndicator';
import { cn } from '@/lib/utils';
import { PeerConnectionState } from '@/hooks/useWebRTC';
import { useConnectionStats, VideoQuality } from '@/hooks/useConnectionStats';
import { useCallSounds } from '@/hooks/useCallSounds';
import { useAudioRouting, AudioRoute } from '@/hooks/useAudioRouting';
import { DiagnosticLogEntry } from '@/hooks/useCallDiagnosticLogs';
import { ReconnectionState } from '@/hooks/useAutoReconnect';

interface CallScreenProps {
  participantName: string;
  participantAvatar: string;
  callType: 'voice' | 'video';
  callStatus: 'calling' | 'ringing' | 'connecting' | 'active';
  isMuted: boolean;
  isVideoOff: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerConnectionState: PeerConnectionState | null;
  reconnectionState?: ReconnectionState | null;
  getPeerConnection?: () => RTCPeerConnection | null;
  diagnosticLogs?: DiagnosticLogEntry[];
  onCopyDiagnosticReport?: () => Promise<boolean>;
  error: string | null;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onSwitchCamera?: () => void;
  onChangeVideoQuality?: (quality: VideoQuality) => void;
  onForceReconnect?: () => void;
  onCancelReconnect?: () => void;
}

export const CallScreen = ({ 
  participantName, 
  participantAvatar,
  callType, 
  callStatus,
  isMuted,
  isVideoOff,
  localStream,
  remoteStream,
  peerConnectionState,
  reconnectionState,
  getPeerConnection,
  diagnosticLogs = [],
  onCopyDiagnosticReport,
  error,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onSwitchCamera,
  onChangeVideoQuality,
  onForceReconnect,
  onCancelReconnect
}: CallScreenProps) => {
  // Get peerConnection from getter to always have current value
  const peerConnection = getPeerConnection?.() ?? null;
  
  const { stats: connectionStats, setVideoQuality } = useConnectionStats(peerConnection, {
    autoAdaptQuality: true,
    onQualityChange: onChangeVideoQuality,
  });
  const { startDialingSound, stopAllSounds, playConnectedSound, playEndedSound } = useCallSounds();
  const { 
    audioRoute, 
    isSpeakerOn, 
    isHeadphonesConnected, 
    cycleAudioRoute, 
    applyAudioRoute 
  } = useAudioRouting('earpiece'); // Default to earpiece for voice calls
  const [callDuration, setCallDuration] = useState(0);
  const [needsTapToPlay, setNeedsTapToPlay] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const previousStatus = useRef(callStatus);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Handle call status changes for sounds
  useEffect(() => {
    console.log('[CallScreen] Call status changed:', previousStatus.current, '->', callStatus);
    
    // Start dialing sound when calling/ringing
    if (callStatus === 'calling' || callStatus === 'ringing') {
      startDialingSound();
    }
    
    // Stop dialing and play connected sound when call becomes active
    if (callStatus === 'active' && previousStatus.current !== 'active') {
      console.log('[CallScreen] Call connected - stopping all sounds');
      stopAllSounds();
      playConnectedSound();
    }
    
    // If status changed FROM calling/ringing to something else, stop sounds
    if ((previousStatus.current === 'calling' || previousStatus.current === 'ringing') && 
        callStatus !== 'calling' && callStatus !== 'ringing') {
      console.log('[CallScreen] Status changed from calling/ringing - stopping sounds');
      stopAllSounds();
    }
    
    previousStatus.current = callStatus;
  }, [callStatus, startDialingSound, stopAllSounds, playConnectedSound]);

  // Cleanup sounds and media elements when component unmounts
  useEffect(() => {
    return () => {
      console.log('[CallScreen] Component unmounting - stopping all sounds and cleaning media');
      
      // Play ended sound BEFORE stopping all sounds (so AudioContext is still alive)
      if (previousStatus.current === 'active') {
        playEndedSound();
      }
      
      // Small delay to let ended sound play, then kill everything
      setTimeout(() => {
        stopAllSounds();
      }, 300);
      
      // Clean up media elements immediately to prevent audio artifacts
      if (remoteAudioRef.current) {
        remoteAudioRef.current.pause();
        remoteAudioRef.current.srcObject = null;
        remoteAudioRef.current.src = '';
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.pause();
        remoteVideoRef.current.srcObject = null;
      }
      if (localVideoRef.current) {
        localVideoRef.current.pause();
        localVideoRef.current.srcObject = null;
      }
    };
  }, [playEndedSound, stopAllSounds]);

  const tryPlayRemoteMedia = useCallback(async () => {
    // Mobile browsers often block autoplay with audio until user gesture.
    // We try anyway and show a "tap to enable" overlay on failure.
    try {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.muted = false;
        applyAudioRoute(remoteVideoRef.current as unknown as HTMLAudioElement);
        await remoteVideoRef.current.play();
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.muted = false;
        applyAudioRoute(remoteAudioRef.current);
        await remoteAudioRef.current.play();
      }
      setNeedsTapToPlay(false);
      console.log('Remote media playback started');
    } catch (err) {
      console.log('Remote media autoplay blocked. Waiting for user gesture.', err);
      setNeedsTapToPlay(true);
    }
  }, [applyAudioRoute]);

  // Connect local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch(() => {
        // muted should still autoplay; ignore
      });
      console.log('Local video connected');
    }
  }, [localStream]);

  // Connect remote stream to video/audio elements
  useEffect(() => {
    if (remoteStream) {
      const videoTracks = remoteStream.getVideoTracks();
      const audioTracks = remoteStream.getAudioTracks();
      console.log('Remote stream received - video tracks:', videoTracks.length, 'audio tracks:', audioTracks.length);
      videoTracks.forEach((t, i) => console.log(`  Video track ${i}: enabled=${t.enabled}, muted=${t.muted}, readyState=${t.readyState}`));
      audioTracks.forEach((t, i) => console.log(`  Audio track ${i}: enabled=${t.enabled}, muted=${t.muted}, readyState=${t.readyState}`));

      if (remoteVideoRef.current) {
        // Ensure we're setting a fresh stream reference
        if (remoteVideoRef.current.srcObject !== remoteStream) {
          remoteVideoRef.current.srcObject = remoteStream;
          console.log('Set remote video srcObject');
        }
      }
      if (remoteAudioRef.current) {
        if (remoteAudioRef.current.srcObject !== remoteStream) {
          remoteAudioRef.current.srcObject = remoteStream;
          console.log('Set remote audio srcObject');
        }
      }

      // Attempt playback (may require user gesture on mobile)
      tryPlayRemoteMedia();
    }
  }, [remoteStream, tryPlayRemoteMedia]);

  useEffect(() => {
    if (callStatus !== 'active') {
      setCallDuration(0);
      return;
    }

    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'calling':
        return 'Вызов...';
      case 'ringing':
        return 'Звонок...';
      case 'connecting':
        return 'Подключение...';
      case 'active':
        return formatDuration(callDuration);
    }
  };

  const isVideoCall = callType === 'video';
  const hasRemoteVideo = remoteStream && remoteStream.getVideoTracks().some(t => t.readyState === 'live');
  const hasLocalVideo = localStream && localStream.getVideoTracks().length > 0 && !isVideoOff;
  // Show remote video as soon as we have it, even while connecting
  const showRemoteVideo = isVideoCall && hasRemoteVideo && (callStatus === 'active' || callStatus === 'connecting');

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b141a]">
      {/* Remote Video / Background */}
      {/* Hidden remote audio element to ensure audio plays even if video rendering is blocked */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Always render video element to maintain srcObject, control visibility with CSS */}
      <div className={cn("absolute inset-0", showRemoteVideo ? "block" : "hidden")}>
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      </div>
      {!showRemoteVideo && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b141a] via-[#1f2c34] to-[#0b141a]" />
      )}

      {/* Diagnostics Panel */}
      {showDiagnostics && (
        <CallDiagnostics
          localStream={localStream}
          remoteStream={remoteStream}
          peerConnectionState={peerConnectionState}
          error={error}
          logs={diagnosticLogs}
          onCopyReport={onCopyDiagnosticReport}
          onClose={() => setShowDiagnostics(false)}
        />
      )}

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-2">
          {callStatus === 'active' ? (
            <ConnectionQualityIndicator 
              stats={connectionStats} 
              onQualityChange={(quality) => {
                setVideoQuality(quality);
                onChangeVideoQuality?.(quality);
              }}
              isVideoCall={isVideoCall}
            />
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-white/80 text-sm font-medium">
                {getStatusText()}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {callStatus === 'active' && (
            <span className="text-white text-sm font-medium">{formatDuration(callDuration)}</span>
          )}
          <button 
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Settings className="w-4 h-4 text-white/80" />
            <span className="text-white/80 text-xs font-medium">Диагностика</span>
          </button>
        </div>
      </div>

      {/* Tap-to-play overlay (mobile autoplay restrictions) */}
      {needsTapToPlay && callStatus === 'active' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <button
            onClick={tryPlayRemoteMedia}
            className="px-5 py-3 rounded-full bg-white text-[#0b141a] font-medium shadow-lg"
          >
            Нажмите, чтобы включить звук
          </button>
        </div>
      )}

      {/* Reconnection overlay */}
      {reconnectionState?.isReconnecting && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-[#1f2c34] border border-white/10">
            <div className="relative">
              <WifiOff className="w-12 h-12 text-yellow-400" />
              <RefreshCw className="absolute -bottom-1 -right-1 w-5 h-5 text-white animate-spin" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-white">Соединение потеряно</h3>
              <p className="mt-1 text-sm text-white/60">
                Попытка {reconnectionState.reconnectAttempt} из {reconnectionState.maxAttempts}
              </p>
            </div>
            <div className="w-48 bg-white/10 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-yellow-400 transition-all duration-300"
                style={{ width: `${(reconnectionState.reconnectAttempt / reconnectionState.maxAttempts) * 100}%` }}
              />
            </div>
            <div className="flex gap-3 mt-2">
              {onForceReconnect && (
                <button
                  onClick={onForceReconnect}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#00a884] text-white text-sm font-medium hover:bg-[#00a884]/80 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Повторить
                </button>
              )}
              <button
                onClick={onEndCall}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#f15c6d] text-white text-sm font-medium hover:bg-[#f15c6d]/80 transition-colors"
              >
                <PhoneOff className="w-4 h-4" />
                Завершить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        {/* Show avatar for voice calls or when connecting */}
        {(!showRemoteVideo) && (
          <div className="flex flex-col items-center">
            <div className="relative">
              <Avatar
                src={participantAvatar}
                alt={participantName}
                size="xl"
                className="w-36 h-36 ring-4 ring-white/10"
              />
              {callStatus !== 'active' && !reconnectionState?.isReconnecting && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-40 h-40 border-4 border-[#00a884]/30 rounded-full animate-ping" />
                </div>
              )}
              {reconnectionState?.isReconnecting && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-40 h-40 border-4 border-yellow-400/30 rounded-full animate-pulse" />
                </div>
              )}
            </div>
            <h2 className="mt-6 text-2xl font-medium text-white">{participantName}</h2>
            <p className="mt-2 text-white/60 text-base">
              {error || getStatusText()}
            </p>
            {error && !reconnectionState?.isReconnecting && (
              <p className="mt-1 text-yellow-400 text-sm animate-pulse">
                Попытка переподключения...
              </p>
            )}
          </div>
        )}
        
        {/* Name overlay for active video */}
        {showRemoteVideo && (
          <div className="absolute top-16 left-0 right-0 flex flex-col items-center">
            <h2 className="text-xl font-medium text-white drop-shadow-lg">{participantName}</h2>
            <p className="text-white/80 text-sm drop-shadow-lg">{getStatusText()}</p>
          </div>
        )}
      </div>

      {/* Local Video Preview (PiP) */}
      {isVideoCall && hasLocalVideo && (
        <div 
          className={cn(
            "absolute rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 z-20",
            callStatus === 'active' 
              ? "top-20 right-4 w-28 h-40 md:w-36 md:h-48" 
              : "bottom-44 right-4 w-28 h-40"
          )}
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          {onSwitchCamera && (
            <button
              onClick={onSwitchCamera}
              className="absolute bottom-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            >
              <SwitchCamera className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      )}

      {/* Video Off Placeholder */}
      {isVideoCall && !hasLocalVideo && callStatus === 'active' && (
        <div className="absolute top-20 right-4 w-28 h-40 md:w-36 md:h-48 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 z-20 bg-[#1f2c34] flex items-center justify-center">
          <VideoOff className="w-8 h-8 text-white/50" />
        </div>
      )}

      {/* Bottom Controls - WhatsApp style */}
      <div className="relative z-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-4 bg-gradient-to-t from-black/80 to-transparent">
        {/* Control buttons row */}
        <div className="flex items-center justify-center gap-6 mb-6">
          {/* Audio Route Toggle (WhatsApp style - cycles through routes) */}
          <button 
            onClick={() => {
              cycleAudioRoute();
              // Re-apply audio route after toggle
              setTimeout(() => {
                if (remoteAudioRef.current) {
                  applyAudioRoute(remoteAudioRef.current);
                }
                tryPlayRemoteMedia();
              }, 50);
            }}
            className={cn(
              "flex flex-col items-center gap-1.5 p-4 rounded-full transition-all relative",
              audioRoute === 'speaker' ? "bg-white" : "bg-white/20"
            )}
          >
            {audioRoute === 'headphones' ? (
              <Headphones className="w-6 h-6 text-white" />
            ) : audioRoute === 'speaker' ? (
              <Volume2 className="w-6 h-6 text-[#0b141a]" />
            ) : (
              <Volume1 className="w-6 h-6 text-white" />
            )}
            {/* Route label */}
            <span className="absolute -bottom-5 text-[10px] text-white/70 whitespace-nowrap">
              {audioRoute === 'headphones' ? 'Наушники' : audioRoute === 'speaker' ? 'Динамик' : 'Телефон'}
            </span>
          </button>
          
          {/* Video toggle */}
          {isVideoCall && (
            <button
              onClick={onToggleVideo}
              className={cn(
                "flex flex-col items-center gap-1.5 p-4 rounded-full transition-all",
                isVideoOff ? "bg-white" : "bg-white/20"
              )}
            >
              {isVideoOff ? (
                <VideoOff className="w-6 h-6 text-[#0b141a]" />
              ) : (
                <Video className="w-6 h-6 text-white" />
              )}
            </button>
          )}
          
          {/* Mute */}
          <button
            onClick={onToggleMute}
            className={cn(
              "flex flex-col items-center gap-1.5 p-4 rounded-full transition-all",
              isMuted ? "bg-white" : "bg-white/20"
            )}
          >
            {isMuted ? (
              <MicOff className="w-6 h-6 text-[#0b141a]" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </button>
          
          {/* Message */}
          <button className="flex flex-col items-center gap-1.5 p-4 rounded-full bg-white/20 transition-all hover:bg-white/30">
            <MessageSquare className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* End Call Button */}
        <div className="flex justify-center">
          <button
            onClick={onEndCall}
            className="flex items-center justify-center w-16 h-16 rounded-full bg-[#f15c6d] shadow-lg hover:bg-[#e04b5c] hover:scale-105 transition-all"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};
