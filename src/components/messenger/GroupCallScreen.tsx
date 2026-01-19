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
  Monitor,
  MonitorOff,
  Users,
  MoreVertical,
  Grid3X3,
  UserPlus
} from 'lucide-react';
import { Avatar } from './Avatar';
import { cn } from '@/lib/utils';
import { GroupCallState, GroupCallParticipant } from '@/types/groupCall';
import { useCallSounds } from '@/hooks/useCallSounds';
import { InviteToCallDialog } from './InviteToCallDialog';

interface GroupCallScreenProps {
  callState: GroupCallState;
  chatId: string;
  onLeaveCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onSwitchCamera?: () => void;
  onStartScreenShare?: () => void;
  onStopScreenShare?: () => void;
  onInviteParticipants?: (participantIds: string[]) => Promise<void>;
}

type LayoutMode = 'grid' | 'spotlight';

export const GroupCallScreen = ({
  callState,
  chatId,
  onLeaveCall,
  onToggleMute,
  onToggleVideo,
  onSwitchCamera,
  onStartScreenShare,
  onStopScreenShare,
  onInviteParticipants,
}: GroupCallScreenProps) => {
  const { startDialingSound, stopAllSounds, playConnectedSound, playEndedSound } = useCallSounds();
  const [callDuration, setCallDuration] = useState(0);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [spotlightUserId, setSpotlightUserId] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const previousStatus = useRef(callState.status);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls
  useEffect(() => {
    const resetControlsTimeout = () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      setShowControls(true);
      controlsTimeoutRef.current = setTimeout(() => {
        if (callState.status === 'active') {
          setShowControls(false);
        }
      }, 5000);
    };

    resetControlsTimeout();

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [callState.status]);

  // Handle sounds
  useEffect(() => {
    if (callState.status === 'ringing' || callState.status === 'starting') {
      startDialingSound();
    }
    
    if (callState.status === 'active' && previousStatus.current !== 'active') {
      stopAllSounds();
      playConnectedSound();
    }
    
    previousStatus.current = callState.status;
    
    return () => {
      if (callState.status === 'ringing' || callState.status === 'starting') {
        stopAllSounds();
      }
    };
  }, [callState.status, startDialingSound, stopAllSounds, playConnectedSound]);

  // Connect local stream
  useEffect(() => {
    if (localVideoRef.current && callState.localStream) {
      localVideoRef.current.srcObject = callState.localStream;
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch(() => {});
    }
  }, [callState.localStream]);

  // Duration timer
  useEffect(() => {
    if (callState.status !== 'active') {
      setCallDuration(0);
      return;
    }

    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [callState.status]);

  // Auto-spotlight screen sharer
  useEffect(() => {
    const screenSharer = callState.participants.find(p => p.is_screen_sharing);
    if (screenSharer) {
      setLayoutMode('spotlight');
      setSpotlightUserId(screenSharer.user_id);
    } else if (spotlightUserId) {
      setLayoutMode('grid');
      setSpotlightUserId(null);
    }
  }, [callState.participants, spotlightUserId]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (callState.status) {
      case 'starting':
        return 'Запуск...';
      case 'ringing':
        return 'Ожидание участников...';
      case 'connecting':
        return 'Подключение...';
      case 'active':
        return formatDuration(callDuration);
      default:
        return '';
    }
  };

  const isVideoCall = callState.callType === 'video';
  const activeParticipants = callState.participants.filter(p => 
    p.status === 'active' || p.status === 'connecting'
  );

  const getGridLayout = (count: number) => {
    if (count <= 1) return 'grid-cols-1';
    if (count <= 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2 grid-rows-2';
    if (count <= 6) return 'grid-cols-3 grid-rows-2';
    return 'grid-cols-3 grid-rows-3';
  };

  const handleTap = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (callState.status === 'active') {
        setShowControls(false);
      }
    }, 5000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col bg-[#0b141a]"
      onClick={handleTap}
    >
      {/* Top bar */}
      <div className={cn(
        "relative z-30 flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300",
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-white/80" />
            <span className="text-white font-medium">
              {activeParticipants.length + 1} участник{activeParticipants.length === 0 ? '' : activeParticipants.length < 4 ? 'а' : 'ов'}
            </span>
          </div>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-white/80 text-sm">{getStatusText()}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Invite button */}
          {onInviteParticipants && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowInviteDialog(true);
              }}
              className="p-2 rounded-full bg-[#00a884] hover:bg-[#00a884]/80 transition-colors"
            >
              <UserPlus className="w-5 h-5 text-white" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLayoutMode(layoutMode === 'grid' ? 'spotlight' : 'grid');
            }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Grid3X3 className="w-5 h-5 text-white" />
          </button>
          <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <MoreVertical className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Main video area */}
      <div className="flex-1 flex flex-col items-center justify-center p-2 overflow-hidden">
        {layoutMode === 'grid' ? (
          <div className={cn(
            "w-full h-full grid gap-2",
            getGridLayout(activeParticipants.length + 1)
          )}>
            {/* Local video (self) */}
            <ParticipantTile
              name="Вы"
              isMuted={callState.isMuted}
              isVideoOff={callState.isVideoOff}
              isScreenSharing={callState.isScreenSharing}
              stream={callState.localStream}
              isLocal
              isVideoCall={isVideoCall}
            />
            
            {/* Remote participants */}
            {activeParticipants.map(participant => (
              <ParticipantTile
                key={participant.user_id}
                name={participant.display_name || 'Unknown'}
                avatarUrl={participant.avatar_url}
                isMuted={participant.is_muted}
                isVideoOff={participant.is_video_off}
                isScreenSharing={participant.is_screen_sharing}
                stream={participant.stream}
                isVideoCall={isVideoCall}
                onClick={() => {
                  setLayoutMode('spotlight');
                  setSpotlightUserId(participant.user_id);
                }}
              />
            ))}
            
            {/* Ringing participants */}
            {callState.participants
              .filter(p => p.status === 'ringing' || p.status === 'pending')
              .map(participant => (
                <div 
                  key={participant.user_id}
                  className="relative rounded-xl bg-[#1f2c34] flex flex-col items-center justify-center gap-2"
                >
                  <Avatar
                    src={participant.avatar_url || ''}
                    alt={participant.display_name || 'Unknown'}
                    size="lg"
                    className="opacity-60"
                  />
                  <p className="text-white/60 text-sm">{participant.display_name}</p>
                  <p className="text-white/40 text-xs">Вызов...</p>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 border-2 border-[#00a884]/30 rounded-full animate-ping" />
                  </div>
                </div>
              ))}
          </div>
        ) : (
          // Spotlight mode
          <div className="w-full h-full flex flex-col">
            {/* Main video */}
            <div className="flex-1 relative rounded-xl overflow-hidden bg-[#1f2c34]">
              {spotlightUserId ? (
                <ParticipantTile
                  name={activeParticipants.find(p => p.user_id === spotlightUserId)?.display_name || 'Unknown'}
                  avatarUrl={activeParticipants.find(p => p.user_id === spotlightUserId)?.avatar_url}
                  isMuted={activeParticipants.find(p => p.user_id === spotlightUserId)?.is_muted || false}
                  isVideoOff={activeParticipants.find(p => p.user_id === spotlightUserId)?.is_video_off || false}
                  isScreenSharing={activeParticipants.find(p => p.user_id === spotlightUserId)?.is_screen_sharing || false}
                  stream={activeParticipants.find(p => p.user_id === spotlightUserId)?.stream}
                  isVideoCall={isVideoCall}
                  isSpotlight
                />
              ) : (
                <ParticipantTile
                  name="Вы"
                  isMuted={callState.isMuted}
                  isVideoOff={callState.isVideoOff}
                  isScreenSharing={callState.isScreenSharing}
                  stream={callState.localStream}
                  isLocal
                  isVideoCall={isVideoCall}
                  isSpotlight
                />
              )}
            </div>
            
            {/* Thumbnail strip */}
            <div className="h-24 mt-2 flex gap-2 overflow-x-auto">
              {!spotlightUserId && (
                <div 
                  className="w-20 h-full rounded-lg overflow-hidden flex-shrink-0 bg-[#1f2c34] border-2 border-[#00a884]"
                >
                  <ParticipantTile
                    name="Вы"
                    isMuted={callState.isMuted}
                    isVideoOff={callState.isVideoOff}
                    stream={callState.localStream}
                    isLocal
                    isVideoCall={isVideoCall}
                    isThumbnail
                  />
                </div>
              )}
              {spotlightUserId && (
                <div 
                  className="w-20 h-full rounded-lg overflow-hidden flex-shrink-0 bg-[#1f2c34] cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSpotlightUserId(null);
                  }}
                >
                  <ParticipantTile
                    name="Вы"
                    isMuted={callState.isMuted}
                    isVideoOff={callState.isVideoOff}
                    stream={callState.localStream}
                    isLocal
                    isVideoCall={isVideoCall}
                    isThumbnail
                  />
                </div>
              )}
              {activeParticipants.map(participant => (
                <div 
                  key={participant.user_id}
                  className={cn(
                    "w-20 h-full rounded-lg overflow-hidden flex-shrink-0 bg-[#1f2c34] cursor-pointer",
                    spotlightUserId === participant.user_id && "border-2 border-[#00a884]"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSpotlightUserId(participant.user_id === spotlightUserId ? null : participant.user_id);
                  }}
                >
                  <ParticipantTile
                    name={participant.display_name || 'Unknown'}
                    avatarUrl={participant.avatar_url}
                    isMuted={participant.is_muted}
                    isVideoOff={participant.is_video_off}
                    stream={participant.stream}
                    isVideoCall={isVideoCall}
                    isThumbnail
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className={cn(
        "relative z-30 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300",
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}>
        <div className="flex items-center justify-center gap-4 mb-6">
          {/* Mute */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            className={cn(
              "flex flex-col items-center gap-1.5 p-4 rounded-full transition-all",
              callState.isMuted ? "bg-white" : "bg-white/20"
            )}
          >
            {callState.isMuted ? (
              <MicOff className="w-6 h-6 text-[#0b141a]" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </button>
          
          {/* Video */}
          {isVideoCall && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleVideo();
              }}
              className={cn(
                "flex flex-col items-center gap-1.5 p-4 rounded-full transition-all",
                callState.isVideoOff ? "bg-white" : "bg-white/20"
              )}
            >
              {callState.isVideoOff ? (
                <VideoOff className="w-6 h-6 text-[#0b141a]" />
              ) : (
                <Video className="w-6 h-6 text-white" />
              )}
            </button>
          )}
          
          {/* Screen Share */}
          {onStartScreenShare && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (callState.isScreenSharing) {
                  onStopScreenShare?.();
                } else {
                  onStartScreenShare();
                }
              }}
              className={cn(
                "flex flex-col items-center gap-1.5 p-4 rounded-full transition-all",
                callState.isScreenSharing ? "bg-[#00a884]" : "bg-white/20"
              )}
            >
              {callState.isScreenSharing ? (
                <MonitorOff className="w-6 h-6 text-white" />
              ) : (
                <Monitor className="w-6 h-6 text-white" />
              )}
            </button>
          )}
          
          {/* Switch Camera */}
          {isVideoCall && onSwitchCamera && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSwitchCamera();
              }}
              className="flex flex-col items-center gap-1.5 p-4 rounded-full bg-white/20 transition-all hover:bg-white/30"
            >
              <SwitchCamera className="w-6 h-6 text-white" />
            </button>
          )}
          
          {/* Speaker */}
          <button className="flex flex-col items-center gap-1.5 p-4 rounded-full bg-white/20 transition-all hover:bg-white/30">
            <Volume2 className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* End Call Button */}
        <div className="flex justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              playEndedSound();
              onLeaveCall();
            }}
            className="flex items-center justify-center w-16 h-16 rounded-full bg-[#f15c6d] shadow-lg hover:bg-[#e04b5c] hover:scale-105 transition-all"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>
        </div>
      </div>

      {/* Invite Dialog */}
      {chatId && onInviteParticipants && (
        <InviteToCallDialog
          isOpen={showInviteDialog}
          onClose={() => setShowInviteDialog(false)}
          chatId={chatId}
          currentParticipants={callState.participants}
          onInvite={onInviteParticipants}
          maxParticipants={8}
        />
      )}
    </div>
  );
};

// Participant tile component
interface ParticipantTileProps {
  name: string;
  avatarUrl?: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing?: boolean;
  stream?: MediaStream | null;
  isLocal?: boolean;
  isVideoCall: boolean;
  isThumbnail?: boolean;
  isSpotlight?: boolean;
  onClick?: () => void;
}

const ParticipantTile = ({
  name,
  avatarUrl,
  isMuted,
  isVideoOff,
  isScreenSharing,
  stream,
  isLocal,
  isVideoCall,
  isThumbnail,
  isSpotlight,
  onClick,
}: ParticipantTileProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      if (isLocal) videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, isLocal]);

  const showVideo = isVideoCall && stream && !isVideoOff;

  return (
    <div 
      className={cn(
        "relative rounded-xl overflow-hidden bg-[#1f2c34] flex items-center justify-center",
        onClick && "cursor-pointer hover:ring-2 hover:ring-[#00a884] transition-all",
        isSpotlight && "h-full"
      )}
      onClick={onClick}
    >
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={cn(
            "w-full h-full object-cover",
            isLocal && !isScreenSharing && "scale-x-[-1]"
          )}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2">
          <Avatar
            src={avatarUrl || ''}
            alt={name}
            size={isThumbnail ? 'sm' : isSpotlight ? 'xl' : 'lg'}
            className={isThumbnail ? 'w-10 h-10' : isSpotlight ? 'w-32 h-32' : 'w-16 h-16'}
          />
          {!isThumbnail && (
            <p className={cn(
              "text-white font-medium text-center px-2",
              isSpotlight ? "text-xl" : "text-sm"
            )}>
              {name}
            </p>
          )}
        </div>
      )}
      
      {/* Overlay info */}
      {!isThumbnail && (
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <div className="flex items-center gap-1 bg-black/50 rounded-full px-2 py-1">
            {isScreenSharing && (
              <Monitor className="w-3 h-3 text-[#00a884]" />
            )}
            <span className="text-white text-xs truncate max-w-[100px]">
              {isLocal ? 'Вы' : name}
            </span>
          </div>
          {isMuted && (
            <div className="bg-black/50 rounded-full p-1">
              <MicOff className="w-3 h-3 text-red-400" />
            </div>
          )}
        </div>
      )}
      
      {/* Thumbnail mute indicator */}
      {isThumbnail && isMuted && (
        <div className="absolute bottom-1 right-1 bg-black/50 rounded-full p-0.5">
          <MicOff className="w-2.5 h-2.5 text-red-400" />
        </div>
      )}
    </div>
  );
};
