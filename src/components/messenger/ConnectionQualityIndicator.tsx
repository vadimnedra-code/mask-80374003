import React from 'react';
import { Wifi, WifiOff, Signal, SignalLow, SignalMedium, SignalHigh } from 'lucide-react';
import { ConnectionStats } from '@/hooks/useConnectionStats';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ConnectionQualityIndicatorProps {
  stats: ConnectionStats;
}

export const ConnectionQualityIndicator: React.FC<ConnectionQualityIndicatorProps> = ({ stats }) => {
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

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-sm ${getQualityColor()}`}>
            {getQualityIcon()}
            <span className="text-xs font-medium text-white/90">
              {stats.latency !== null ? `${stats.latency}ms` : '...'}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-background/95 backdrop-blur-sm border-border">
          <div className="space-y-2 p-1">
            <div className="flex items-center gap-2">
              {getQualityIcon()}
              <span className="font-medium">{getQualityLabel()}</span>
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
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
