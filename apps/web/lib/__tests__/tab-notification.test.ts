import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tabNotificationManager, playMessengerChime, showDesktopNotification } from '../tab-notification';

describe('TabNotificationManager (MOS-BUG-139 Messenger-Style Tab Alert)', () => {
  let originalTitle: string;
  let mockFaviconLink: HTMLLinkElement;
  let mockContext: Record<string, unknown>;

  beforeEach(() => {
    vi.useFakeTimers();
    originalTitle = 'mos-lab — Wings Lashes CRM';
    document.title = originalTitle;

    // Setup favicon link in head
    document.head.innerHTML = '';
    mockFaviconLink = document.createElement('link');
    mockFaviconLink.rel = 'icon';
    mockFaviconLink.href = '/apple-touch-icon.png';
    document.head.appendChild(mockFaviconLink);

    mockContext = {
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      clearRect: vi.fn(),
      fillText: vi.fn(),
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      mockContext as unknown as CanvasRenderingContext2D
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,mockBadgedFavicon');

    tabNotificationManager.reset();
    tabNotificationManager.setBaseTitle(originalTitle);
  });

  afterEach(() => {
    tabNotificationManager.reset();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('updates document.title with unread count prefix when unread > 0', () => {
    tabNotificationManager.setUnreadCount('chat', 3);
    expect(document.title).toBe('(3) mos-lab — Wings Lashes CRM');
    expect(tabNotificationManager.getTotalUnreadCount()).toBe(3);

    tabNotificationManager.setUnreadCount('inbox', 2);
    expect(document.title).toBe('(5) mos-lab — Wings Lashes CRM');
    expect(tabNotificationManager.getTotalUnreadCount()).toBe(5);
  });

  it('restores clean base title when all unread items are cleared', () => {
    tabNotificationManager.setUnreadCount('chat', 4);
    expect(document.title).toBe('(4) mos-lab — Wings Lashes CRM');

    tabNotificationManager.setUnreadCount('chat', 0);
    expect(document.title).toBe('mos-lab — Wings Lashes CRM');
    expect(tabNotificationManager.getTotalUnreadCount()).toBe(0);
  });

  it('alternates tab title like Messenger when triggerAlert is called while inactive', () => {
    // Simulate hidden document (user looking away on another tab)
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });

    tabNotificationManager.setUnreadCount('chat', 1);
    tabNotificationManager.triggerAlert({
      senderName: 'Nguyễn Quang Khải',
      snippet: 'có thông báo trên tab chưa đổi qua nhé',
    });

    // Step 0: shows snippet message
    expect(document.title).toContain('Nguyễn Quang Khải');
    expect(document.title).toContain('có thông báo trên tab');

    // Advance 1.5s -> Step 1: shows (1) base title
    vi.advanceTimersByTime(1500);
    expect(document.title).toBe('(1) mos-lab — Wings Lashes CRM');

    // Advance 1.5s -> Step 0: shows message again
    vi.advanceTimersByTime(1500);
    expect(document.title).toContain('Nguyễn Quang Khải');

    // Advance 1.5s -> Step 1: shows base title again
    vi.advanceTimersByTime(1500);
    expect(document.title).toBe('(1) mos-lab — Wings Lashes CRM');

    // Simulate user returning to tab (focus)
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    window.dispatchEvent(new Event('focus'));

    // Should stop alternating and settle on unread count
    expect(document.title).toBe('(1) mos-lab — Wings Lashes CRM');

    vi.advanceTimersByTime(3000);
    expect(document.title).toBe('(1) mos-lab — Wings Lashes CRM');
  });

  it('updates favicon link with red badge data URL on unread count, and restores on zero', () => {
    tabNotificationManager.setUnreadCount('chat', 2);
    expect(mockFaviconLink.href).toContain('data:image/png;base64,mockBadgedFavicon');

    // Clearing unread restores original
    tabNotificationManager.setUnreadCount('chat', 0);
    expect(mockFaviconLink.href).toContain('/apple-touch-icon.png');
  });

  it('executes playMessengerChime and showDesktopNotification cleanly', () => {
    // Web Audio Mock
    const mockOscillator = {
      type: 'sine',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    const mockGain = {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    };

    function MockAudioContext(this: unknown) {
      return {
        currentTime: 0,
        destination: {},
        createOscillator: () => mockOscillator,
        createGain: () => mockGain,
      };
    }

    (window as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;

    expect(() => playMessengerChime()).not.toThrow();

    // Desktop Notification Mock
    const mockNotificationInstances: unknown[] = [];
    function MockNotification(this: unknown, title: string, options: unknown) {
      const inst = { title, options, onclick: null as unknown, close: vi.fn() };
      mockNotificationInstances.push(inst);
      return inst;
    }

    (window as unknown as { Notification: unknown }).Notification = MockNotification;
    Object.defineProperty(MockNotification, 'permission', { value: 'granted', configurable: true });

    expect(() => showDesktopNotification('Nguyễn Quang Khải', { body: 'Tin nhắn mới' })).not.toThrow();
    expect(mockNotificationInstances.length).toBe(1);
    expect(mockNotificationInstances[0]).toMatchObject({
      title: 'Nguyễn Quang Khải',
      options: expect.objectContaining({ body: 'Tin nhắn mới' }),
    });
  });
});
