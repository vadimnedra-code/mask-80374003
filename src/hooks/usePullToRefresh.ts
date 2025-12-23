import { useRef, useState, useCallback, useEffect } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
}

interface PullState {
  pullDistance: number;
  isPulling: boolean;
  isRefreshing: boolean;
  canRefresh: boolean;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  maxPull = 120,
}: PullToRefreshOptions) => {
  const [state, setState] = useState<PullState>({
    pullDistance: 0,
    isPulling: false,
    isRefreshing: false,
    canRefresh: false,
  });
  
  const startY = useRef<number>(0);
  const scrollTop = useRef<number>(0);
  const containerRef = useRef<HTMLElement | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (state.isRefreshing) return;
    
    const container = e.currentTarget as HTMLElement;
    containerRef.current = container;
    scrollTop.current = container.scrollTop;
    
    // Only enable pull to refresh when scrolled to top
    if (scrollTop.current <= 0) {
      startY.current = e.touches[0].clientY;
      setState(prev => ({ ...prev, isPulling: true }));
    }
  }, [state.isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!state.isPulling || state.isRefreshing) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      setState(prev => ({ ...prev, isPulling: false, pullDistance: 0 }));
      return;
    }
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0) {
      // Apply resistance to the pull
      const resistance = 0.5;
      const pullDistance = Math.min(diff * resistance, maxPull);
      
      setState(prev => ({
        ...prev,
        pullDistance,
        canRefresh: pullDistance >= threshold,
      }));
    }
  }, [state.isPulling, state.isRefreshing, maxPull, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (state.isRefreshing) return;
    
    if (state.canRefresh) {
      setState(prev => ({ ...prev, isRefreshing: true, pullDistance: threshold }));
      
      try {
        await onRefresh();
      } finally {
        setState({
          pullDistance: 0,
          isPulling: false,
          isRefreshing: false,
          canRefresh: false,
        });
      }
    } else {
      setState({
        pullDistance: 0,
        isPulling: false,
        isRefreshing: false,
        canRefresh: false,
      });
    }
  }, [state.isRefreshing, state.canRefresh, onRefresh, threshold]);

  return {
    ...state,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
};
