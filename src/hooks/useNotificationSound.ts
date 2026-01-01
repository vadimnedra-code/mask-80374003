import { useCallback, useRef, useEffect } from 'react';

// Shared AudioContext singleton
let sharedAudioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!sharedAudioContext) {
    sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedAudioContext;
};

export const useNotificationSound = () => {
  const lastPlayedRef = useRef<number>(0);
  const enabledRef = useRef<boolean>(true);

  // Load preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('notification_sound');
    enabledRef.current = saved !== 'false';
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
    localStorage.setItem('notification_sound', enabled ? 'true' : 'false');
  }, []);

  const isEnabled = useCallback(() => enabledRef.current, []);

  const playMessageSound = useCallback(() => {
    if (!enabledRef.current) return;

    // Debounce - don't play more than once per 500ms
    const now = Date.now();
    if (now - lastPlayedRef.current < 500) return;
    lastPlayedRef.current = now;

    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Create a pleasant notification sound
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Two-tone notification (like iMessage)
      oscillator.frequency.setValueAtTime(880, now); // A5
      oscillator.frequency.setValueAtTime(1047, now + 0.1); // C6

      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      oscillator.start(now);
      oscillator.stop(now + 0.2);
    } catch (err) {
      // Ignore audio errors
      console.log('Could not play notification sound:', err);
    }
  }, []);

  const playCallSound = useCallback(() => {
    if (!enabledRef.current) return;

    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Create a ringtone-like sound
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(440, now);
      oscillator.frequency.setValueAtTime(554, now + 0.15);
      oscillator.frequency.setValueAtTime(659, now + 0.3);

      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.4, now + 0.05);
      gainNode.gain.setValueAtTime(0.4, now + 0.4);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      oscillator.start(now);
      oscillator.stop(now + 0.5);
    } catch (err) {
      console.log('Could not play call sound:', err);
    }
  }, []);

  return {
    playMessageSound,
    playCallSound,
    setEnabled,
    isEnabled,
  };
};
