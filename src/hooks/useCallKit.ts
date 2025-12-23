import { useCallback, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

// Interface matching the actual plugin API
interface Token {
  token: string;
}

interface CallData {
  connectionId: string;
  username?: string;
}

interface CallKitVoipPluginType {
  register(): Promise<void>;
  addListener(
    eventName: 'registration',
    listenerFunc: (token: Token) => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
  addListener(
    eventName: 'callAnswered',
    listenerFunc: (callData: CallData) => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
  addListener(
    eventName: 'callStarted',
    listenerFunc: (callData: CallData) => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
}

let callKitPlugin: CallKitVoipPluginType | null = null;

const loadCallKitPlugin = async (): Promise<CallKitVoipPluginType | null> => {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
    return null;
  }
  
  try {
    const module = await import('capacitor-callkit-voip');
    return module.CallKitVoip as CallKitVoipPluginType;
  } catch (error) {
    console.log('CallKit plugin not available:', error);
    return null;
  }
};

interface UseCallKitOptions {
  onCallAnswered?: (connectionId: string, username?: string) => void;
  onCallStarted?: (connectionId: string, username?: string) => void;
  onTokenReceived?: (token: string) => void;
}

export const useCallKit = (options: UseCallKitOptions = {}) => {
  const { onCallAnswered, onCallStarted, onTokenReceived } = options;
  const listenersRef = useRef<Array<PluginListenerHandle>>([]);
  const tokenRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize CallKit and register for VoIP push
  const initialize = useCallback(async (): Promise<string | null> => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
      console.log('CallKit: Not on iOS, skipping initialization');
      return null;
    }

    if (isInitializedRef.current) {
      console.log('CallKit: Already initialized');
      return tokenRef.current;
    }

    try {
      // Load the plugin
      if (!callKitPlugin) {
        callKitPlugin = await loadCallKitPlugin();
      }

      if (!callKitPlugin) {
        console.log('CallKit: Plugin not loaded');
        return null;
      }

      // Clean up existing listeners
      for (const listener of listenersRef.current) {
        await listener.remove();
      }
      listenersRef.current = [];

      // Set up registration listener (receives VoIP token)
      const registrationListener = await callKitPlugin.addListener('registration', (data: Token) => {
        console.log('CallKit: VoIP token received');
        tokenRef.current = data.token;
        onTokenReceived?.(data.token);
      });
      listenersRef.current.push(registrationListener);

      // Set up call answered listener
      const answeredListener = await callKitPlugin.addListener('callAnswered', (data: CallData) => {
        console.log('CallKit: Call answered:', data.connectionId);
        onCallAnswered?.(data.connectionId, data.username);
      });
      listenersRef.current.push(answeredListener);

      // Set up call started listener
      const startedListener = await callKitPlugin.addListener('callStarted', (data: CallData) => {
        console.log('CallKit: Call started:', data.connectionId);
        onCallStarted?.(data.connectionId, data.username);
      });
      listenersRef.current.push(startedListener);

      // Register for VoIP push notifications
      await callKitPlugin.register();
      console.log('CallKit: Registered for VoIP push');
      
      isInitializedRef.current = true;
      return tokenRef.current;
    } catch (error) {
      console.error('CallKit: Initialization error:', error);
      return null;
    }
  }, [onCallAnswered, onCallStarted, onTokenReceived]);

  // Get current VoIP token
  const getToken = useCallback((): string | null => {
    return tokenRef.current;
  }, []);

  // Check if CallKit is available
  const isAvailable = useCallback((): boolean => {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      listenersRef.current.forEach((listener) => {
        listener.remove().catch(() => {});
      });
      listenersRef.current = [];
    };
  }, []);

  return {
    initialize,
    getToken,
    isAvailable,
  };
};
