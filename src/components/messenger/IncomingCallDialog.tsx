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
  const isVideoCall = call.call_type === 'video';
  
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#0b141a] animate-fade-in">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b141a] via-[#1f2c34] to-[#0b141a]" />
      
      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        {/* Avatar with animation */}
        <div className="relative mb-8">
          <Avatar
            src={call.caller_avatar || ''}
            alt={call.caller_name || 'Caller'}
            size="xl"
            className="w-32 h-32 ring-4 ring-[#00a884]/20"
          />
          {/* Pulsing rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-36 h-36 border-4 border-[#00a884]/20 rounded-full animate-ping" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 border-2 border-[#00a884]/10 rounded-full animate-pulse" />
          </div>
        </div>
        
        {/* Caller info */}
        <h2 className="text-2xl font-medium text-white">{call.caller_name}</h2>
        <p className="mt-3 text-white/60 flex items-center gap-2">
          {isVideoCall ? (
            <>
              <Video className="w-4 h-4" />
              Видеозвонок WhatsApp
            </>
          ) : (
            <>
              <Phone className="w-4 h-4" />
              Звонок WhatsApp
            </>
          )}
        </p>
      </div>

      {/* Action Buttons - WhatsApp style */}
      <div className="relative z-10 pb-12 pt-6">
        <div className="flex items-center justify-center gap-20">
          {/* Decline */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onReject}
              className="flex items-center justify-center w-16 h-16 rounded-full bg-[#f15c6d] shadow-lg hover:bg-[#e04b5c] hover:scale-105 transition-all"
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </button>
            <span className="text-white/70 text-sm">Отклонить</span>
          </div>
          
          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onAccept}
              className="flex items-center justify-center w-16 h-16 rounded-full bg-[#00a884] shadow-lg hover:bg-[#00997a] hover:scale-105 transition-all"
            >
              {isVideoCall ? (
                <Video className="w-7 h-7 text-white" />
              ) : (
                <Phone className="w-7 h-7 text-white" />
              )}
            </button>
            <span className="text-white/70 text-sm">Принять</span>
          </div>
        </div>
      </div>
    </div>
  );
};
