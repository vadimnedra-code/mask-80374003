import { useRef, useState, useCallback } from 'react';

interface SwipeGestureOptions {
  threshold?: number;
  maxSwipe?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

interface SwipeState {
  offsetX: number;
  isSwiping: boolean;
  direction: 'left' | 'right' | null;
}

export const useSwipeGesture = ({
  threshold = 50,
  maxSwipe = 80,
  onSwipeLeft,
  onSwipeRight,
}: SwipeGestureOptions = {}) => {
  const [state, setState] = useState<SwipeState>({
    offsetX: 0,
    isSwiping: false,
    direction: null,
  });
  
  const startX = useRef<number>(0);
  const startY = useRef<number>(0);
  const currentX = useRef<number>(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = e.touches[0].clientX;
    isHorizontalSwipe.current = null;
    setState(prev => ({ ...prev, isSwiping: true }));
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const diffX = touchX - startX.current;
    const diffY = touchY - startY.current;
    
    // Determine if this is a horizontal swipe on first significant movement
    if (isHorizontalSwipe.current === null && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
      isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
    }
    
    // Only handle horizontal swipes
    if (!isHorizontalSwipe.current) return;
    
    e.preventDefault();
    currentX.current = touchX;
    
    // Clamp the offset
    const clampedOffset = Math.max(-maxSwipe, Math.min(maxSwipe, diffX));
    
    setState({
      offsetX: clampedOffset,
      isSwiping: true,
      direction: clampedOffset < -threshold ? 'left' : clampedOffset > threshold ? 'right' : null,
    });
  }, [maxSwipe, threshold]);

  const handleTouchEnd = useCallback(() => {
    const diffX = currentX.current - startX.current;
    
    if (diffX < -threshold && onSwipeLeft) {
      onSwipeLeft();
    } else if (diffX > threshold && onSwipeRight) {
      onSwipeRight();
    }
    
    setState({
      offsetX: 0,
      isSwiping: false,
      direction: null,
    });
    isHorizontalSwipe.current = null;
  }, [threshold, onSwipeLeft, onSwipeRight]);

  const resetSwipe = useCallback(() => {
    setState({
      offsetX: 0,
      isSwiping: false,
      direction: null,
    });
  }, []);

  return {
    ...state,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    resetSwipe,
  };
};
