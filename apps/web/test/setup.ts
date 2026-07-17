import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.matchMedia which is missing in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock HTMLAudioElement
window.HTMLAudioElement.prototype.play = vi.fn().mockImplementation(() => Promise.resolve());
window.HTMLAudioElement.prototype.pause = vi.fn();
// Mock getUserMedia
if (navigator.mediaDevices === undefined) {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: vi.fn().mockImplementation(() => Promise.resolve(new MediaStream())),
      enumerateDevices: vi.fn().mockImplementation(() => Promise.resolve([])),
    },
    writable: true,
  });
}
