import React, { useState } from 'react';
import { Wifi, WifiOff, Signal, SignalLow, SignalMedium, SignalHigh, Settings, ChevronDown, Shield, Globe, Router } from 'lucide-react';
import { ConnectionStats, VideoQuality, ConnectionType } from '@/hooks/useConnectionStats';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ConnectionQualityIndicatorProps {
  stats: ConnectionStats;
  onQualityChange?: (quality: VideoQuality) => void;
  isVideoCall?: boolean;
}

const QUALITY_OPTIONS: { value: VideoQuality; label: string; description: string }[] = [
  { value: 'auto', label: 'Авто', description: 'Автоматический выбор' },
  { value: 'high', label: 'Высокое', description: '720p / 30fps' },
  { value: 'medium', label: 'Среднее', description: '480p / 24fps' },
  { value: 'low', label: 'Низкое', description: '240p / 15fps' },
];

export const ConnectionQualityIndicator: React.FC<ConnectionQualityIndicatorProps> = ({ 
  stats, 
  onQualityChange,
  isVideoCall = false
}) => {
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  const getQualityIcon = () => {
    switch (stats.quality) {
      case 'excellent':
        return <SignalHigh className="w-5 h-5 text-green-400" />;
      case 'good':
        return <SignalMedium className="w-5 h-5 text-green-400" />;
      case 'fair':
        return <SignalLow className="w-5 h-5 text-yellow-400" />;
      case 'poor':
        return <WifiOff className="w-5 h-5 text-red-400" />;
      default:
        return <Wifi className="w-5 h-5 text-muted-foreground animate-pulse" />;
    }
  };

  const getQualityColor = () => {
    switch (stats.quality) {
      case 'excellent':
        return 'bg-green-500/20 border-green-500/30';
      case 'good':
        return 'bg-green-500/20 border-green-500/30';
      case 'fair':
        return 'bg-yellow-500/20 border-yellow-500/30';
      case 'poor':
        return 'bg-red-500/20 border-red-500/30';
      default:
        return 'bg-muted/20 border-muted/30';
    }
  };

  const getQualityLabel = () => {
    switch (stats.quality) {
      case 'excellent':
        return 'Отличное';
      case 'good':
        return 'Хорошее';
      case 'fair':
        return 'Среднее';
      case 'poor':
        return 'Плохое';
      default:
        return 'Измерение...';
    }
  };

  const getVideoQualityLabel = (quality: VideoQuality) => {
    return QUALITY_OPTIONS.find(q => q.value === quality)?.label || 'Авто';
  };

  const formatResolution = () => {
    if (stats.videoStats.width && stats.videoStats.height) {
      return `${stats.videoStats.width}×${stats.videoStats.height}`;
    }
    return '—';
  };

  const getConnectionTypeInfo = () => {
    switch (stats.connectionType) {
      case 'relay':
        return { 
          label: 'TURN', 
          description: stats.relayProtocol ? `Relay (${stats.relayProtocol.toUpperCase()})` : 'Relay',
          icon: <Shield className="w-3.5 h-3.5" />,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/20 border-blue-500/30',
        };
      case 'srflx':
        return { 
          label: 'STUN', 
          description: 'Server Reflexive',
          icon: <Globe className="w-3.5 h-3.5" />,
          color: 'text-cyan-400',
          bgColor: 'bg-cyan-500/20 border-cyan-500/30',
        };
      case 'prflx':
        return { 
          label: 'P2P', 
          description: 'Peer Reflexive',
          icon: <Router className="w-3.5 h-3.5" />,
          color: 'text-green-400',
          bgColor: 'bg-green-500/20 border-green-500/30',
        };
      case 'host':
        return { 
          label: 'Direct', 
          description: 'Прямое соединение',
          icon: <Router className="w-3.5 h-3.5" />,
          color: 'text-green-400',
          bgColor: 'bg-green-500/20 border-green-500/30',
        };
      default:
        return { 
          label: '...', 
          description: 'Определение...',
          icon: <Wifi className="w-3.5 h-3.5 animate-pulse" />,
          color: 'text-white/50',
          bgColor: 'bg-white/10 border-white/20',
        };
    }
  };

  const connTypeInfo = getConnectionTypeInfo();

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-sm ${getQualityColor()}`}>
              {getQualityIcon()}
              <span className="text-xs font-medium text-white/90">
                {stats.latency !== null ? `${stats.latency}ms` : '...'}
              </span>
              {/* Connection type badge */}
              <span className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded-full border",
                connTypeInfo.bgColor, connTypeInfo.color
              )}>
                {connTypeInfo.label}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-background/95 backdrop-blur-sm border-border max-w-xs">
            <div className="space-y-2 p-1">
              <div className="flex items-center gap-2">
                {getQualityIcon()}
                <span className="font-medium">{getQualityLabel()}</span>
              </div>
              
              {/* Connection type info */}
              <div className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-lg border text-sm",
                connTypeInfo.bgColor
              )}>
                <span className={connTypeInfo.color}>{connTypeInfo.icon}</span>
                <div>
                  <span className={cn("font-medium", connTypeInfo.color)}>{connTypeInfo.label}</span>
                  <span className="text-muted-foreground ml-1.5">— {connTypeInfo.description}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-muted-foreground">Задержка:</span>
                <span className="font-mono">
                  {stats.latency !== null ? `${stats.latency} мс` : '—'}
                </span>
                
                <span className="text-muted-foreground">Потери:</span>
                <span className="font-mono">
                  {stats.packetLoss !== null ? `${stats.packetLoss}%` : '—'}
                </span>
                
                <span className="text-muted-foreground">Джиттер:</span>
                <span className="font-mono">
                  {stats.jitter !== null ? `${stats.jitter} мс` : '—'}
                </span>
                
                <span className="text-muted-foreground">Битрейт:</span>
                <span className="font-mono">
                  {stats.bitrate !== null ? `${stats.bitrate} кбит/с` : '—'}
                </span>

                <span className="text-muted-foreground">Маршрут:</span>
                <span className="font-mono text-xs">
                  {stats.localCandidateType ?? '?'} → {stats.remoteCandidateType ?? '?'}
                </span>

                {stats.relayProtocol && (
                  <>
                    <span className="text-muted-foreground">Relay протокол:</span>
                    <span className="font-mono">{stats.relayProtocol.toUpperCase()}</span>
                  </>
                )}

                {isVideoCall && (
                  <>
                    <span className="text-muted-foreground">Разрешение:</span>
                    <span className="font-mono">{formatResolution()}</span>
                    
                    <span className="text-muted-foreground">FPS:</span>
                    <span className="font-mono">
                      {stats.videoStats.frameRate !== null ? stats.videoStats.frameRate : '—'}
                    </span>
                    
                    <span className="text-muted-foreground">Видео битрейт:</span>
                    <span className="font-mono">
                      {stats.videoStats.bitrate !== null ? `${stats.videoStats.bitrate} кбит/с` : '—'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Video Quality Selector */}
        {isVideoCall && onQualityChange && (
          <DropdownMenu open={showQualityMenu} onOpenChange={setShowQualityMenu}>
            <DropdownMenuTrigger asChild>
              <button 
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-full border backdrop-blur-sm transition-colors",
                  "bg-white/10 border-white/20 hover:bg-white/20"
                )}
              >
                <Settings className="w-4 h-4 text-white/80" />
                <span className="text-xs font-medium text-white/90">
                  {getVideoQualityLabel(stats.currentVideoQuality)}
                </span>
                <ChevronDown className="w-3 h-3 text-white/60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-background/95 backdrop-blur-sm">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Качество видео
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {QUALITY_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => onQualityChange(option.value)}
                  className={cn(
                    "flex flex-col items-start gap-0.5 cursor-pointer",
                    stats.currentVideoQuality === option.value && "bg-accent"
                  )}
                >
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                </DropdownMenuItem>
              ))}
              {stats.quality === 'poor' && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-xs text-yellow-500">
                    ⚠️ Низкое качество соединения. Рекомендуется снизить качество видео.
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </TooltipProvider>
  );
};
