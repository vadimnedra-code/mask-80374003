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

  // Generate melodious ringtone as HTML5 Audio fallback
  const playRingtoneHTML5 = useCallback(() => {
    try {
      console.log('[CallSounds] Trying HTML5 Audio fallback');
      
      if (!fallbackAudioRef.current) {
        fallbackAudioRef.current = new Audio();
        fallbackAudioRef.current.loop = false;
      }
      
      const audio = fallbackAudioRef.current;
      
      // Generate a pleasant melodious ringtone WAV
      const sampleRate = 44100;
      const duration = 1.2;
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
      
      // Generate pleasant chord-based ringtone (C major arpeggio style)
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      
      for (let i = 0; i < samples; i++) {
        const t = i / sampleRate;
        
        // Smooth envelope with fade in/out
        let envelope = 0;
        if (t < 0.05) {
          envelope = t / 0.05; // Fade in
        } else if (t < 0.3) {
          envelope = 1;
        } else if (t < 0.35) {
          envelope = 1 - (t - 0.3) / 0.05; // Fade out first note
        } else if (t < 0.4) {
          envelope = (t - 0.35) / 0.05; // Fade in second
        } else if (t < 0.65) {
          envelope = 1;
        } else if (t < 0.7) {
          envelope = 1 - (t - 0.65) / 0.05;
        } else if (t < 0.75) {
          envelope = (t - 0.7) / 0.05;
        } else if (t < 1.0) {
          envelope = 1;
        } else {
          envelope = Math.max(0, 1 - (t - 1.0) / 0.2);
        }
        
        // Select note based on time
        let freq = notes[0];
        if (t >= 0.35 && t < 0.7) freq = notes[1];
        else if (t >= 0.7) freq = notes[2];
        
        // Add subtle harmonics for richness
        const fundamental = Math.sin(2 * Math.PI * freq * t);
        const harmonic2 = Math.sin(2 * Math.PI * freq * 2 * t) * 0.3;
        const harmonic3 = Math.sin(2 * Math.PI * freq * 3 * t) * 0.1;
        
        const sample = (fundamental + harmonic2 + harmonic3) * envelope * 0.25;
        view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, sample * 32767)), true);
      }
      
      const blob = new Blob([buffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      
      audio.src = url;
      audio.volume = 0.7;
      
      const playPromise = audio.play();
      if (playPromise) {
        playPromise
          .then(() => {
            console.log('[CallSounds] HTML5 Audio played successfully');
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

  const playDialTone = useCallback(() => {
    try {
      console.log('[CallSounds] Playing dial tone');
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

  // Play melodious ringtone with Web Audio API
  const playRingtone = useCallback(() => {
    try {
      console.log('[CallSounds] Playing ringtone with WebAudio');
      const ctx = getSharedAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      // If context is still suspended, try HTML5 Audio
      if (ctx.state !== 'running') {
        console.log('[CallSounds] AudioContext not running, using HTML5 fallback');
        playRingtoneHTML5();
        return;
      }

      // Pleasant ascending arpeggio (C major chord tones)
      const notes = [
        { freq: 523.25, start: 0, duration: 0.25 },    // C5
        { freq: 659.25, start: 0.3, duration: 0.25 },  // E5
        { freq: 783.99, start: 0.6, duration: 0.35 },  // G5
      ];
      
      const now = ctx.currentTime;
      
      notes.forEach(note => {
        if (!isPlayingRef.current) return; // Check again before each note
        
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.setValueAtTime(note.freq, now + note.start);
        oscillator.type = 'sine';
        
        // Smooth envelope for pleasant sound
        const attackTime = 0.02;
        const releaseTime = 0.1;
        
        gainNode.gain.setValueAtTime(0, now + note.start);
        gainNode.gain.linearRampToValueAtTime(0.5, now + note.start + attackTime);
        gainNode.gain.setValueAtTime(0.5, now + note.start + note.duration - releaseTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + note.start + note.duration);
        
        activeOscillatorsRef.current.push(oscillator);
        activeGainsRef.current.push(gainNode);
        
        oscillator.start(now + note.start);
        oscillator.stop(now + note.start + note.duration);
        
        oscillator.onended = () => {
          const idx = activeOscillatorsRef.current.indexOf(oscillator);
          if (idx > -1) activeOscillatorsRef.current.splice(idx, 1);
          oscillator.disconnect();
          gainNode.disconnect();
        };
      });
    } catch (e) {
      console.error('Error playing ringtone:', e);
      // Fallback to HTML5 Audio
      playRingtoneHTML5();
    }
  }, [playRingtoneHTML5]);

  const startDialingSound = useCallback(() => {
    console.log('[CallSounds] Starting dialing sound');
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
    console.log('[CallSounds] startRingtoneSound called, isPlaying:', isPlayingRef.current);
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    
    // Ensure context is unlocked before playing
    unlockAudioContext().then(() => {
      console.log('[CallSounds] Starting ringtone');
      playRingtone();
      
      ringtoneIntervalRef.current = window.setInterval(() => {
        console.log('[CallSounds] Ringtone interval tick');
        playRingtone();
      }, 2000);
    });
  }, [playRingtone]);

  const stopAllSounds = useCallback(() => {
    console.log('[CallSounds] Stopping all sounds - IMMEDIATE');
    
    // Set flag first to prevent any new sounds
    isPlayingRef.current = false;
    
    // Clear intervals immediately
    if (dialingIntervalRef.current) {
      window.clearInterval(dialingIntervalRef.current);
      dialingIntervalRef.current = null;
      console.log('[CallSounds] Cleared dialing interval');
    }
    
    if (ringtoneIntervalRef.current) {
      window.clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
      console.log('[CallSounds] Cleared ringtone interval');
    }
    
    // Clean up any active oscillators to prevent audio artifacts
    cleanupOscillators();
    
    // Stop HTML5 Audio if playing
    if (fallbackAudioRef.current) {
      try {
        fallbackAudioRef.current.pause();
        fallbackAudioRef.current.currentTime = 0;
        fallbackAudioRef.current.src = '';
        console.log('[CallSounds] Stopped HTML5 Audio');
      } catch (e) {
        console.warn('[CallSounds] Error stopping HTML5 Audio:', e);
      }
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
