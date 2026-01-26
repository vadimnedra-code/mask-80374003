import { useCallback, useRef, useEffect } from 'react';

// Shared AudioContext singleton
let sharedAudioContext: AudioContext | null = null;
let audioContextUnlocked = false;
let unlockListenersAdded = false;

const getAudioContext = (): AudioContext => {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedAudioContext;
};

// Unlock AudioContext on first user interaction (required for mobile)
const unlockAudioContext = async () => {
  if (audioContextUnlocked) return;
  
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    // Play silent buffer to unlock on iOS
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    
    audioContextUnlocked = true;
    console.log('[NotificationSound] AudioContext unlocked');
  } catch (err) {
    console.warn('[NotificationSound] Failed to unlock AudioContext:', err);
  }
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
  const fallbackAudioRef = useRef<HTMLAudioElement | null>(null);

  // Setup unlock listeners once on mount
  useEffect(() => {
    if (unlockListenersAdded) return;
    unlockListenersAdded = true;

    const unlockEvents = ['touchstart', 'touchend', 'mousedown', 'keydown', 'click'];
    
    const handleUnlock = () => {
      unlockAudioContext();
      // Remove listeners after first interaction
      unlockEvents.forEach(event => {
        document.removeEventListener(event, handleUnlock, true);
      });
    };
    
    unlockEvents.forEach(event => {
      document.addEventListener(event, handleUnlock, { capture: true, passive: true });
    });

    return () => {
      unlockEvents.forEach(event => {
        document.removeEventListener(event, handleUnlock, true);
      });
    };
  }, []);

  // Load preferences from localStorage
  useEffect(() => {
    const savedEnabled = localStorage.getItem('notification_sound');
    enabledRef.current = savedEnabled !== 'false';
    
    const savedType = localStorage.getItem('notification_sound_type') as NotificationSoundType;
    if (savedType && NOTIFICATION_SOUNDS.some(s => s.id === savedType)) {
      soundTypeRef.current = savedType;
    }

    // Pre-create fallback audio element for mobile
    if (!fallbackAudioRef.current) {
      fallbackAudioRef.current = new Audio();
      fallbackAudioRef.current.volume = 0.5;
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

  const playWithWebAudio = useCallback((soundType: NotificationSoundType): boolean => {
    try {
      const ctx = getAudioContext();
      
      // Try to resume if suspended
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      
      // If still suspended, return false to trigger fallback
      if (ctx.state !== 'running') {
        console.log('[NotificationSound] AudioContext not running, using fallback');
        return false;
      }

      const currentTime = ctx.currentTime;

      switch (soundType) {
        case 'soft': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(523, currentTime);
          osc.type = 'sine';
          gain.gain.setValueAtTime(0, currentTime);
          gain.gain.linearRampToValueAtTime(0.3, currentTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.4);
          osc.start(currentTime);
          osc.stop(currentTime + 0.4);
          break;
        }
        case 'chime': {
          [523, 659, 784].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(freq, currentTime);
            osc.type = 'sine';
            const startTime = currentTime + i * 0.08;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
            osc.start(startTime);
            osc.stop(startTime + 0.3);
          });
          break;
        }
        case 'bell': {
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
          gain.gain.linearRampToValueAtTime(0.35, currentTime + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.5);
          osc.start(currentTime);
          osc2.start(currentTime);
          osc.stop(currentTime + 0.5);
          osc2.stop(currentTime + 0.5);
          break;
        }
        case 'pop': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(600, currentTime);
          osc.frequency.exponentialRampToValueAtTime(200, currentTime + 0.15);
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.4, currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.15);
          osc.start(currentTime);
          osc.stop(currentTime + 0.15);
          break;
        }
        default: {
          // Default - two-tone notification (louder for mobile)
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          oscillator.frequency.setValueAtTime(880, currentTime);
          oscillator.frequency.setValueAtTime(1047, currentTime + 0.1);
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0, currentTime);
          gainNode.gain.linearRampToValueAtTime(0.4, currentTime + 0.02);
          gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.25);
          oscillator.start(currentTime);
          oscillator.stop(currentTime + 0.25);
        }
      }
      
      return true;
    } catch (err) {
      console.warn('[NotificationSound] WebAudio failed:', err);
      return false;
    }
  }, []);

  const playWithHtmlAudio = useCallback(() => {
    try {
      // Create a simple beep using oscillator-generated audio
      const audio = fallbackAudioRef.current || new Audio();
      
      // Generate a simple tone as data URI
      const sampleRate = 22050;
      const duration = 0.3;
      const frequency = 880;
      const samples = Math.floor(sampleRate * duration);
      
      const buffer = new ArrayBuffer(44 + samples * 2);
      const view = new DataView(buffer);
      
      // WAV header
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };
      
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + samples * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, samples * 2, true);
      
      // Generate sine wave with envelope
      for (let i = 0; i < samples; i++) {
        const t = i / sampleRate;
        const envelope = Math.min(1, Math.min(t * 20, (duration - t) * 10));
        const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.5;
        view.setInt16(44 + i * 2, sample * 32767, true);
      }
      
      const blob = new Blob([buffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      
      audio.src = url;
      audio.volume = 0.7;
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('[NotificationSound] HTML Audio played successfully');
            // Clean up blob URL after playing
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          })
          .catch(err => {
            console.warn('[NotificationSound] HTML Audio play failed:', err);
            URL.revokeObjectURL(url);
          });
      }
    } catch (err) {
      console.warn('[NotificationSound] HTML Audio fallback failed:', err);
    }
  }, []);

  const playMessageSound = useCallback(() => {
    if (!enabledRef.current) return;

    // Debounce - don't play more than once per 500ms
    const now = Date.now();
    if (now - lastPlayedRef.current < 500) return;
    lastPlayedRef.current = now;

    const soundType = soundTypeRef.current;
    
    // Try WebAudio first, fallback to HTML Audio
    const webAudioSuccess = playWithWebAudio(soundType);
    
    if (!webAudioSuccess) {
      console.log('[NotificationSound] Falling back to HTML Audio');
      playWithHtmlAudio();
    }
  }, [playWithWebAudio, playWithHtmlAudio]);

  const playCallSound = useCallback(() => {
    if (!enabledRef.current) return;

    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Create a ringtone-like sound (louder)
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(440, now);
      oscillator.frequency.setValueAtTime(554, now + 0.15);
      oscillator.frequency.setValueAtTime(659, now + 0.3);

      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.5, now + 0.05);
      gainNode.gain.setValueAtTime(0.5, now + 0.4);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

      oscillator.start(now);
      oscillator.stop(now + 0.6);
    } catch (err) {
      console.log('[NotificationSound] Could not play call sound:', err);
      // Try HTML Audio fallback for calls too
      playWithHtmlAudio();
    }
  }, [playWithHtmlAudio]);

  return {
    playMessageSound,
    playCallSound,
    setEnabled,
    isEnabled,
    getSoundType,
    setSoundType,
  };
};
