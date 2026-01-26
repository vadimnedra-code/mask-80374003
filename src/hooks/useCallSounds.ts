import { useRef, useCallback, useEffect } from 'react';

export type RingtoneType = 'classic' | 'chime' | 'gentle' | 'modern' | 'minimal';

// Get saved ringtone preference
const getRingtoneType = (): RingtoneType => {
  if (typeof window === 'undefined') return 'chime';
  return (localStorage.getItem('call_ringtone') as RingtoneType) || 'chime';
};

// Singleton AudioContext to avoid multiple instances
let sharedAudioContext: AudioContext | null = null;
let audioContextUnlocked = false;

const getSharedAudioContext = () => {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedAudioContext;
};

// Unlock AudioContext on mobile - must be called from user interaction
const unlockAudioContext = async () => {
  if (audioContextUnlocked) return true;
  
  try {
    const ctx = getSharedAudioContext();
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
    console.log('[CallSounds] AudioContext unlocked');
    return true;
  } catch (err) {
    console.warn('[CallSounds] Failed to unlock AudioContext:', err);
    return false;
  }
};

// Setup unlock listeners on page load
if (typeof document !== 'undefined') {
  const unlockEvents = ['touchstart', 'touchend', 'mousedown', 'keydown', 'click'];
  
  const handleUnlock = () => {
    unlockAudioContext();
    unlockEvents.forEach(event => {
      document.removeEventListener(event, handleUnlock, true);
    });
  };
  
  unlockEvents.forEach(event => {
    document.addEventListener(event, handleUnlock, { capture: true, passive: true });
  });
}

// Ringtone configurations for different styles
const RINGTONE_CONFIGS = {
  classic: {
    // Traditional phone ring (two alternating frequencies)
    frequencies: [440, 480],
    pattern: 'alternating',
    duration: 0.4,
    gap: 0.1,
    volume: 0.12,
  },
  chime: {
    // Pleasant musical chime (C5 and E5)
    frequencies: [523.25, 659.25],
    pattern: 'chime',
    duration: 0.5,
    gap: 0.08,
    volume: 0.1,
  },
  gentle: {
    // Soft, calming tone (G4 and B4)
    frequencies: [392, 493.88],
    pattern: 'gentle',
    duration: 0.6,
    gap: 0.15,
    volume: 0.08,
  },
  modern: {
    // Electronic style (A4, C#5, E5)
    frequencies: [440, 554.37, 659.25],
    pattern: 'arpeggio',
    duration: 0.15,
    gap: 0.05,
    volume: 0.1,
  },
  minimal: {
    // Simple single beep (A5)
    frequencies: [880],
    pattern: 'single',
    duration: 0.3,
    gap: 0,
    volume: 0.1,
  },
};

export const useCallSounds = () => {
  const dialingIntervalRef = useRef<number | null>(null);
  const ringtoneIntervalRef = useRef<number | null>(null);
  const activeOscillatorsRef = useRef<OscillatorNode[]>([]);
  const activeGainsRef = useRef<GainNode[]>([]);
  const isPlayingRef = useRef(false);
  const fallbackAudioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up active oscillators
  const cleanupOscillators = useCallback(() => {
    activeOscillatorsRef.current.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {
        // Already stopped
      }
    });
    activeOscillatorsRef.current = [];
    
    activeGainsRef.current.forEach(gain => {
      try {
        gain.disconnect();
      } catch (e) {
        // Already disconnected
      }
    });
    activeGainsRef.current = [];
  }, []);

  // Play a single note with envelope
  const playNote = useCallback((
    ctx: AudioContext,
    frequency: number,
    startTime: number,
    duration: number,
    volume: number,
    attack: number = 0.02,
    decay: number = 3
  ) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(frequency, startTime);
    oscillator.type = 'sine';
    
    // Smooth envelope
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
    activeOscillatorsRef.current.push(oscillator);
    activeGainsRef.current.push(gainNode);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.1);
    
    oscillator.onended = () => {
      const idx = activeOscillatorsRef.current.indexOf(oscillator);
      if (idx > -1) activeOscillatorsRef.current.splice(idx, 1);
      try {
        oscillator.disconnect();
        gainNode.disconnect();
      } catch (e) {}
    };
  }, []);

  // Generate ringtone based on type
  const playRingtoneByType = useCallback((type: RingtoneType) => {
    try {
      const ctx = getSharedAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      if (ctx.state !== 'running') {
        return false;
      }

      const config = RINGTONE_CONFIGS[type];
      const now = ctx.currentTime;
      
      switch (config.pattern) {
        case 'alternating':
          // Classic phone ring: two frequencies alternating
          config.frequencies.forEach((freq, i) => {
            const start = now + i * (config.duration + config.gap);
            playNote(ctx, freq, start, config.duration, config.volume, 0.01);
          });
          break;
          
        case 'chime':
          // Musical chime: notes played in sequence
          config.frequencies.forEach((freq, i) => {
            const start = now + i * config.gap;
            playNote(ctx, freq, start, config.duration, config.volume * (1 - i * 0.15), 0.03);
          });
          break;
          
        case 'gentle':
          // Soft overlapping notes
          config.frequencies.forEach((freq, i) => {
            const start = now + i * config.gap;
            playNote(ctx, freq, start, config.duration, config.volume, 0.05, 2);
          });
          break;
          
        case 'arpeggio':
          // Quick ascending arpeggio
          config.frequencies.forEach((freq, i) => {
            const start = now + i * config.gap;
            playNote(ctx, freq, start, config.duration, config.volume, 0.01, 4);
          });
          break;
          
        case 'single':
          // Simple single beep
          playNote(ctx, config.frequencies[0], now, config.duration, config.volume, 0.02, 5);
          break;
      }
      
      return true;
    } catch (e) {
      console.error('Error playing ringtone:', e);
      return false;
    }
  }, [playNote]);

  // Generate HTML5 Audio fallback for ringtone
  const playRingtoneHTML5 = useCallback((type: RingtoneType) => {
    try {
      console.log('[CallSounds] Using HTML5 Audio fallback for:', type);
      
      if (!fallbackAudioRef.current) {
        fallbackAudioRef.current = new Audio();
        fallbackAudioRef.current.loop = false;
      }
      
      const audio = fallbackAudioRef.current;
      const config = RINGTONE_CONFIGS[type];
      
      const sampleRate = 44100;
      const duration = 0.7;
      const samples = Math.floor(sampleRate * duration);
      
      const buffer = new ArrayBuffer(44 + samples * 2);
      const view = new DataView(buffer);
      
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
      
      const freq1 = config.frequencies[0];
      const freq2 = config.frequencies[1] || freq1;
      
      for (let i = 0; i < samples; i++) {
        const t = i / sampleRate;
        
        let envelope = 0;
        if (t < 0.03) {
          envelope = t / 0.03;
        } else {
          envelope = Math.exp(-(t - 0.03) * 3);
        }
        
        const tone1 = Math.sin(2 * Math.PI * freq1 * t);
        const tone2 = t > config.gap ? Math.sin(2 * Math.PI * freq2 * (t - config.gap)) : 0;
        const env2 = t > config.gap ? Math.exp(-(t - config.gap - 0.03) * 3) : 0;
        
        const sample = (tone1 * envelope + tone2 * env2 * 0.8) * config.volume;
        view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, sample * 32767)), true);
      }
      
      const blob = new Blob([buffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      
      audio.src = url;
      audio.volume = 0.6;
      
      const playPromise = audio.play();
      if (playPromise) {
        playPromise
          .then(() => {
            setTimeout(() => URL.revokeObjectURL(url), 2000);
          })
          .catch(err => {
            console.warn('[CallSounds] HTML5 Audio play failed:', err);
            URL.revokeObjectURL(url);
          });
      }
    } catch (err) {
      console.error('[CallSounds] HTML5 Audio fallback error:', err);
    }
  }, []);

  // Play ringtone (main function)
  const playRingtone = useCallback(() => {
    const type = getRingtoneType();
    console.log('[CallSounds] Playing ringtone type:', type);
    
    const success = playRingtoneByType(type);
    if (!success) {
      playRingtoneHTML5(type);
    }
  }, [playRingtoneByType, playRingtoneHTML5]);

  // Preview a specific ringtone type
  const previewRingtone = useCallback((type: RingtoneType) => {
    console.log('[CallSounds] Previewing ringtone:', type);
    cleanupOscillators();
    
    const success = playRingtoneByType(type);
    if (!success) {
      playRingtoneHTML5(type);
    }
  }, [playRingtoneByType, playRingtoneHTML5, cleanupOscillators]);

  // Clean, soft dial tone
  const playDialTone = useCallback(() => {
    try {
      const ctx = getSharedAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const duration = 0.5;
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Clean 425Hz tone (standard dial tone frequency)
      oscillator.frequency.setValueAtTime(425, now);
      oscillator.type = 'sine';
      
      // Smooth envelope to avoid clicks
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.12, now + 0.02);
      gainNode.gain.setValueAtTime(0.12, now + duration - 0.05);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);
      
      activeOscillatorsRef.current.push(oscillator);
      activeGainsRef.current.push(gainNode);
      
      oscillator.start(now);
      oscillator.stop(now + duration);
      
      oscillator.onended = () => {
        const idx = activeOscillatorsRef.current.indexOf(oscillator);
        if (idx > -1) activeOscillatorsRef.current.splice(idx, 1);
        oscillator.disconnect();
        gainNode.disconnect();
      };
    } catch (e) {
      console.error('Error playing dial tone:', e);
    }
  }, []);

  const startDialingSound = useCallback(() => {
    console.log('[CallSounds] Starting dialing sound');
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    
    unlockAudioContext();
    
    playDialTone();
    
    dialingIntervalRef.current = window.setInterval(() => {
      playDialTone();
    }, 3000);
  }, [playDialTone]);

  const startRingtoneSound = useCallback(() => {
    console.log('[CallSounds] startRingtoneSound called, isPlaying:', isPlayingRef.current);
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    
    unlockAudioContext().then(() => {
      console.log('[CallSounds] Starting ringtone');
      playRingtone();
      
      ringtoneIntervalRef.current = window.setInterval(() => {
        playRingtone();
      }, 2000);
    });
  }, [playRingtone]);

  const stopAllSounds = useCallback(() => {
    console.log('[CallSounds] Stopping all sounds');
    
    isPlayingRef.current = false;
    
    if (dialingIntervalRef.current) {
      window.clearInterval(dialingIntervalRef.current);
      dialingIntervalRef.current = null;
    }
    
    if (ringtoneIntervalRef.current) {
      window.clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    
    cleanupOscillators();
    
    if (fallbackAudioRef.current) {
      try {
        fallbackAudioRef.current.pause();
        fallbackAudioRef.current.currentTime = 0;
        fallbackAudioRef.current.src = '';
      } catch (e) {}
    }
  }, [cleanupOscillators]);

  const playConnectedSound = useCallback(() => {
    try {
      const ctx = getSharedAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.15);
      
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
      };
    } catch (e) {
      console.error('Error playing connected sound:', e);
    }
  }, []);

  const playEndedSound = useCallback(() => {
    try {
      const ctx = getSharedAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.setValueAtTime(349.23, ctx.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.25);
      
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
      };
    } catch (e) {
      console.error('Error playing ended sound:', e);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopAllSounds();
    };
  }, [stopAllSounds]);

  return {
    startDialingSound,
    startRingtoneSound,
    stopAllSounds,
    playConnectedSound,
    playEndedSound,
    previewRingtone,
  };
};
