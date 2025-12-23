import { useState, useEffect } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  Volume2,
  MoreVertical
} from 'lucide-react';
import { User } from '@/types/chat';
import { Avatar } from './Avatar';
import { cn } from '@/lib/utils';

interface CallScreenProps {
  user: User;
  callType: 'voice' | 'video';
  onEndCall: () => void;
}

export const CallScreen = ({ user, callType, onEndCall }: CallScreenProps) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'voice');
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'active'>('connecting');

  useEffect(() => {
    // Simulate call connection
    const connectTimer = setTimeout(() => setCallStatus('ringing'), 1000);
    const activeTimer = setTimeout(() => setCallStatus('active'), 3000);

    return () => {
      clearTimeout(connectTimer);
      clearTimeout(activeTimer);
    };
  }, []);

  useEffect(() => {
    if (callStatus !== 'active') return;

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
      case 'connecting':
        return 'Подключение...';
      case 'ringing':
        return 'Вызов...';
      case 'active':
        return formatDuration(callDuration);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-b from-background via-background to-muted/50">
      {/* Background blur effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
      </div>

      {/* Top Section */}
      <div className="relative z-10 flex flex-col items-center pt-20">
        <div className="relative">
          <Avatar
            src={user.avatar}
            alt={user.name}
            size="xl"
            className="w-32 h-32 ring-4 ring-primary/20"
          />
          {callStatus !== 'active' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-36 h-36 border-4 border-primary/30 rounded-full animate-ping" />
            </div>
          )}
        </div>
        <h2 className="mt-6 text-2xl font-semibold">{user.name}</h2>
        <p className={cn(
          'mt-2 text-lg',
          callStatus === 'active' ? 'text-status-online' : 'text-muted-foreground animate-pulse-soft'
        )}>
          {getStatusText()}
        </p>
      </div>

      {/* Video Preview (for video calls) */}
      {callType === 'video' && !isVideoOff && callStatus === 'active' && (
        <div className="absolute bottom-32 right-4 w-32 h-44 bg-muted rounded-2xl overflow-hidden shadow-medium border border-border">
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xs text-muted-foreground">Ваше видео</span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="relative z-10 flex flex-col items-center gap-8 pb-12">
        {/* Secondary Controls */}
        <div className="flex items-center gap-4">
          <button className="p-4 rounded-full bg-card shadow-soft hover:bg-muted transition-colors">
            <Volume2 className="w-6 h-6 text-foreground" />
          </button>
          {callType === 'video' && (
            <button
              onClick={() => setIsVideoOff(!isVideoOff)}
              className={cn(
                'p-4 rounded-full shadow-soft transition-colors',
                isVideoOff ? 'bg-destructive' : 'bg-card hover:bg-muted'
              )}
            >
              {isVideoOff ? (
                <VideoOff className="w-6 h-6 text-destructive-foreground" />
              ) : (
                <Video className="w-6 h-6 text-foreground" />
              )}
            </button>
          )}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={cn(
              'p-4 rounded-full shadow-soft transition-colors',
              isMuted ? 'bg-destructive' : 'bg-card hover:bg-muted'
            )}
          >
            {isMuted ? (
              <MicOff className="w-6 h-6 text-destructive-foreground" />
            ) : (
              <Mic className="w-6 h-6 text-foreground" />
            )}
          </button>
          <button className="p-4 rounded-full bg-card shadow-soft hover:bg-muted transition-colors">
            <MoreVertical className="w-6 h-6 text-foreground" />
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
