import { useState, useCallback, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Audio routing modes for calls
 * - earpiece: Phone speaker (near ear) - default for voice calls
 * - speaker: Loudspeaker - for speakerphone mode
 */
type AudioRoute = 'earpiece' | 'speaker';

interface UseAudioRoutingResult {
  audioRoute: AudioRoute;
  isSpeakerOn: boolean;
  toggleSpeaker: () => void;
  applyAudioRoute: (audioElement: HTMLAudioElement | null) => void;
}

/**
 * Hook for managing audio routing in calls.
 * 
 * On iOS native app (Capacitor):
 * - Uses low volume for earpiece simulation
 * - Uses full volume for speaker mode
 * 
 * On web browsers:
 * - Limited control, uses volume adjustments
 * 
 * Note: True earpiece/speaker routing on iOS requires native AudioSession
 * configuration which is handled by the CallKit plugin for VoIP calls.
 */
export const useAudioRouting = (defaultRoute: AudioRoute = 'earpiece'): UseAudioRoutingResult => {
  const [audioRoute, setAudioRoute] = useState<AudioRoute>(defaultRoute);
  const audioElementsRef = useRef<Set<HTMLAudioElement>>(new Set());

  const isSpeakerOn = audioRoute === 'speaker';

  // Apply audio settings to an audio element
  const applyAudioRoute = useCallback((audioElement: HTMLAudioElement | null) => {
    if (!audioElement) return;

    // Track audio elements for route changes
    audioElementsRef.current.add(audioElement);

    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();

    if (isNative && platform === 'ios') {
      // iOS Native App
      // The CallKit plugin handles actual audio routing for VoIP calls.
      // Here we adjust volume as a fallback/indicator:
      // - Earpiece mode: lower volume (iOS WebView plays through receiver by default for calls)
      // - Speaker mode: full volume
      audioElement.volume = audioRoute === 'speaker' ? 1.0 : 0.5;
      
      // Ensure playsinline for iOS WebView
      audioElement.setAttribute('playsinline', 'true');
      audioElement.setAttribute('webkit-playsinline', 'true');
      
      console.log(`[AudioRouting] iOS: Set volume to ${audioElement.volume} for ${audioRoute} mode`);
    } else if (isNative && platform === 'android') {
      // Android Native App
      // Android WebView typically routes call audio correctly
      audioElement.volume = audioRoute === 'speaker' ? 1.0 : 0.7;
      console.log(`[AudioRouting] Android: Set volume to ${audioElement.volume} for ${audioRoute} mode`);
    } else {
      // Web browser - very limited control
      // Most browsers route audio through speakers by default
      audioElement.volume = audioRoute === 'speaker' ? 1.0 : 0.6;
      console.log(`[AudioRouting] Web: Set volume to ${audioElement.volume} for ${audioRoute} mode`);
    }
  }, [audioRoute]);

  // Toggle between earpiece and speaker
  const toggleSpeaker = useCallback(() => {
    setAudioRoute(prev => {
      const newRoute = prev === 'speaker' ? 'earpiece' : 'speaker';
      console.log(`[AudioRouting] Toggling from ${prev} to ${newRoute}`);
      return newRoute;
    });
  }, []);

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
    isSpeakerOn,
    toggleSpeaker,
    applyAudioRoute,
  };
};
