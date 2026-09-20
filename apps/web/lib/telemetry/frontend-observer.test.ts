import { describe, it, expect, beforeEach, vi } from 'vitest';
import { recordBreadcrumb, getRecentBreadcrumbs, reportFrontendIssue } from './frontend-observer';

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
});
