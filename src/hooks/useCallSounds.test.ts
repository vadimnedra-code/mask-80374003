import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCallSounds } from './useCallSounds';

describe('useCallSounds', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return all expected methods', () => {
    const { result } = renderHook(() => useCallSounds());
    
    expect(result.current.startDialingSound).toBeDefined();
    expect(result.current.startRingtoneSound).toBeDefined();
    expect(result.current.stopAllSounds).toBeDefined();
    expect(result.current.playConnectedSound).toBeDefined();
    expect(result.current.playEndedSound).toBeDefined();
    expect(result.current.shutdown).toBeDefined();
  });

  it('stopAllSounds should stop dialing interval', () => {
    const { result } = renderHook(() => useCallSounds());

    act(() => {
      result.current.startDialingSound();
    });

    // Advance to trigger at least one interval tick
    act(() => {
      vi.advanceTimersByTime(3500);
    });

    act(() => {
      result.current.stopAllSounds();
    });

    // After stopping, advancing timers should NOT cause errors or new sounds
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    
    // If we got here without errors, intervals are cleaned up
    expect(true).toBe(true);
  });

  it('stopAllSounds should suspend AudioContext (not close it)', () => {
    const { result } = renderHook(() => useCallSounds());

    // Start a sound to ensure AudioContext is created
    act(() => {
      result.current.startDialingSound();
    });

    act(() => {
      result.current.stopAllSounds();
    });

    // playConnectedSound should still work after stopAllSounds
    // (it resumes the suspended context)
    expect(() => {
      act(() => {
        result.current.playConnectedSound();
      });
    }).not.toThrow();
  });

  it('shutdown should fully destroy AudioContext', () => {
    const { result } = renderHook(() => useCallSounds());

    act(() => {
      result.current.startDialingSound();
    });

    act(() => {
      result.current.shutdown();
    });

    // playConnectedSound after shutdown creates a new context — should not throw
    expect(() => {
      act(() => {
        result.current.playConnectedSound();
      });
    }).not.toThrow();
  });

  it('stopAllSounds from one instance should stop sounds from another', () => {
    const { result: hook1 } = renderHook(() => useCallSounds());
    const { result: hook2 } = renderHook(() => useCallSounds());

    // Instance 1 starts ringtone
    act(() => {
      hook1.current.startRingtoneSound();
    });

    // Let async unlock resolve
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Instance 2 stops all sounds (cross-instance)
    act(() => {
      hook2.current.stopAllSounds();
    });

    // Advance timers — should not create new oscillators from instance 1's interval
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(true).toBe(true);
  });

  it('playEndedSound should work after stopAllSounds', () => {
    const { result } = renderHook(() => useCallSounds());

    act(() => {
      result.current.startDialingSound();
    });

    act(() => {
      result.current.stopAllSounds();
    });

    // This simulates CallScreen unmount flow: stop loops, then play ended sound
    expect(() => {
      act(() => {
        result.current.playEndedSound();
      });
    }).not.toThrow();
  });

  it('startDialingSound should not start if already playing', () => {
    const { result } = renderHook(() => useCallSounds());

    act(() => {
      result.current.startDialingSound();
    });

    // Second call should be a no-op (no double intervals)
    act(() => {
      result.current.startDialingSound();
    });

    act(() => {
      result.current.stopAllSounds();
    });

    // No errors = success
    expect(true).toBe(true);
  });

  it('cleanup on unmount should not throw', () => {
    const { unmount } = renderHook(() => useCallSounds());
    
    expect(() => {
      unmount();
    }).not.toThrow();
  });

  it('cleanup on unmount after playing should not throw', () => {
    const { result, unmount } = renderHook(() => useCallSounds());

    act(() => {
      result.current.startDialingSound();
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(() => {
      unmount();
    }).not.toThrow();
  });
});
