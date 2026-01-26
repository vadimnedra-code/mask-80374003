import { useRef, useCallback, useEffect } from 'react';

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

export const useCallSounds = () => {
  const dialingIntervalRef = useRef<number | null>(null);
  const ringtoneIntervalRef = useRef<number | null>(null);
  const activeOscillatorsRef = useRef<OscillatorNode[]>([]);
  const activeGainsRef = useRef<GainNode[]>([]);
  const isPlayingRef = useRef(false);

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

  const playDialTone = useCallback(() => {
    try {
      const ctx = getSharedAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.setValueAtTime(440, ctx.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      
      activeOscillatorsRef.current.push(oscillator);
      activeGainsRef.current.push(gainNode);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
      
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

  const playRingtone = useCallback(() => {
    try {
      const ctx = getSharedAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const playTone = (freq: number, startTime: number, duration: number) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.setValueAtTime(freq, startTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.4, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        activeOscillatorsRef.current.push(oscillator);
        activeGainsRef.current.push(gainNode);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
        
        oscillator.onended = () => {
          const idx = activeOscillatorsRef.current.indexOf(oscillator);
          if (idx > -1) activeOscillatorsRef.current.splice(idx, 1);
          oscillator.disconnect();
          gainNode.disconnect();
        };
      };

      const now = ctx.currentTime;
      playTone(440, now, 0.15);
      playTone(480, now + 0.15, 0.15);
      playTone(440, now + 0.4, 0.15);
      playTone(480, now + 0.55, 0.15);
    } catch (e) {
      console.error('Error playing ringtone:', e);
    }
  }, []);

  const startDialingSound = useCallback(() => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    
    // Ensure context is unlocked
    unlockAudioContext();
    
    playDialTone();
    
    dialingIntervalRef.current = window.setInterval(() => {
      playDialTone();
    }, 3000);
  }, [playDialTone]);

  const startRingtoneSound = useCallback(() => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    
    // Ensure context is unlocked before playing
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
    
    // Clean up any active oscillators to prevent audio artifacts
    cleanupOscillators();
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
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
      
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
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
      
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
  };
};
