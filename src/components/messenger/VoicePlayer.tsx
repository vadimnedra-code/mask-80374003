import { useState, useRef, useEffect, forwardRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoicePlayerProps {
  src: string;
  isOwn: boolean;
}

export const VoicePlayer = forwardRef<HTMLDivElement, VoicePlayerProps>(
  ({ src, isOwn }, ref) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
      };

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
        setProgress((audio.currentTime / audio.duration) * 100);
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      };

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);

      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
      };
    }, []);

    const togglePlay = () => {
      const audio = audioRef.current;
      if (!audio) return;

      if (isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
      setIsPlaying(!isPlaying);
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const clickPosition = (e.clientX - rect.left) / rect.width;
      const newTime = clickPosition * audio.duration;
      audio.currentTime = newTime;
    };

    const formatTime = (time: number) => {
      if (isNaN(time)) return '0:00';
      const mins = Math.floor(time / 60);
      const secs = Math.floor(time % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <div ref={ref} className="flex items-center gap-3 min-w-[200px]">
        <audio ref={audioRef} src={src} preload="metadata" />
        
        <button
          onClick={togglePlay}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors",
            isOwn 
              ? "bg-primary-foreground/20 hover:bg-primary-foreground/30" 
              : "bg-primary/20 hover:bg-primary/30"
          )}
        >
          {isPlaying ? (
            <Pause className={cn("w-5 h-5", isOwn ? "text-primary-foreground" : "text-primary")} />
          ) : (
            <Play className={cn("w-5 h-5 ml-0.5", isOwn ? "text-primary-foreground" : "text-primary")} />
          )}
        </button>
        
        <div className="flex-1 flex flex-col gap-1">
          <div 
            className={cn(
              "h-1 rounded-full cursor-pointer relative overflow-hidden",
              isOwn ? "bg-primary-foreground/30" : "bg-muted"
            )}
            onClick={handleProgressClick}
          >
            <div 
              className={cn(
                "absolute left-0 top-0 h-full rounded-full transition-all",
                isOwn ? "bg-primary-foreground" : "bg-primary"
              )}
              style={{ width: `${progress}%` }}
            />
            
            {/* Waveform visualization */}
            <div className="absolute inset-0 flex items-center justify-around px-1">
              {Array.from({ length: 20 }).map((_, i) => (
                <div 
                  key={i}
                  className={cn(
                    "w-0.5 rounded-full",
                    isOwn ? "bg-primary-foreground/40" : "bg-foreground/20"
                  )}
                  style={{ 
                    height: `${Math.random() * 80 + 20}%`,
                    opacity: progress > (i / 20) * 100 ? 0.8 : 0.3
                  }}
                />
              ))}
            </div>
          </div>
          
          <div className={cn(
            "text-[10px]",
            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>
    );
  }
);

VoicePlayer.displayName = 'VoicePlayer';