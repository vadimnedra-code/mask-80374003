import { useState, useRef, useCallback } from 'react';
import { Reply } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableMessageProps {
  children: React.ReactNode;
  onSwipeReply?: () => void;
  isOwn: boolean;
}

export const SwipeableMessage = ({ children, onSwipeReply, isOwn }: SwipeableMessageProps) => {
  const [offsetX, setOffsetX] = useState(0);
  const [showReplyIndicator, setShowReplyIndicator] = useState(false);
  const startX = useRef<number>(0);
  const startY = useRef<number>(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const hasTriggered = useRef(false);

  const threshold = 60;
  const maxSwipe = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = null;
    hasTriggered.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const diffX = touchX - startX.current;
    const diffY = touchY - startY.current;
    
    // Determine direction on first significant movement
    if (isHorizontalSwipe.current === null && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
      isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
    }
    
    if (!isHorizontalSwipe.current) return;
    
    // Swipe right to reply (positive diffX)
    if (diffX > 0) {
      const clampedOffset = Math.min(diffX, maxSwipe);
      setOffsetX(clampedOffset);
      
      if (clampedOffset >= threshold && !hasTriggered.current) {
        setShowReplyIndicator(true);
        hasTriggered.current = true;
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }
      } else if (clampedOffset < threshold) {
        setShowReplyIndicator(false);
        hasTriggered.current = false;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (offsetX >= threshold && onSwipeReply) {
      onSwipeReply();
    }
    
    setOffsetX(0);
    setShowReplyIndicator(false);
    isHorizontalSwipe.current = null;
    hasTriggered.current = false;
  }, [offsetX, onSwipeReply]);

  return (
    <div className="relative overflow-visible">
      {/* Reply indicator */}
      <div
        className={cn(
          'absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full transition-all duration-200',
          showReplyIndicator ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        )}
        style={{
          transform: `translateY(-50%) translateX(${Math.min(offsetX * 0.3, 20) - 40}px)`,
        }}
      >
        <div className="p-2 rounded-full bg-primary text-primary-foreground shadow-glow">
          <Reply className="w-4 h-4" />
        </div>
      </div>
      
      {/* Message content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: offsetX === 0 ? 'transform 0.2s ease-out' : 'none',
        }}
        className="touch-pan-y"
      >
        {children}
      </div>
    </div>
  );
};
