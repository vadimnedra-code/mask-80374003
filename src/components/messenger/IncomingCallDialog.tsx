import { Phone, PhoneOff, Video } from 'lucide-react';
import { Avatar } from './Avatar';
import { cn } from '@/lib/utils';
import { IncomingCall } from '@/hooks/useIncomingCalls';

interface IncomingCallDialogProps {
  call: IncomingCall;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallDialog = ({ call, onAccept, onReject }: IncomingCallDialogProps) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-3xl p-8 shadow-xl border border-border max-w-sm w-full mx-4 animate-scale-in">
        {/* Caller Info */}
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <Avatar
              src={call.caller_avatar || ''}
              alt={call.caller_name || 'Caller'}
              size="xl"
              className="w-24 h-24 ring-4 ring-primary/20"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-28 h-28 border-4 border-primary/30 rounded-full animate-ping" />
            </div>
          </div>
          
          <h2 className="mt-6 text-xl font-semibold">{call.caller_name}</h2>
          <p className="mt-2 text-muted-foreground animate-pulse-soft flex items-center gap-2">
            {call.call_type === 'video' ? (
              <>
                <Video className="w-4 h-4" />
                Видеозвонок...
              </>
            ) : (
              <>
                <Phone className="w-4 h-4" />
                Входящий звонок...
              </>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-8 mt-8">
          <button
            onClick={onReject}
            className="p-5 rounded-full bg-destructive shadow-lg hover:bg-destructive/90 hover:scale-105 transition-all"
          >
            <PhoneOff className="w-7 h-7 text-destructive-foreground" />
          </button>
          
          <button
            onClick={onAccept}
            className={cn(
              "p-5 rounded-full shadow-lg hover:scale-105 transition-all",
              "bg-green-500 hover:bg-green-600"
            )}
          >
            <Phone className="w-7 h-7 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};
