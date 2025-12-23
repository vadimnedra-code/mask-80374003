import { useRef, useCallback, useEffect } from 'react';

// Singleton AudioContext to avoid multiple instances
let sharedAudioContext: AudioContext | null = null;

const getSharedAudioContext = () => {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedAudioContext;
};

export const useCallSounds = () => {
  const dialingIntervalRef = useRef<number | null>(null);
  const ringtoneIntervalRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);

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
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
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
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
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
    
    playDialTone();
    
    dialingIntervalRef.current = window.setInterval(() => {
      playDialTone();
    }, 3000);
  }, [playDialTone]);

  const startRingtoneSound = useCallback(() => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    
    playRingtone();
    
    ringtoneIntervalRef.current = window.setInterval(() => {
      playRingtone();
    }, 2000);
  }, [playRingtone]);

  const stopAllSounds = useCallback(() => {
    isPlayingRef.current = false;
    
    if (dialingIntervalRef.current) {
      window.clearInterval(dialingIntervalRef.current);
      dialingIntervalRef.current = null;
    }
    
    if (ringtoneIntervalRef.current) {
      window.clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
  }, []);

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
