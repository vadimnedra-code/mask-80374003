import { useState, useEffect } from 'react';
import { X, Wifi, WifiOff, Mic, MicOff, Video, VideoOff, AlertTriangle, CheckCircle, RefreshCw, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DiagnosticLogEntry } from '@/hooks/useCallDiagnosticLogs';
import { toast } from 'sonner';

interface CallDiagnosticsProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerConnectionState: {
    iceConnectionState: string;
    iceGatheringState: string;
    connectionState: string;
    signalingState: string;
  } | null;
  error: string | null;
  logs?: DiagnosticLogEntry[];
  onCopyReport?: () => Promise<boolean>;
  onClose: () => void;
  onRetryMedia?: () => void;
}

export const CallDiagnostics = ({
  localStream,
  remoteStream,
  peerConnectionState,
  error,
  logs = [],
  onCopyReport,
  onClose,
  onRetryMedia,
}: CallDiagnosticsProps) => {
  const [mediaDevices, setMediaDevices] = useState<{ audio: boolean; video: boolean }>({
    audio: false,
    video: false,
  });
  const [copied, setCopied] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    // Check available media devices
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      setMediaDevices({
        audio: devices.some((d) => d.kind === 'audioinput'),
        video: devices.some((d) => d.kind === 'videoinput'),
      });
    });
  }, []);

  const handleCopyReport = async () => {
    if (onCopyReport) {
      const success = await onCopyReport();
      if (success) {
        setCopied(true);
        toast.success('Отчёт скопирован');
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast.error('Не удалось скопировать');
      }
    }
  };

  const getLocalAudioTracks = () => localStream?.getAudioTracks() || [];
  const getLocalVideoTracks = () => localStream?.getVideoTracks() || [];
  const getRemoteAudioTracks = () => remoteStream?.getAudioTracks() || [];
  const getRemoteVideoTracks = () => remoteStream?.getVideoTracks() || [];

  const getStateColor = (state: string | undefined) => {
    if (!state) return 'text-muted-foreground';
    switch (state) {
      case 'connected':
      case 'completed':
      case 'stable':
        return 'text-green-500';
      case 'checking':
      case 'new':
      case 'have-local-offer':
      case 'have-remote-offer':
        return 'text-yellow-500';
      case 'disconnected':
      case 'failed':
      case 'closed':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStateIcon = (state: string | undefined) => {
    if (!state) return <WifiOff className="w-4 h-4" />;
    switch (state) {
      case 'connected':
      case 'completed':
      case 'stable':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'checking':
      case 'new':
      case 'have-local-offer':
      case 'have-remote-offer':
        return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'disconnected':
      case 'failed':
      case 'closed':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Wifi className="w-4 h-4" />;
    }
  };

  const getLogTypeColor = (type: DiagnosticLogEntry['type']) => {
    switch (type) {
      case 'ice': return 'text-primary';
      case 'sdp': return 'text-accent-foreground';
      case 'connection': return 'text-[hsl(var(--online))]';
      case 'media': return 'text-[hsl(var(--online))]';
      case 'error': return 'text-destructive';
      case 'info': return 'text-muted-foreground';
      default: return 'text-muted-foreground';
    }
  };

  const formatTime = (date: Date) => {
    return date.toISOString().split('T')[1].split('.')[0];
  };

  return (
    <div className="absolute inset-x-4 top-16 z-50 bg-card/95 backdrop-blur-xl rounded-2xl p-4 text-foreground text-sm max-h-[70vh] overflow-y-auto border border-border shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-base">Диагностика звонка</h3>
        <div className="flex items-center gap-2">
          {onCopyReport && (
            <button
              onClick={handleCopyReport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-xs"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">Скопировано</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Скопировать отчёт</span>
                </>
              )}
            </button>
          )}
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-400">Ошибка</p>
              <p className="text-red-300 text-xs mt-1">{error}</p>
            </div>
          </div>
          {onRetryMedia && (
            <button
              onClick={onRetryMedia}
              className="mt-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-xs font-medium transition-colors"
            >
              Повторить запрос медиа
            </button>
          )}
        </div>
      )}

      {/* Connection States */}
      <div className="mb-4">
        <h4 className="text-white/60 text-xs uppercase tracking-wider mb-2">Состояние соединения</h4>
        <div className="space-y-2 bg-white/5 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="text-white/70">ICE Connection</span>
            <div className="flex items-center gap-2">
              {getStateIcon(peerConnectionState?.iceConnectionState)}
              <span className={cn('font-mono text-xs', getStateColor(peerConnectionState?.iceConnectionState))}>
                {peerConnectionState?.iceConnectionState || 'N/A'}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/70">ICE Gathering</span>
            <div className="flex items-center gap-2">
              {getStateIcon(peerConnectionState?.iceGatheringState)}
              <span className={cn('font-mono text-xs', getStateColor(peerConnectionState?.iceGatheringState))}>
                {peerConnectionState?.iceGatheringState || 'N/A'}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/70">Connection</span>
            <div className="flex items-center gap-2">
              {getStateIcon(peerConnectionState?.connectionState)}
              <span className={cn('font-mono text-xs', getStateColor(peerConnectionState?.connectionState))}>
                {peerConnectionState?.connectionState || 'N/A'}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/70">Signaling</span>
            <div className="flex items-center gap-2">
              {getStateIcon(peerConnectionState?.signalingState)}
              <span className={cn('font-mono text-xs', getStateColor(peerConnectionState?.signalingState))}>
                {peerConnectionState?.signalingState || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Event Logs - Collapsible */}
      <div className="mb-4">
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="flex items-center justify-between w-full text-white/60 text-xs uppercase tracking-wider mb-2 hover:text-white/80 transition-colors"
        >
          <span>Журнал событий ({logs.length})</span>
          {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {showLogs && (
          <div className="bg-white/5 rounded-xl p-3 max-h-48 overflow-y-auto font-mono text-xs space-y-1">
            {logs.length === 0 ? (
              <p className="text-white/40">Нет событий</p>
            ) : (
              logs.slice().reverse().map((log, index) => (
                <div key={index} className="flex flex-col">
                  <div className="flex items-start gap-2">
                    <span className="text-white/40 flex-shrink-0">{formatTime(log.timestamp)}</span>
                    <span className={cn('flex-shrink-0 uppercase', getLogTypeColor(log.type))}>
                      [{log.type.padEnd(6)}]
                    </span>
                    <span className="text-white/80 break-all">{log.event}</span>
                  </div>
                  {log.details && (
                    <span className="ml-[88px] text-white/50 break-all">└─ {log.details}</span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Available Devices */}
      <div className="mb-4">
        <h4 className="text-white/60 text-xs uppercase tracking-wider mb-2">Доступные устройства</h4>
        <div className="flex gap-3 bg-white/5 rounded-xl p-3">
          <div className="flex items-center gap-2">
            {mediaDevices.audio ? (
              <Mic className="w-4 h-4 text-green-500" />
            ) : (
              <MicOff className="w-4 h-4 text-red-500" />
            )}
            <span className={mediaDevices.audio ? 'text-green-400' : 'text-red-400'}>
              Микрофон {mediaDevices.audio ? '✓' : '✗'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {mediaDevices.video ? (
              <Video className="w-4 h-4 text-green-500" />
            ) : (
              <VideoOff className="w-4 h-4 text-red-500" />
            )}
            <span className={mediaDevices.video ? 'text-green-400' : 'text-red-400'}>
              Камера {mediaDevices.video ? '✓' : '✗'}
            </span>
          </div>
        </div>
      </div>

      {/* Local Tracks */}
      <div className="mb-4">
        <h4 className="text-white/60 text-xs uppercase tracking-wider mb-2">Локальные треки</h4>
        <div className="bg-white/5 rounded-xl p-3 space-y-2">
          {getLocalAudioTracks().length > 0 ? (
            getLocalAudioTracks().map((track, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-green-500" />
                  <span>Аудио {i + 1}</span>
                </div>
                <span className={cn('text-xs', track.enabled ? 'text-green-400' : 'text-red-400')}>
                  {track.enabled ? 'Активен' : 'Отключён'}
                </span>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-2 text-white/50">
              <MicOff className="w-4 h-4" />
              <span>Нет аудио трека</span>
            </div>
          )}
          {getLocalVideoTracks().length > 0 ? (
            getLocalVideoTracks().map((track, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-green-500" />
                  <span>Видео {i + 1}</span>
                </div>
                <span className={cn('text-xs', track.enabled ? 'text-green-400' : 'text-red-400')}>
                  {track.enabled ? 'Активен' : 'Отключён'}
                </span>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-2 text-white/50">
              <VideoOff className="w-4 h-4" />
              <span>Нет видео трека</span>
            </div>
          )}
        </div>
      </div>

      {/* Remote Tracks */}
      <div className="mb-4">
        <h4 className="text-white/60 text-xs uppercase tracking-wider mb-2">Удалённые треки</h4>
        <div className="bg-white/5 rounded-xl p-3 space-y-2">
          {getRemoteAudioTracks().length > 0 ? (
            getRemoteAudioTracks().map((track, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-green-500" />
                  <span>Аудио {i + 1}</span>
                </div>
                <span className={cn('text-xs', track.enabled ? 'text-green-400' : 'text-red-400')}>
                  {track.enabled ? 'Активен' : 'Отключён'}
                </span>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-2 text-white/50">
              <MicOff className="w-4 h-4" />
              <span>Нет аудио трека</span>
            </div>
          )}
          {getRemoteVideoTracks().length > 0 ? (
            getRemoteVideoTracks().map((track, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-green-500" />
                  <span>Видео {i + 1}</span>
                </div>
                <span className={cn('text-xs', track.enabled ? 'text-green-400' : 'text-red-400')}>
                  {track.enabled ? 'Активен' : 'Отключён'}
                </span>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-2 text-white/50">
              <VideoOff className="w-4 h-4" />
              <span>Нет видео трека</span>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="text-white/40 text-xs">
        <p>• <span className="text-green-400">Зелёный</span> — успешно</p>
        <p>• <span className="text-yellow-400">Жёлтый</span> — в процессе</p>
        <p>• <span className="text-red-400">Красный</span> — ошибка/отключено</p>
      </div>
    </div>
  );
};