import { useRef, useCallback, useEffect } from 'react';

// Base64 encoded simple beep tones for calling/ringing
// These are short audio clips that work across all browsers

const createAudioContext = () => {
  return new (window.AudioContext || (window as any).webkitAudioContext)();
};

export const useCallSounds = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const dialingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(false);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = createAudioContext();
    }
    return audioContextRef.current;
  }, []);

  // Play a single dial tone beep
  const playDialTone = useCallback(() => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Classic phone dial tone frequency
    oscillator.frequency.setValueAtTime(440, ctx.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  }, [getAudioContext]);

  // Play ringtone melody
  const playRingtone = useCallback(() => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Two-tone ring pattern
    const playTone = (freq: number, startTime: number, duration: number) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.setValueAtTime(freq, startTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.4, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    // Classic phone ring pattern
    const now = ctx.currentTime;
    playTone(440, now, 0.15);
    playTone(480, now + 0.15, 0.15);
    playTone(440, now + 0.4, 0.15);
    playTone(480, now + 0.55, 0.15);
  }, [getAudioContext]);

  // Start dialing sound (beep every 2 seconds)
  const startDialingSound = useCallback(() => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    
    console.log('Starting dialing sound');
    playDialTone();
    
    dialingIntervalRef.current = setInterval(() => {
      playDialTone();
    }, 3000);
  }, [playDialTone]);

  // Start ringtone sound (ring every 1.5 seconds)
  const startRingtoneSound = useCallback(() => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    
    console.log('Starting ringtone sound');
    playRingtone();
    
    ringtoneIntervalRef.current = setInterval(() => {
      playRingtone();
    }, 2000);
  }, [playRingtone]);

  // Stop all sounds
  const stopAllSounds = useCallback(() => {
    console.log('Stopping all call sounds');
    isPlayingRef.current = false;
    
    if (dialingIntervalRef.current) {
      clearInterval(dialingIntervalRef.current);
      dialingIntervalRef.current = null;
    }
    
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
  }, []);

  // Play call connected sound
  const playConnectedSound = useCallback(() => {
    const ctx = getAudioContext();
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
  }, [getAudioContext]);

  // Play call ended sound
  const playEndedSound = useCallback(() => {
    const ctx = getAudioContext();
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
  }, [getAudioContext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllSounds();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
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
