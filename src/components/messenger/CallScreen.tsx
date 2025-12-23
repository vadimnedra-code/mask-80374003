import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  Volume2,
  SwitchCamera,
  MessageSquare,
  Settings2
} from 'lucide-react';
import { Avatar } from './Avatar';
import { CallDiagnostics } from './CallDiagnostics';
import { ConnectionQualityIndicator } from './ConnectionQualityIndicator';
import { cn } from '@/lib/utils';
import { PeerConnectionState } from '@/hooks/useWebRTC';
import { useConnectionStats } from '@/hooks/useConnectionStats';

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
  peerConnection: RTCPeerConnection | null;
  error: string | null;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onSwitchCamera?: () => void;
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
  peerConnection,
  error,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onSwitchCamera
}: CallScreenProps) => {
  const connectionStats = useConnectionStats(peerConnection);
  const [callDuration, setCallDuration] = useState(0);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [needsTapToPlay, setNeedsTapToPlay] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const tryPlayRemoteMedia = useCallback(async () => {
    // Mobile browsers often block autoplay with audio until user gesture.
    // We try anyway and show a "tap to enable" overlay on failure.
    try {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.muted = false;
        remoteVideoRef.current.volume = 1;
        await remoteVideoRef.current.play();
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.volume = 1;
        await remoteAudioRef.current.play();
      }
      setNeedsTapToPlay(false);
      console.log('Remote media playback started');
    } catch (err) {
      console.log('Remote media autoplay blocked. Waiting for user gesture.', err);
      setNeedsTapToPlay(true);
    }
  }, []);

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
      const tracks = remoteStream.getTracks().map((t) => t.kind).join(', ');
      console.log('Remote stream received with tracks:', tracks);

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
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
  const hasRemoteVideo = remoteStream && remoteStream.getVideoTracks().length > 0;
  const hasLocalVideo = localStream && localStream.getVideoTracks().length > 0 && !isVideoOff;
  const showRemoteVideo = isVideoCall && hasRemoteVideo && callStatus === 'active';

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
          onClose={() => setShowDiagnostics(false)}
        />
      )}

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-2">
          {callStatus === 'active' ? (
            <ConnectionQualityIndicator stats={connectionStats} />
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
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
          >
            <Settings2 className="w-5 h-5 text-white/70" />
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
              {callStatus !== 'active' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-40 h-40 border-4 border-[#00a884]/30 rounded-full animate-ping" />
                </div>
              )}
            </div>
            <h2 className="mt-6 text-2xl font-medium text-white">{participantName}</h2>
            <p className="mt-2 text-white/60 text-base">
              {getStatusText()}
            </p>
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
      <div className="relative z-10 pb-10 pt-4 bg-gradient-to-t from-black/80 to-transparent">
        {/* Control buttons row */}
        <div className="flex items-center justify-center gap-6 mb-6">
          {/* Speaker */}
          <button 
            onClick={() => {
              setIsSpeakerOn(!isSpeakerOn);
              // Best-effort volume control (routing to speaker is not controllable in most mobile browsers)
              if (remoteVideoRef.current) remoteVideoRef.current.volume = 1;
              if (remoteAudioRef.current) remoteAudioRef.current.volume = 1;
              tryPlayRemoteMedia();
            }}
            className={cn(
              "flex flex-col items-center gap-1.5 p-4 rounded-full transition-all",
              isSpeakerOn ? "bg-white" : "bg-white/20"
            )}
          >
            <Volume2 className={cn(
              "w-6 h-6",
              isSpeakerOn ? "text-[#0b141a]" : "text-white"
            )} />
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
