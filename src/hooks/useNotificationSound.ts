import { useCallback, useRef, useEffect } from 'react';

// Shared AudioContext singleton
let sharedAudioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!sharedAudioContext) {
    sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedAudioContext;
};

export type NotificationSoundType = 'default' | 'soft' | 'chime' | 'bell' | 'pop';

export const NOTIFICATION_SOUNDS: { id: NotificationSoundType; name: string }[] = [
  { id: 'default', name: 'Стандартный' },
  { id: 'soft', name: 'Мягкий' },
  { id: 'chime', name: 'Перезвон' },
  { id: 'bell', name: 'Колокольчик' },
  { id: 'pop', name: 'Поп' },
];

export const useNotificationSound = () => {
  const lastPlayedRef = useRef<number>(0);
  const enabledRef = useRef<boolean>(true);
  const soundTypeRef = useRef<NotificationSoundType>('default');

  // Load preferences from localStorage
  useEffect(() => {
    const savedEnabled = localStorage.getItem('notification_sound');
    enabledRef.current = savedEnabled !== 'false';
    
    const savedType = localStorage.getItem('notification_sound_type') as NotificationSoundType;
    if (savedType && NOTIFICATION_SOUNDS.some(s => s.id === savedType)) {
      soundTypeRef.current = savedType;
    }
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
    localStorage.setItem('notification_sound', enabled ? 'true' : 'false');
  }, []);

  const setSoundType = useCallback((type: NotificationSoundType) => {
    soundTypeRef.current = type;
    localStorage.setItem('notification_sound_type', type);
  }, []);

  const getSoundType = useCallback(() => soundTypeRef.current, []);

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

      const currentTime = ctx.currentTime;
      const soundType = soundTypeRef.current;

      switch (soundType) {
        case 'soft': {
          // Soft notification - gentle sine wave
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(523, currentTime); // C5
          osc.type = 'sine';
          gain.gain.setValueAtTime(0, currentTime);
          gain.gain.linearRampToValueAtTime(0.2, currentTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.3);
          osc.start(currentTime);
          osc.stop(currentTime + 0.3);
          break;
        }
        case 'chime': {
          // Chime - multiple frequencies
          [523, 659, 784].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(freq, currentTime);
            osc.type = 'sine';
            const startTime = currentTime + i * 0.08;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);
            osc.start(startTime);
            osc.stop(startTime + 0.25);
          });
          break;
        }
        case 'bell': {
          // Bell - metallic sound
          const osc = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(830, currentTime);
          osc2.frequency.setValueAtTime(1245, currentTime);
          osc.type = 'sine';
          osc2.type = 'sine';
          gain.gain.setValueAtTime(0, currentTime);
          gain.gain.linearRampToValueAtTime(0.25, currentTime + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.4);
          osc.start(currentTime);
          osc2.start(currentTime);
          osc.stop(currentTime + 0.4);
          osc2.stop(currentTime + 0.4);
          break;
        }
        case 'pop': {
          // Pop - short burst
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(600, currentTime);
          osc.frequency.exponentialRampToValueAtTime(200, currentTime + 0.1);
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.3, currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.1);
          osc.start(currentTime);
          osc.stop(currentTime + 0.1);
          break;
        }
        default: {
          // Default - two-tone notification (like iMessage)
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          oscillator.frequency.setValueAtTime(880, currentTime); // A5
          oscillator.frequency.setValueAtTime(1047, currentTime + 0.1); // C6
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0, currentTime);
          gainNode.gain.linearRampToValueAtTime(0.3, currentTime + 0.02);
          gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.2);
          oscillator.start(currentTime);
          oscillator.stop(currentTime + 0.2);
        }
      }
    } catch (err) {
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
    getSoundType,
    setSoundType,
  };
};
