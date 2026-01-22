import { useRef, useState, useCallback } from 'react';

interface SwipeGestureOptions {
  threshold?: number;
  maxSwipe?: number;
  edgeWidth?: number; // Only trigger swipe if started within this distance from left edge
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
  edgeWidth = 30, // Default: only start swipe from left 30px
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
  const isEdgeSwipe = useRef<boolean>(false);

  // Tuning knobs to avoid false positives that block vertical scrolling.
  // We only want to capture a very intentional swipe-back gesture.
  const DECISION_DEADZONE_PX = 16; // don't decide direction until user moves at least this much
  const HORIZONTAL_BIAS = 2.2; // require substantially more horizontal than vertical movement
  const ACTIVATE_PREVENT_DEFAULT_PX = 18; // only prevent default once swipe is clearly intentional

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touchX = e.touches[0].clientX;
    startX.current = touchX;
    startY.current = e.touches[0].clientY;
    currentX.current = touchX;
    isHorizontalSwipe.current = null;
    // Only allow swipe-back if touch started near the left edge
    isEdgeSwipe.current = touchX <= edgeWidth;

    // Do not mark as swiping yet — wait until we confirm it's a horizontal swipe.
    if (isEdgeSwipe.current) {
      setState({ offsetX: 0, isSwiping: false, direction: null });
    }
  }, [edgeWidth]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // If not started from edge, don't interfere at all
    if (!isEdgeSwipe.current) return;
    
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const diffX = touchX - startX.current;
    const diffY = touchY - startY.current;

    // Determine if this is a horizontal swipe on first significant movement.
    // Use a larger deadzone + stronger horizontal bias to prevent accidental activation
    // while the user is just trying to scroll.
    if (
      isHorizontalSwipe.current === null &&
      (Math.abs(diffX) > DECISION_DEADZONE_PX || Math.abs(diffY) > DECISION_DEADZONE_PX)
    ) {
      // Only allow swipe-back to the right.
      if (diffX <= 0) {
        isHorizontalSwipe.current = false;
      } else {
        isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY) * HORIZONTAL_BIAS;
      }
    }
    
    // If vertical scroll detected, cancel swipe mode entirely
    if (isHorizontalSwipe.current === false) {
      isEdgeSwipe.current = false;
      setState({ offsetX: 0, isSwiping: false, direction: null });
      return;
    }
    
    // Only handle horizontal swipes from edge
    if (!isHorizontalSwipe.current) return;

    // Prevent default only once the gesture is clearly a swipe-back,
    // otherwise iOS/Android WebViews can lose native scroll.
    if (diffX > ACTIVATE_PREVENT_DEFAULT_PX && e.cancelable) {
      e.preventDefault();
    }
    currentX.current = touchX;
    
    // Only allow swipe right (positive diffX) for back gesture
    const clampedOffset = Math.max(0, Math.min(maxSwipe, diffX));
    
    setState({
      offsetX: clampedOffset,
      isSwiping: clampedOffset > 0,
      direction: clampedOffset > threshold ? 'right' : null,
    });
  }, [maxSwipe, threshold]);

  const handleTouchEnd = useCallback(() => {
    if (!isEdgeSwipe.current) {
      return;
    }
    
    const diffX = currentX.current - startX.current;
    
    if (diffX > threshold && onSwipeRight) {
      onSwipeRight();
    } else if (diffX < -threshold && onSwipeLeft) {
      onSwipeLeft();
    }
    
    setState({
      offsetX: 0,
      isSwiping: false,
      direction: null,
    });
    isHorizontalSwipe.current = null;
    isEdgeSwipe.current = false;
  }, [threshold, onSwipeLeft, onSwipeRight]);

  const resetSwipe = useCallback(() => {
    setState({
      offsetX: 0,
      isSwiping: false,
      direction: null,
    });
    isEdgeSwipe.current = false;
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
