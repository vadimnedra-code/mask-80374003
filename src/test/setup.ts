import { vi } from 'vitest';
import "@testing-library/jest-dom";

// Mock AudioContext for tests
class MockOscillatorNode {
  frequency = { setValueAtTime: vi.fn() };
  type = 'sine';
  onended: (() => void) | null = null;
  _started = false;
  _stopped = false;
  _connected = false;

  connect(node: any) { this._connected = true; return node; }
  disconnect() { this._connected = false; }
  start(time?: number) { this._started = true; }
  stop(time?: number) {
    this._stopped = true;
    // Simulate onended firing
    setTimeout(() => this.onended?.(), 0);
  }
}

class MockGainNode {
  gain = {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    value: 1,
  };
  _connected = false;

  connect(node: any) { this._connected = true; return node; }
  disconnect() { this._connected = false; }
}

class MockAudioContext {
  state: 'running' | 'suspended' | 'closed' = 'running';
  currentTime = 0;
  destination = {};
  _oscillators: MockOscillatorNode[] = [];
  _gains: MockGainNode[] = [];

  createOscillator() {
    const osc = new MockOscillatorNode();
    this._oscillators.push(osc);
    return osc as any;
  }

  createGain() {
    const gain = new MockGainNode();
    this._gains.push(gain);
    return gain as any;
  }

  createBuffer(channels: number, length: number, sampleRate: number) {
    return {};
  }

  createBufferSource() {
    return {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
    };
  }

  async resume() {
    this.state = 'running';
  }

  async suspend() {
    this.state = 'suspended';
  }

  async close() {
    this.state = 'closed';
  }
}

(globalThis as any).AudioContext = MockAudioContext;
(globalThis as any).webkitAudioContext = MockAudioContext;

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
