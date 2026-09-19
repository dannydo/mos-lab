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

// jsdom does not implement pseudo-element styles. Ant Design only needs the
// element styles in these tests, so omit the unsupported second argument.
const getComputedStyle = window.getComputedStyle.bind(window);
Object.defineProperty(window, 'getComputedStyle', {
  configurable: true,
  value: (element: Element) => getComputedStyle(element),
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

// Mock localStorage for node/jsdom environments
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    get length() {
      return Object.keys(store).length;
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: storageMock,
  configurable: true,
  writable: true,
});
Object.defineProperty(globalThis, 'localStorage', {
  value: storageMock,
  configurable: true,
  writable: true,
});
