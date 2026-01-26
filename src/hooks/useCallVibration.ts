import { useRef, useCallback, useEffect } from 'react';

export type VibrationPatternType = 'standard' | 'pulse' | 'heartbeat' | 'urgent' | 'gentle' | 'none';

export interface VibrationPatternOption {
  id: VibrationPatternType;
  name: string;
  description: string;
}

export const VIBRATION_PATTERN_OPTIONS: VibrationPatternOption[] = [
  { id: 'standard', name: 'Стандартная', description: 'Классическая вибрация звонка' },
  { id: 'pulse', name: 'Пульс', description: 'Ритмичные короткие импульсы' },
  { id: 'heartbeat', name: 'Сердцебиение', description: 'Два коротких, пауза' },
  { id: 'urgent', name: 'Срочная', description: 'Интенсивная непрерывная' },
  { id: 'gentle', name: 'Мягкая', description: 'Лёгкие деликатные вибрации' },
  { id: 'none', name: 'Без вибрации', description: 'Отключить вибрацию' },
];

// Vibration patterns in milliseconds [vibrate, pause, vibrate, pause, ...]
const VIBRATION_PATTERNS: Record<VibrationPatternType, number[]> = {
  standard: [400, 200, 400, 200, 400, 1000],
  pulse: [100, 100, 100, 100, 100, 100, 100, 800],
  heartbeat: [150, 100, 150, 600],
  urgent: [500, 100, 500, 100, 500, 500],
  gentle: [200, 400, 200, 800],
  none: [],
};

const STORAGE_KEY = 'call_vibration_pattern';

export const getVibrationPatternType = (): VibrationPatternType => {
  if (typeof window === 'undefined') return 'standard';
  return (localStorage.getItem(STORAGE_KEY) as VibrationPatternType) || 'standard';
};

export const setVibrationPatternType = (type: VibrationPatternType) => {
  localStorage.setItem(STORAGE_KEY, type);
};

export const useCallVibration = () => {
  const vibrationIntervalRef = useRef<number | null>(null);
  const isVibratingRef = useRef(false);

  // Check if vibration is supported
  const isSupported = useCallback(() => {
    return 'vibrate' in navigator;
  }, []);

  // Vibrate with a specific pattern
  const vibratePattern = useCallback((type: VibrationPatternType) => {
    if (!isSupported() || type === 'none') return;
    
    const pattern = VIBRATION_PATTERNS[type];
    if (pattern.length > 0) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        console.warn('[CallVibration] Vibration failed:', e);
      }
    }
  }, [isSupported]);

  // Start continuous vibration for incoming call
  const startCallVibration = useCallback(() => {
    const type = getVibrationPatternType();
    console.log('[CallVibration] Starting vibration pattern:', type);
    
    if (!isSupported() || type === 'none') {
      console.log('[CallVibration] Vibration not supported or disabled');
      return;
    }

    if (isVibratingRef.current) {
      console.log('[CallVibration] Already vibrating');
      return;
    }

    isVibratingRef.current = true;
    
    // Calculate total pattern duration
    const pattern = VIBRATION_PATTERNS[type];
    const patternDuration = pattern.reduce((a, b) => a + b, 0);
    
    // Start initial vibration
    vibratePattern(type);
    
    // Set up interval to repeat the pattern
    vibrationIntervalRef.current = window.setInterval(() => {
      vibratePattern(type);
    }, patternDuration);
  }, [isSupported, vibratePattern]);

  // Stop all vibration
  const stopVibration = useCallback(() => {
    console.log('[CallVibration] Stopping vibration');
    
    isVibratingRef.current = false;
    
    if (vibrationIntervalRef.current) {
      window.clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    
    // Cancel any ongoing vibration
    if (isSupported()) {
      try {
        navigator.vibrate(0);
      } catch (e) {
        // Ignore
      }
    }
  }, [isSupported]);

  // Preview a specific vibration pattern
  const previewVibration = useCallback((type: VibrationPatternType) => {
    console.log('[CallVibration] Previewing vibration:', type);
    
    // Stop any existing vibration first
    stopVibration();
    
    if (type === 'none') return;
    
    // Play the pattern once
    vibratePattern(type);
  }, [vibratePattern, stopVibration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVibration();
    };
  }, [stopVibration]);

  return {
    isSupported,
    startCallVibration,
    stopVibration,
    previewVibration,
  };
};
