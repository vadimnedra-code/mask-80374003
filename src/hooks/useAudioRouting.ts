import { useState, useCallback, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Audio routing modes for calls (like WhatsApp)
 * - earpiece: Phone speaker (near ear) - default for voice calls
 * - speaker: Loudspeaker - speakerphone mode
 * - headphones: Wired/Bluetooth headphones (auto-detected)
 */
export type AudioRoute = 'earpiece' | 'speaker' | 'headphones';

interface UseAudioRoutingResult {
  audioRoute: AudioRoute;
  availableRoutes: AudioRoute[];
  isHeadphonesConnected: boolean;
  isSpeakerOn: boolean;
  setAudioRoute: (route: AudioRoute) => void;
  toggleSpeaker: () => void;
  cycleAudioRoute: () => void;
  applyAudioRoute: (audioElement: HTMLAudioElement | null) => void;
}

/**
 * Hook for managing audio routing in calls like WhatsApp.
 * 
 * Features:
 * - Automatic headphone detection
 * - Three audio routes: earpiece, speaker, headphones
 * - Volume adjustments per route
 */
export const useAudioRouting = (defaultRoute: AudioRoute = 'earpiece'): UseAudioRoutingResult => {
  const [audioRoute, setAudioRouteState] = useState<AudioRoute>(defaultRoute);
  const [isHeadphonesConnected, setIsHeadphonesConnected] = useState(false);
  const audioElementsRef = useRef<Set<HTMLAudioElement>>(new Set());

  const isSpeakerOn = audioRoute === 'speaker';

  // Available routes based on headphone connection
  const availableRoutes: AudioRoute[] = isHeadphonesConnected 
    ? ['headphones', 'speaker'] 
    : ['earpiece', 'speaker'];

  // Detect headphones connection
  useEffect(() => {
    const checkAudioDevices = async () => {
      try {
        // Request permission first (needed for enumerateDevices to show labels)
        await navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
          stream.getTracks().forEach(track => track.stop());
        }).catch(() => {});

        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
        
        // Check for headphones/bluetooth
        const hasHeadphones = audioOutputs.some(d => 
          d.label.toLowerCase().includes('headphone') ||
          d.label.toLowerCase().includes('airpod') ||
          d.label.toLowerCase().includes('bluetooth') ||
          d.label.toLowerCase().includes('earphone') ||
          d.label.toLowerCase().includes('headset')
        );
        
        setIsHeadphonesConnected(hasHeadphones);
        
        // Auto-switch to headphones when connected
        if (hasHeadphones && audioRoute !== 'speaker') {
          setAudioRouteState('headphones');
        } else if (!hasHeadphones && audioRoute === 'headphones') {
          setAudioRouteState('earpiece');
        }
        
        console.log('[AudioRouting] Devices:', audioOutputs.map(d => d.label));
        console.log('[AudioRouting] Headphones connected:', hasHeadphones);
      } catch (err) {
        console.log('[AudioRouting] Could not enumerate devices:', err);
      }
    };

    checkAudioDevices();

    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', checkAudioDevices);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', checkAudioDevices);
    };
  }, [audioRoute]);

  // Apply audio settings to an audio element
  const applyAudioRoute = useCallback((audioElement: HTMLAudioElement | null) => {
    if (!audioElement) return;

    // Track audio elements for route changes
    audioElementsRef.current.add(audioElement);

    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();

    // Set volume based on route
    let volume = 1.0;
    switch (audioRoute) {
      case 'earpiece':
        volume = isNative ? 0.5 : 0.6; // Lower for earpiece
        break;
      case 'speaker':
        volume = 1.0; // Full volume for speaker
        break;
      case 'headphones':
        volume = 0.8; // Slightly lower for headphones (safety)
        break;
    }

    audioElement.volume = volume;
    
    // iOS-specific attributes
    if (isNative && platform === 'ios') {
      audioElement.setAttribute('playsinline', 'true');
      audioElement.setAttribute('webkit-playsinline', 'true');
    }
    
    console.log(`[AudioRouting] Applied ${audioRoute} mode, volume: ${volume}`);
  }, [audioRoute]);

  // Set specific audio route
  const setAudioRoute = useCallback((route: AudioRoute) => {
    // Validate route availability
    if (route === 'headphones' && !isHeadphonesConnected) {
      console.log('[AudioRouting] Headphones not available, using earpiece');
      setAudioRouteState('earpiece');
      return;
    }
    setAudioRouteState(route);
    console.log(`[AudioRouting] Set route to ${route}`);
  }, [isHeadphonesConnected]);

  // Toggle between earpiece and speaker (legacy support)
  const toggleSpeaker = useCallback(() => {
    setAudioRouteState(prev => {
      if (prev === 'speaker') {
        return isHeadphonesConnected ? 'headphones' : 'earpiece';
      }
      return 'speaker';
    });
  }, [isHeadphonesConnected]);

  // Cycle through available routes (WhatsApp style)
  const cycleAudioRoute = useCallback(() => {
    setAudioRouteState(prev => {
      const currentIndex = availableRoutes.indexOf(prev);
      const nextIndex = (currentIndex + 1) % availableRoutes.length;
      const nextRoute = availableRoutes[nextIndex];
      console.log(`[AudioRouting] Cycling from ${prev} to ${nextRoute}`);
      return nextRoute;
    });
  }, [availableRoutes]);

  // Apply route changes to all tracked audio elements
  useEffect(() => {
    audioElementsRef.current.forEach(audioEl => {
      if (audioEl) {
        applyAudioRoute(audioEl);
      }
    });
  }, [audioRoute, applyAudioRoute]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioElementsRef.current.clear();
    };
  }, []);

  return {
    audioRoute,
    availableRoutes,
    isHeadphonesConnected,
    isSpeakerOn,
    setAudioRoute,
    toggleSpeaker,
    cycleAudioRoute,
    applyAudioRoute,
  };
};
