'use client';

import type { SafeAny } from '@mos-lab/shared';

export interface TabAlertOptions {
  senderName?: string;
  snippet?: string;
  conversationName?: string;
  isDirect?: boolean;
  source?: string;
}

/**
 * TabNotificationManager
 * Handles Facebook Messenger-style browser tab notification alerts:
 * 1. "Tên của tab" (Document Title):
 *    - Alternates title every 1.5s when inactive: "💬 Danny Do đã gửi tin nhắn" <-> "(1) mOS Chat · mos-lab"
 *    - Prefixes unread count "(N)" when unread > 0
 *    - Restores base title when all unread items are cleared
 * 2. "Trên tab" (Favicon):
 *    - Dynamically renders a bright red notification dot badge at top-right corner via Canvas
 *    - Restores standard favicon when unread drops to 0
 * 3. Chime & Audio:
 *    - Synthesizes Messenger-style dual-tone message chime via Web Audio API
 */
class TabNotificationManager {
  private baseTitle: string = 'mos-lab — Wings Lashes CRM';
  private unreadBySource: Map<string, number> = new Map();
  private isAlternating: boolean = false;
  private alternateInterval: SafeAny = null;
  private alternateStep: number = 0;
  private currentAlertText: string | null = null;
  private originalFaviconHref: string = '/apple-touch-icon.png';
  private originalFaviconFound: boolean = false;
  private baseFaviconImage: HTMLImageElement | null = null;
  private isWindowFocused: boolean = true;
  private listenersAttached: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initClient();
    }
  }

  private initClient(): void {
    if (typeof document === 'undefined') return;

    if (document.title && !document.title.startsWith('(')) {
      this.baseTitle = document.title;
    }

    this.isWindowFocused = !document.hidden && document.hasFocus?.() !== false;

    if (!this.listenersAttached) {
      this.listenersAttached = true;

      window.addEventListener('focus', () => {
        this.isWindowFocused = true;
        this.stopAlternating();
        this.updateDocumentTitle();
      });

      window.addEventListener('blur', () => {
        this.isWindowFocused = false;
      });

      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.isWindowFocused = true;
          this.stopAlternating();
          this.updateDocumentTitle();
        } else {
          this.isWindowFocused = false;
        }
      });
    }

    this.resolveOriginalFavicon();
  }

  public setBaseTitle(title: string): void {
    if (!title) return;
    this.baseTitle = title.replace(/^\(\d+\)\s*/, '').trim();
    if (!this.isAlternating) {
      this.updateDocumentTitle();
    }
  }

  public getBaseTitle(): string {
    return this.baseTitle;
  }

  public setUnreadCount(source: string, count: number): void {
    const validCount = Math.max(0, count || 0);
    this.unreadBySource.set(source, validCount);

    const total = this.getTotalUnreadCount();
    if (total === 0) {
      this.stopAlternating();
    }

    this.updateDocumentTitle();
    this.updateFaviconBadge(total);
  }

  public getTotalUnreadCount(): number {
    let sum = 0;
    this.unreadBySource.forEach((val) => {
      sum += val;
    });
    return sum;
  }

  /**
   * Triggers Messenger-style tab alert when a new message/notification arrives.
   */
  public triggerAlert(options: TabAlertOptions): void {
    if (typeof window === 'undefined') return;

    const sender = options.senderName?.trim() || 'Tin nhắn mới';
    let alertMsg = '';

    if (options.snippet) {
      const cleanSnippet = options.snippet.replace(/\n+/g, ' ').trim();
      alertMsg = `💬 ${sender}: ${cleanSnippet.slice(0, 40)}`;
    } else if (options.conversationName && !options.isDirect) {
      alertMsg = `💬 [${options.conversationName}] ${sender} đã gửi tin nhắn`;
    } else {
      alertMsg = `💬 ${sender} đã gửi một tin nhắn`;
    }

    this.currentAlertText = alertMsg;

    // Start alternation if window is blurred or document is hidden
    if (!this.isWindowFocused || (typeof document !== 'undefined' && document.hidden)) {
      this.startAlternating();
    } else {
      this.updateDocumentTitle();
    }
  }

  private startAlternating(): void {
    if (this.isAlternating) return;
    this.isAlternating = true;
    this.alternateStep = 0;

    this.tickAlternating();

    this.alternateInterval = setInterval(() => {
      this.tickAlternating();
    }, 1500);
  }

  private tickAlternating(): void {
    if (typeof document === 'undefined') return;

    const total = this.getTotalUnreadCount();
    const countPrefix = total > 0 ? `(${total}) ` : '';

    if (this.alternateStep === 0 && this.currentAlertText) {
      document.title = `${countPrefix}${this.currentAlertText}`;
      this.alternateStep = 1;
    } else {
      document.title = `${countPrefix}${this.baseTitle}`;
      this.alternateStep = 0;
    }
  }

  private stopAlternating(): void {
    if (this.alternateInterval) {
      clearInterval(this.alternateInterval);
      this.alternateInterval = null;
    }
    this.isAlternating = false;
    this.currentAlertText = null;
    this.alternateStep = 0;
  }

  private updateDocumentTitle(): void {
    if (typeof document === 'undefined') return;
    if (this.isAlternating) return;

    const total = this.getTotalUnreadCount();
    if (total > 0) {
      document.title = `(${total}) ${this.baseTitle}`;
    } else {
      document.title = this.baseTitle;
    }
  }

  private resolveOriginalFavicon(): string {
    if (typeof document === 'undefined') return this.originalFaviconHref;
    const link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (link && link.href && !link.href.startsWith('data:image')) {
      this.originalFaviconHref = link.getAttribute('href') || link.href;
      this.originalFaviconFound = true;
    }
    return this.originalFaviconHref;
  }

  /**
   * Updates browser tab favicon with a dynamic red notification dot badge (like Messenger).
   */
  public updateFaviconBadge(unreadCount: number): void {
    if (typeof document === 'undefined') return;

    let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    if (!this.originalFaviconFound && link.href && !link.href.startsWith('data:image')) {
      this.originalFaviconHref = link.getAttribute('href') || link.href;
      this.originalFaviconFound = true;
    }

    if (unreadCount <= 0) {
      link.href = this.originalFaviconHref || '/apple-touch-icon.png';
      return;
    }

    // Render Canvas with base icon + red notification dot
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const drawBadgeOnCanvas = (baseImg?: HTMLImageElement) => {
        ctx.clearRect(0, 0, 32, 32);

        if (baseImg && baseImg.complete && baseImg.naturalWidth > 0) {
          ctx.drawImage(baseImg, 0, 0, 32, 32);
        } else {
          // Fallback crisp stylish mOS base icon
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(16, 16, 15, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('m', 16, 17);
        }

        // Messenger-style bright red notification circle with clean border
        const badgeX = 24;
        const badgeY = 8;
        const badgeRadius = 6.5;

        // Subtle shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;

        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444'; // Bright Red
        ctx.fill();

        // White border
        ctx.shadowColor = 'transparent';
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        link!.href = canvas.toDataURL('image/png');
      };

      if (!this.baseFaviconImage) {
        // Draw badge immediately with fallback graphic for instant response
        drawBadgeOnCanvas();

        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            this.baseFaviconImage = img;
            drawBadgeOnCanvas(img);
          };
          img.src = this.originalFaviconHref || '/apple-touch-icon.png';
        } catch {
          // ignore
        }
      } else {
        drawBadgeOnCanvas(this.baseFaviconImage);
      }
    } catch {
      // Fallback
    }
  }

  /**
   * Resets all tab notifications (e.g. on logout or test cleanup)
   */
  public reset(): void {
    this.stopAlternating();
    this.unreadBySource.clear();
    this.updateDocumentTitle();
    this.updateFaviconBadge(0);
  }
}

export const tabNotificationManager = new TabNotificationManager();

/**
 * Messenger-style dual-tone message chime via Web Audio API.
 * High-definition, pleasant sine wave pop/chime.
 */
export function playMessengerChime(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as SafeAny).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Tone 1: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Tone 2: 880 Hz (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.08);
    gain2.gain.setValueAtTime(0.12, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.35);
  } catch {
    // Non-blocking
  }
}

/**
 * Desktop notification options with chat routing support.
 */
export interface DesktopNotificationOptions extends NotificationOptions {
  conversationId?: string;
  messageId?: string;
  onClick?: (e: Event) => void;
}

/**
 * Native desktop notification wrapper with click-to-focus and chat conversation deep-linking (MOS-BUG-141).
 */
export function showDesktopNotification(title: string, options?: DesktopNotificationOptions): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      const n = new Notification(title, {
        icon: '/apple-touch-icon.png',
        badge: '/apple-touch-icon.png',
        ...options,
      });
      n.onclick = (e: Event) => {
        try {
          window.focus();
        } catch {
          // ignore
        }
        if (options?.conversationId) {
          window.dispatchEvent(
            new CustomEvent('mos-chat:open', {
              detail: {
                conversationId: options.conversationId,
                messageId: options.messageId,
              },
            })
          );
        }
        if (options?.onClick) {
          try {
            options.onClick(e);
          } catch {
            // non-blocking
          }
        }
        try {
          n.close();
        } catch {
          // non-blocking
        }
      };
    } catch {
      // Non-blocking
    }
  }
}
