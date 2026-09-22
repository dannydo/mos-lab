import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  recordBreadcrumb,
  getRecentBreadcrumbs,
  reportFrontendIssue,
  isChunkLoadError,
  handleAutoChunkReload,
  CHUNK_RELOAD_STORAGE_KEY,
  initFrontendObserver,
} from './frontend-observer';

describe('frontend-observer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('records breadcrumbs and limits history to 25 items', () => {
    for (let i = 0; i < 30; i++) {
      recordBreadcrumb('ui', 'click', `button_${i}`);
    }

    const breadcrumbs = getRecentBreadcrumbs();
    expect(breadcrumbs.length).toBe(25);
    expect(breadcrumbs[breadcrumbs.length - 1].target).toBe('button_29');
    expect(breadcrumbs[0].target).toBe('button_5');
  });

  it('redacts sensitive information in breadcrumb targets', () => {
    recordBreadcrumb(
      'ui',
      'click',
      'User 0987654321 clicked with token eyJhbGciOiJIUzI1NiJ9.test.sig and email test@gmail.com'
    );
    const recent = getRecentBreadcrumbs();
    const last = recent[recent.length - 1];

    expect(last.target).not.toContain('0987654321');
    expect(last.target).toContain('[REDACTED_PHONE]');
    expect(last.target).not.toContain('test@gmail.com');
    expect(last.target).toContain('[REDACTED_EMAIL]');
  });

  it('dispatches issue telemetry via sendBeacon or fetch without throwing', () => {
    const mockSendBeacon = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', {
      value: mockSendBeacon,
      writable: true,
      configurable: true,
    });

    reportFrontendIssue({
      issueType: 'RAGE_CLICK',
      target: 'button[Submit]',
      message: 'Rapid clicking detected',
    });

    expect(mockSendBeacon).toHaveBeenCalledTimes(1);
    const [url, blob] = mockSendBeacon.mock.calls[0];
    expect(url).toContain('/telemetry/frontend-issues');
    expect(blob).toBeInstanceOf(Blob);
  });

  describe('isChunkLoadError', () => {
    it('accurately detects ChunkLoadError and webpack/next dynamic chunk load failures', () => {
      expect(isChunkLoadError(new Error('Loading chunk 4182 failed'))).toBe(true);
      expect(isChunkLoadError({ name: 'ChunkLoadError', message: 'ChunkLoadError' })).toBe(true);
      expect(isChunkLoadError(new Error('Failed to load chunk /_next/static/chunks/app/dashboard/page.js'))).toBe(true);
      expect(isChunkLoadError(new Error('CSS_CHUNK_LOAD_FAILED: Loading CSS chunk 512 failed'))).toBe(true);
      expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module: https://lab.masteros.app/asset.js'))).toBe(true);

      // Normal runtime errors should not be flagged as chunk errors
      expect(isChunkLoadError(new TypeError('Cannot read properties of undefined (reading "id")'))).toBe(false);
      expect(isChunkLoadError(new Error('Network request failed with status 500'))).toBe(false);
      expect(isChunkLoadError(null)).toBe(false);
      expect(isChunkLoadError(undefined)).toBe(false);
    });
  });

  describe('handleAutoChunkReload', () => {
    it('triggers window.reload on chunk error and guards against infinite reload loops via sessionStorage', () => {
      const mockReload = vi.fn();
      // Setup window.location.reload mock
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, reload: mockReload },
        writable: true,
        configurable: true,
      });

      // Clear any previous reload flag & storage
      delete (window as any).__mos_chunk_reloading;
      window.sessionStorage.clear();

      // 1. Non-chunk error should return false and not reload
      const normalResult = handleAutoChunkReload(new Error('Regular application error'));
      expect(normalResult).toBe(false);
      expect(mockReload).not.toHaveBeenCalled();

      // 2. Valid chunk error triggers reload and records timestamp
      const chunkError = new Error('Loading chunk 9999 failed');
      const firstResult = handleAutoChunkReload(chunkError);
      expect(firstResult).toBe(true);
      expect(mockReload).toHaveBeenCalledTimes(1);
      expect(window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY)).toBeTruthy();

      // 3. Subsequent chunk error within cooldown should NOT trigger another reload (infinite loop guard)
      delete (window as any).__mos_chunk_reloading;
      const secondResult = handleAutoChunkReload(chunkError);
      expect(secondResult).toBe(false);
      // reload should still only have been called once
      expect(mockReload).toHaveBeenCalledTimes(1);
    });
  });

  describe('tactile feedback and rage-click exclusion', () => {
    it('applies mos-active-tap to clicked button and ignores rapid clicks on inputs and steppers', () => {
      const cleanup = initFrontendObserver();

      const button = document.createElement('button');
      button.textContent = 'Sao chép tin nhắn';
      document.body.appendChild(button);

      // Trigger click on button
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(button.classList.contains('mos-active-tap')).toBe(true);

      // Verify that inputs and steppers do not trigger rage-click issues
      const mockSendBeacon = vi.fn().mockReturnValue(true);
      Object.defineProperty(navigator, 'sendBeacon', {
        value: mockSendBeacon,
        writable: true,
        configurable: true,
      });

      const textInput = document.createElement('input');
      textInput.type = 'text';
      textInput.setAttribute('aria-label', 'Mở tìm kiếm khách hàng');
      document.body.appendChild(textInput);

      // Simulate 5 rapid clicks on input (e.g. multi-click text selection)
      for (let i = 0; i < 5; i++) {
        textInput.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }

      // Should not report RAGE_CLICK for input selection
      const beaconCalls = mockSendBeacon.mock.calls.map((call) => call[0]);
      expect(mockSendBeacon).not.toHaveBeenCalled();

      cleanup();
      document.body.removeChild(button);
      document.body.removeChild(textInput);
    });
  });
});
