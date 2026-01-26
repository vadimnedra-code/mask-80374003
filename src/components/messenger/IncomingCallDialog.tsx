import { useEffect } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { Avatar } from './Avatar';
import { cn } from '@/lib/utils';
import { IncomingCall } from '@/hooks/useIncomingCalls';
import { useCallSounds } from '@/hooks/useCallSounds';
import { useCallNotifications } from '@/hooks/useCallNotifications';
import { useCallVibration } from '@/hooks/useCallVibration';

interface IncomingCallDialogProps {
  call: IncomingCall;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallDialog = ({ call, onAccept, onReject }: IncomingCallDialogProps) => {
  const isVideoCall = call.call_type === 'video';
  const { startRingtoneSound, stopAllSounds, playConnectedSound } = useCallSounds();
  const { showIncomingCallNotification, closeNotification } = useCallNotifications();
  const { startCallVibration, stopVibration } = useCallVibration();
  
  console.log('[IncomingCallDialog] Component rendered for call:', call.id);

  // Start ringtone and vibration when dialog appears
  useEffect(() => {
    console.log('[IncomingCallDialog] useEffect triggered, starting ringtone and vibration');
    startRingtoneSound();
    startCallVibration();
    
    // Show notification if page is not focused
    if (document.hidden) {
      console.log('[IncomingCallDialog] Page hidden, showing notification');
      showIncomingCallNotification(
        call.caller_name || 'Неизвестный',
        call.caller_avatar || '',
        isVideoCall,
        onAccept,
        onReject
      );
    } else {
      console.log('[IncomingCallDialog] Page visible, skipping notification');
    }

    return () => {
      console.log('[IncomingCallDialog] Cleanup - stopping sounds and vibration');
      stopAllSounds();
      stopVibration();
      closeNotification();
    };
  }, [call, isVideoCall, onAccept, onReject, showIncomingCallNotification, closeNotification, startRingtoneSound, stopAllSounds, startCallVibration, stopVibration]);

  const handleAccept = () => {
    console.log('[IncomingCallDialog] Accept clicked - stopping sounds/vibration and accepting');
    // Stop sounds and vibration immediately
    stopAllSounds();
    stopVibration();
    closeNotification();
    // Accept call immediately - don't delay!
    onAccept();
    // Play connected sound after accepting
    setTimeout(() => {
      playConnectedSound();
    }, 100);
  };

  const handleReject = () => {
    console.log('IncomingCallDialog: reject clicked for call', call.id);
    stopAllSounds();
    stopVibration();
    closeNotification();
    onReject();
  };
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background animate-fade-in">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-surface-elevated to-background" />
      
      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-[env(safe-area-inset-top)]">
        {/* Avatar with animation */}
        <div className="relative mb-8">
          <Avatar
            src={call.caller_avatar || ''}
            alt={call.caller_name || 'Caller'}
            size="xl"
            className="w-32 h-32 ring-4 ring-primary/20"
          />
          {/* Pulsing rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-36 h-36 border-4 border-primary/20 rounded-full animate-ping" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 border-2 border-primary/10 rounded-full animate-pulse" />
          </div>
        </div>
        
        {/* Caller info */}
        <h2 className="text-2xl font-medium text-foreground">{call.caller_name}</h2>
        <p className="mt-3 text-muted-foreground flex items-center gap-2">
          {isVideoCall ? (
            <>
              <Video className="w-4 h-4" />
              Входящий видеозвонок
            </>
          ) : (
            <>
              <Phone className="w-4 h-4" />
              Входящий звонок
            </>
          )}
        </p>
      </div>

      {/* Action Buttons - Premium style */}
      <div className="relative z-10 pb-[max(3rem,env(safe-area-inset-bottom))] pt-6">
        <div className="flex items-center justify-center gap-20">
          {/* Decline */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleReject}
              className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive shadow-lg hover:bg-destructive/90 hover:scale-105 transition-all"
            >
              <PhoneOff className="w-7 h-7 text-destructive-foreground" />
            </button>
            <span className="text-muted-foreground text-sm">Отклонить</span>
          </div>
          
          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleAccept}
              className="flex items-center justify-center w-16 h-16 rounded-full bg-[hsl(var(--online))] shadow-lg hover:opacity-90 hover:scale-105 transition-all"
            >
              {isVideoCall ? (
                <Video className="w-7 h-7 text-primary-foreground" />
              ) : (
                <Phone className="w-7 h-7 text-primary-foreground" />
              )}
            </button>
            <span className="text-muted-foreground text-sm">Принять</span>
          </div>
        </div>
      </div>
    </div>
  );
};
