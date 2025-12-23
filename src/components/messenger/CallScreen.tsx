import { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  Volume2,
  MoreVertical,
  SwitchCamera
} from 'lucide-react';
import { Avatar } from './Avatar';
import { cn } from '@/lib/utils';

interface CallScreenProps {
  participantName: string;
  participantAvatar: string;
  callType: 'voice' | 'video';
  callStatus: 'calling' | 'ringing' | 'connecting' | 'active';
  isMuted: boolean;
  isVideoOff: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
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
  onEndCall,
  onToggleMute,
  onToggleVideo
}: CallScreenProps) => {
  const [callDuration, setCallDuration] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Connect local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Connect remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

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

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-b from-background via-background to-muted/50">
      {/* Background / Remote Video */}
      {isVideoCall && hasRemoteVideo && callStatus === 'active' ? (
        <div className="absolute inset-0 bg-black">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay for controls visibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
        </div>
      ) : (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
        </div>
      )}

      {/* Top Section - User Info */}
      <div className="relative z-10 flex flex-col items-center pt-20">
        {/* Show avatar only for voice calls or when video is not active */}
        {(!isVideoCall || !hasRemoteVideo || callStatus !== 'active') && (
          <>
            <div className="relative">
              <Avatar
                src={participantAvatar}
                alt={participantName}
                size="xl"
                className="w-32 h-32 ring-4 ring-primary/20"
              />
              {callStatus !== 'active' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-36 h-36 border-4 border-primary/30 rounded-full animate-ping" />
                </div>
              )}
            </div>
            <h2 className="mt-6 text-2xl font-semibold">{participantName}</h2>
          </>
        )}
        
        {/* Status text */}
        <p className={cn(
          'mt-2 text-lg',
          callStatus === 'active' ? 'text-status-online' : 'text-muted-foreground animate-pulse-soft',
          isVideoCall && hasRemoteVideo && callStatus === 'active' && 'text-white/80'
        )}>
          {getStatusText()}
        </p>
        
        {/* Show name overlay for video calls */}
        {isVideoCall && hasRemoteVideo && callStatus === 'active' && (
          <h2 className="text-xl font-semibold text-white">{participantName}</h2>
        )}
      </div>

      {/* Local Video Preview (Picture-in-Picture) */}
      {isVideoCall && hasLocalVideo && callStatus === 'active' && (
        <div className="absolute top-20 right-4 w-32 h-44 md:w-40 md:h-56 rounded-2xl overflow-hidden shadow-xl border-2 border-white/20 z-20">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
            style={{ transform: 'scaleX(-1)' }}
          />
        </div>
      )}

      {/* Video Off Placeholder for local video */}
      {isVideoCall && !hasLocalVideo && callStatus === 'active' && (
        <div className="absolute top-20 right-4 w-32 h-44 md:w-40 md:h-56 rounded-2xl overflow-hidden shadow-xl border-2 border-white/20 z-20 bg-muted flex items-center justify-center">
          <VideoOff className="w-8 h-8 text-muted-foreground" />
        </div>
      )}

      {/* Controls */}
      <div className="relative z-10 flex flex-col items-center gap-8 pb-12">
        {/* Secondary Controls */}
        <div className="flex items-center gap-4">
          <button className={cn(
            "p-4 rounded-full shadow-soft transition-colors",
            isVideoCall && hasRemoteVideo && callStatus === 'active'
              ? "bg-white/20 hover:bg-white/30 backdrop-blur-sm"
              : "bg-card hover:bg-muted"
          )}>
            <Volume2 className={cn(
              "w-6 h-6",
              isVideoCall && hasRemoteVideo && callStatus === 'active'
                ? "text-white"
                : "text-foreground"
            )} />
          </button>
          
          {isVideoCall && (
            <button
              onClick={onToggleVideo}
              className={cn(
                'p-4 rounded-full shadow-soft transition-colors',
                isVideoOff 
                  ? 'bg-destructive' 
                  : isVideoCall && hasRemoteVideo && callStatus === 'active'
                    ? 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
                    : 'bg-card hover:bg-muted'
              )}
            >
              {isVideoOff ? (
                <VideoOff className="w-6 h-6 text-destructive-foreground" />
              ) : (
                <Video className={cn(
                  "w-6 h-6",
                  isVideoCall && hasRemoteVideo && callStatus === 'active'
                    ? "text-white"
                    : "text-foreground"
                )} />
              )}
            </button>
          )}
          
          <button
            onClick={onToggleMute}
            className={cn(
              'p-4 rounded-full shadow-soft transition-colors',
              isMuted 
                ? 'bg-destructive' 
                : isVideoCall && hasRemoteVideo && callStatus === 'active'
                  ? 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
                  : 'bg-card hover:bg-muted'
            )}
          >
            {isMuted ? (
              <MicOff className="w-6 h-6 text-destructive-foreground" />
            ) : (
              <Mic className={cn(
                "w-6 h-6",
                isVideoCall && hasRemoteVideo && callStatus === 'active'
                  ? "text-white"
                  : "text-foreground"
              )} />
            )}
          </button>
          
          <button className={cn(
            "p-4 rounded-full shadow-soft transition-colors",
            isVideoCall && hasRemoteVideo && callStatus === 'active'
              ? "bg-white/20 hover:bg-white/30 backdrop-blur-sm"
              : "bg-card hover:bg-muted"
          )}>
            <MoreVertical className={cn(
              "w-6 h-6",
              isVideoCall && hasRemoteVideo && callStatus === 'active'
                ? "text-white"
                : "text-foreground"
            )} />
          </button>
        </div>

        {/* End Call Button */}
        <button
          onClick={onEndCall}
          className="p-5 rounded-full bg-destructive shadow-medium hover:bg-destructive/90 hover:scale-105 transition-all"
        >
          <PhoneOff className="w-7 h-7 text-destructive-foreground" />
        </button>
      </div>
    </div>
  );
};
