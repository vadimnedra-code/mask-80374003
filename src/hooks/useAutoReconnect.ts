import { useRef, useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReconnectionState {
  isReconnecting: boolean;
  reconnectAttempt: number;
  maxAttempts: number;
  lastDisconnectedAt: Date | null;
}

interface UseAutoReconnectOptions {
  maxAttempts?: number;
  baseDelay?: number; // ms
  maxDelay?: number; // ms
  onReconnecting?: (attempt: number) => void;
  onReconnected?: () => void;
  onReconnectFailed?: () => void;
}

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_BASE_DELAY = 1000; // 1 second
const DEFAULT_MAX_DELAY = 10000; // 10 seconds

export const useAutoReconnect = (
  peerConnection: RTCPeerConnection | null,
  callId: string | null,
  callStatus: string,
  options: UseAutoReconnectOptions = {}
) => {
  const {
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    baseDelay = DEFAULT_BASE_DELAY,
    maxDelay = DEFAULT_MAX_DELAY,
    onReconnecting,
    onReconnected,
    onReconnectFailed,
  } = options;

  const [reconnectionState, setReconnectionState] = useState<ReconnectionState>({
    isReconnecting: false,
    reconnectAttempt: 0,
    maxAttempts,
    lastDisconnectedAt: null,
  });

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef(0);
  const wasConnectedRef = useRef(false);
  const isReconnectingRef = useRef(false);

  // Calculate exponential backoff delay
  const getReconnectDelay = useCallback((attempt: number): number => {
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    // Add jitter (±20%)
    const jitter = delay * 0.2 * (Math.random() * 2 - 1);
    return Math.floor(delay + jitter);
  }, [baseDelay, maxDelay]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, []);

  // Attempt ICE restart
  const attemptReconnect = useCallback(async () => {
    if (!peerConnection || !callId || isReconnectingRef.current) {
      return false;
    }

    const currentAttempt = reconnectAttemptRef.current;
    
    if (currentAttempt >= maxAttempts) {
      console.log('[AutoReconnect] Max reconnect attempts reached');
      setReconnectionState(prev => ({
        ...prev,
        isReconnecting: false,
      }));
      isReconnectingRef.current = false;
      onReconnectFailed?.();
      return false;
    }

    console.log(`[AutoReconnect] Attempt ${currentAttempt + 1}/${maxAttempts}`);
    
    isReconnectingRef.current = true;
    reconnectAttemptRef.current = currentAttempt + 1;
    
    setReconnectionState({
      isReconnecting: true,
      reconnectAttempt: currentAttempt + 1,
      maxAttempts,
      lastDisconnectedAt: reconnectionState.lastDisconnectedAt || new Date(),
    });

    onReconnecting?.(currentAttempt + 1);

    try {
      // Try ICE restart first
      peerConnection.restartIce();
      console.log('[AutoReconnect] ICE restart initiated');

      // Create new offer with ICE restart
      const offer = await peerConnection.createOffer({ iceRestart: true });
      await peerConnection.setLocalDescription(offer);
      
      console.log('[AutoReconnect] New offer created with ICE restart');

      // Update call with new offer
      const { error } = await supabase
        .from('calls')
        .update({
          offer: JSON.parse(JSON.stringify(offer)),
        })
        .eq('id', callId);

      if (error) {
        console.error('[AutoReconnect] Failed to update offer:', error);
        throw error;
      }

      return true;
    } catch (err) {
      console.error('[AutoReconnect] Reconnection attempt failed:', err);
      
      // Schedule next attempt
      const delay = getReconnectDelay(currentAttempt + 1);
      console.log(`[AutoReconnect] Scheduling next attempt in ${delay}ms`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        attemptReconnect();
      }, delay);

      return false;
    }
  }, [peerConnection, callId, maxAttempts, reconnectionState.lastDisconnectedAt, onReconnecting, onReconnectFailed, getReconnectDelay]);

  // Handle connection state changes
  const handleConnectionStateChange = useCallback((state: RTCIceConnectionState) => {
    console.log('[AutoReconnect] ICE connection state:', state);

    // Track if we were ever connected
    if (state === 'connected' || state === 'completed') {
      wasConnectedRef.current = true;
      
      if (isReconnectingRef.current) {
        console.log('[AutoReconnect] Reconnection successful!');
        isReconnectingRef.current = false;
        reconnectAttemptRef.current = 0;
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        
        setReconnectionState({
          isReconnecting: false,
          reconnectAttempt: 0,
          maxAttempts,
          lastDisconnectedAt: null,
        });
        
        onReconnected?.();
      }
      return;
    }

    // Only try to reconnect if we were connected before and call is active
    if (!wasConnectedRef.current || callStatus !== 'active') {
      return;
    }

    if (state === 'disconnected') {
      console.log('[AutoReconnect] Connection disconnected, waiting before reconnect...');
      
      setReconnectionState(prev => ({
        ...prev,
        lastDisconnectedAt: new Date(),
      }));

      // Wait a bit before attempting reconnect (might recover on its own)
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      reconnectTimeoutRef.current = setTimeout(() => {
        // Check if still disconnected
        if (peerConnection?.iceConnectionState === 'disconnected') {
          attemptReconnect();
        }
      }, 2000);
    } else if (state === 'failed') {
      console.log('[AutoReconnect] Connection failed, attempting immediate reconnect');
      
      setReconnectionState(prev => ({
        ...prev,
        lastDisconnectedAt: prev.lastDisconnectedAt || new Date(),
      }));

      // Clear any pending timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Attempt immediate reconnect
      attemptReconnect();
    }
  }, [peerConnection, callStatus, maxAttempts, onReconnected, attemptReconnect]);

  // Reset state when call ends
  useEffect(() => {
    if (callStatus === 'idle' || callStatus === 'ended') {
      wasConnectedRef.current = false;
      isReconnectingRef.current = false;
      reconnectAttemptRef.current = 0;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      setReconnectionState({
        isReconnecting: false,
        reconnectAttempt: 0,
        maxAttempts,
        lastDisconnectedAt: null,
      });
    }
  }, [callStatus, maxAttempts]);

  // Cancel reconnection manually
  const cancelReconnect = useCallback(() => {
    console.log('[AutoReconnect] Reconnection cancelled');
    
    isReconnectingRef.current = false;
    reconnectAttemptRef.current = 0;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setReconnectionState({
      isReconnecting: false,
      reconnectAttempt: 0,
      maxAttempts,
      lastDisconnectedAt: null,
    });
  }, [maxAttempts]);

  // Force reconnect attempt
  const forceReconnect = useCallback(() => {
    console.log('[AutoReconnect] Force reconnect requested');
    reconnectAttemptRef.current = 0;
    attemptReconnect();
  }, [attemptReconnect]);

  return {
    reconnectionState,
    handleConnectionStateChange,
    cancelReconnect,
    forceReconnect,
  };
};
