import { useState, useEffect, useRef, useCallback } from 'react';

interface UseAppLifecycleOptions {
  /** Minimum active time in milliseconds before auto-close is allowed (default: 10 minutes) */
  minActiveTime?: number;
  /** Idle timeout in milliseconds before showing warning (default: 9 minutes) */
  idleWarningTime?: number;
  /** Additional idle time after warning before auto-close (default: 1 minute) */
  idleCloseTime?: number;
  /** Whether to use Wake Lock API to keep screen on */
  keepScreenOn?: boolean;
  /** Callback when app is about to close due to inactivity */
  onIdleWarning?: () => void;
  /** Callback when app closes due to inactivity */
  onIdleClose?: () => void;
}

interface AppLifecycleState {
  isActive: boolean;
  isIdle: boolean;
  showIdleWarning: boolean;
  sessionDuration: number;
  lastActivityTime: number;
  wakeLockActive: boolean;
}

/**
 * Hook to manage app lifecycle:
 * - Keeps app open for minimum 10 minutes
 * - Tracks user activity
 * - Uses Wake Lock to prevent screen sleep
 * - Only allows auto-close after inactivity period
 */
export const useAppLifecycle = (options: UseAppLifecycleOptions = {}) => {
  const {
    minActiveTime = 10 * 60 * 1000, // 10 minutes
    idleWarningTime = 9 * 60 * 1000, // 9 minutes idle
    idleCloseTime = 1 * 60 * 1000, // 1 minute after warning
    keepScreenOn = true,
    onIdleWarning,
    onIdleClose,
  } = options;

  const [state, setState] = useState<AppLifecycleState>({
    isActive: true,
    isIdle: false,
    showIdleWarning: false,
    sessionDuration: 0,
    lastActivityTime: Date.now(),
    wakeLockActive: false,
  });

  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const sessionStartRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Request wake lock to keep screen on
  const requestWakeLock = useCallback(async () => {
    if (!keepScreenOn || !('wakeLock' in navigator)) {
      console.log('[AppLifecycle] Wake Lock API not supported');
      return;
    }

    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      setState(prev => ({ ...prev, wakeLockActive: true }));
      console.log('[AppLifecycle] Wake Lock acquired');

      wakeLockRef.current.addEventListener('release', () => {
        console.log('[AppLifecycle] Wake Lock released');
        setState(prev => ({ ...prev, wakeLockActive: false }));
      });
    } catch (err) {
      console.log('[AppLifecycle] Wake Lock request failed:', err);
    }
  }, [keepScreenOn]);

  // Release wake lock
  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        console.log('[AppLifecycle] Wake Lock release failed:', err);
      }
    }
  }, []);

  // Reset activity timer
  const resetActivityTimer = useCallback(() => {
    const now = Date.now();
    setState(prev => ({
      ...prev,
      lastActivityTime: now,
      isIdle: false,
      showIdleWarning: false,
    }));

    // Clear existing timers
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }

    // Set new idle warning timer
    idleTimerRef.current = setTimeout(() => {
      const sessionDuration = Date.now() - sessionStartRef.current;
      
      // Only show warning if minimum session time has passed
      if (sessionDuration >= minActiveTime) {
        setState(prev => ({ ...prev, isIdle: true, showIdleWarning: true }));
        onIdleWarning?.();
        
        // Set close timer
        closeTimerRef.current = setTimeout(() => {
          onIdleClose?.();
        }, idleCloseTime);
      }
    }, idleWarningTime);
  }, [minActiveTime, idleWarningTime, idleCloseTime, onIdleWarning, onIdleClose]);

  // Handle user activity
  const handleActivity = useCallback(() => {
    resetActivityTimer();
  }, [resetActivityTimer]);

  // Dismiss idle warning and stay active
  const dismissIdleWarning = useCallback(() => {
    setState(prev => ({ ...prev, showIdleWarning: false, isIdle: false }));
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    resetActivityTimer();
  }, [resetActivityTimer]);

  // Keep app active (extend session)
  const keepActive = useCallback(() => {
    dismissIdleWarning();
    // Re-acquire wake lock if lost
    if (!state.wakeLockActive && keepScreenOn) {
      requestWakeLock();
    }
  }, [dismissIdleWarning, state.wakeLockActive, keepScreenOn, requestWakeLock]);

  // Initialize lifecycle management
  useEffect(() => {
    // Request wake lock on mount
    const initWakeLock = async () => {
      if (!keepScreenOn || !('wakeLock' in navigator)) {
        return;
      }

      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setState(prev => ({ ...prev, wakeLockActive: true }));
        console.log('[AppLifecycle] Wake Lock acquired');

        wakeLockRef.current.addEventListener('release', () => {
          console.log('[AppLifecycle] Wake Lock released');
          setState(prev => ({ ...prev, wakeLockActive: false }));
        });
      } catch (err) {
        console.log('[AppLifecycle] Wake Lock request failed:', err);
      }
    };

    initWakeLock();

    // Track session duration
    durationIntervalRef.current = setInterval(() => {
      setState(prev => ({
        ...prev,
        sessionDuration: Date.now() - sessionStartRef.current,
      }));
    }, 1000);

    // Set initial activity timer
    const now = Date.now();
    setState(prev => ({
      ...prev,
      lastActivityTime: now,
      isIdle: false,
      showIdleWarning: false,
    }));

    idleTimerRef.current = setTimeout(() => {
      const sessionDuration = Date.now() - sessionStartRef.current;
      
      if (sessionDuration >= minActiveTime) {
        setState(prev => ({ ...prev, isIdle: true, showIdleWarning: true }));
        onIdleWarning?.();
        
        closeTimerRef.current = setTimeout(() => {
          onIdleClose?.();
        }, idleCloseTime);
      }
    }, idleWarningTime);

    // Activity event listeners
    const handleActivityEvent = () => {
      const now = Date.now();
      setState(prev => ({
        ...prev,
        lastActivityTime: now,
        isIdle: false,
        showIdleWarning: false,
      }));

      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }

      idleTimerRef.current = setTimeout(() => {
        const sessionDuration = Date.now() - sessionStartRef.current;
        
        if (sessionDuration >= minActiveTime) {
          setState(prev => ({ ...prev, isIdle: true, showIdleWarning: true }));
          onIdleWarning?.();
          
          closeTimerRef.current = setTimeout(() => {
            onIdleClose?.();
          }, idleCloseTime);
        }
      }, idleWarningTime);
    };

    const activityEvents = [
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivityEvent, { passive: true });
    });

    // Handle visibility change - re-acquire wake lock when visible
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        if (keepScreenOn && 'wakeLock' in navigator && !wakeLockRef.current) {
          try {
            wakeLockRef.current = await navigator.wakeLock.request('screen');
            setState(prev => ({ ...prev, wakeLockActive: true }));
          } catch (err) {
            // Ignore
          }
        }
        handleActivityEvent();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // Cleanup
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivityEvent);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...state,
    keepActive,
    dismissIdleWarning,
    requestWakeLock,
    releaseWakeLock,
  };
};
