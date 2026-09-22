import type {
  FrontendIssueClientContext,
  FrontendIssuePayload,
  FrontendIssueType,
  UserBreadcrumb,
} from '@mos-lab/shared';
import { resolveApiBaseUrl } from '../api-base-url';

const MAX_BREADCRUMBS = 25;
const RAGE_CLICK_THRESHOLD = 3;
const RAGE_CLICK_WINDOW_MS = 1000;
const ISSUE_THROTTLE_MS = 30000;

// In-memory circular buffer for user interaction breadcrumbs
const breadcrumbsBuffer: UserBreadcrumb[] = [];

// Track recent clicks for Rage Click detection
let lastClickTarget = '';
let clickCountInWindow = 0;
let lastClickTime = 0;

// Throttle sent issues by fingerprint
const recentIssueFingerprints = new Map<string, number>();

function getSafePath(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname || '/';
}

function getSafePageTitle(): string {
  if (typeof document === 'undefined') return '';
  return (document.title || '').slice(0, 150);
}

function redact(text: string): string {
  if (!text) return '';
  return text
    .replace(/bearer\s+[a-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/\beyJ[a-z0-9_-]{8,}\.[a-z0-9_-]{8,}(?:\.[a-z0-9_-]*)?\b/gi, '[REDACTED_TOKEN]')
    .replace(/(?:\+?84|0)(?:[\s.-]?\d){8,10}\b/g, '[REDACTED_PHONE]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]');
}

export function recordBreadcrumb(
  category: UserBreadcrumb['category'],
  action: UserBreadcrumb['action'],
  target?: string,
  metadata?: Record<string, unknown>
): void {
  const breadcrumb: UserBreadcrumb = {
    timestamp: new Date().toISOString(),
    category,
    action,
    target: target ? redact(target.slice(0, 100)) : undefined,
    path: getSafePath(),
    metadata,
  };

  breadcrumbsBuffer.push(breadcrumb);
  if (breadcrumbsBuffer.length > MAX_BREADCRUMBS) {
    breadcrumbsBuffer.shift();
  }
}

export function getRecentBreadcrumbs(): UserBreadcrumb[] {
  return [...breadcrumbsBuffer];
}

function computeFingerprint(issueType: FrontendIssueType, path: string, key?: string): string {
  const raw = `${issueType}:${path}:${key || ''}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}

function getClientContext(): FrontendIssueClientContext {
  if (typeof window === 'undefined') {
    return {
      viewport: { width: 0, height: 0, devicePixelRatio: 1 },
      userAgent: 'ssr',
      online: true,
      timeZone: 'Asia/Ho_Chi_Minh',
    };
  }

  const html = document.documentElement;
  const themeMode = html.classList.contains('dark-theme')
    ? 'dark'
    : html.classList.contains('light-theme')
      ? 'light'
      : undefined;

  return {
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
    },
    userAgent: (window.navigator.userAgent || '').slice(0, 300),
    online: window.navigator.onLine,
    themeMode,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh',
  };
}

function getUserIdentity(): { userId?: number | null; userName?: string | null; userRole?: string | null } {
  if (typeof window === 'undefined') return {};
  try {
    const rawUser = window.localStorage.getItem('mos_user') || window.sessionStorage.getItem('mos_user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      return {
        userId: parsed.id ? Number(parsed.id) : null,
        userName: parsed.displayName || parsed.fullName || parsed.username || null,
        userRole: parsed.role || null,
      };
    }
  } catch {
    // Non-blocking
  }
  return {};
}

export function reportFrontendIssue(params: {
  issueType: FrontendIssueType;
  message?: string;
  error?: { name: string; message: string; stack?: string | null } | null;
  target?: string;
  metadata?: Record<string, unknown>;
}): void {
  if (typeof window === 'undefined') return;

  const path = getSafePath();
  const fingerprint = computeFingerprint(
    params.issueType,
    path,
    params.error?.name || params.target || params.message || ''
  );

  const now = Date.now();
  const lastSent = recentIssueFingerprints.get(fingerprint);
  if (lastSent && now - lastSent < ISSUE_THROTTLE_MS) {
    // Throttled: same issue on same page within 30s
    return;
  }
  recentIssueFingerprints.set(fingerprint, now);

  const identity = getUserIdentity();
  const payload: FrontendIssuePayload = {
    issueId: `iss_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    fingerprint,
    issueType: params.issueType,
    occurredAt: new Date().toISOString(),
    userId: identity.userId,
    userName: identity.userName,
    userRole: identity.userRole,
    path,
    pageTitle: getSafePageTitle(),
    breadcrumbs: getRecentBreadcrumbs(),
    error: params.error
      ? {
          name: params.error.name.slice(0, 100),
          message: redact(params.error.message.slice(0, 1000)),
          stack: params.error.stack ? redact(params.error.stack.slice(0, 2000)) : null,
        }
      : params.message
        ? {
            name: params.issueType,
            message: redact(params.message.slice(0, 500)),
          }
        : null,
    clientContext: getClientContext(),
    metadata: params.metadata,
  };

  // Dispatch via navigator.sendBeacon or non-blocking fetch
  try {
    const json = JSON.stringify(payload);
    const url = `${resolveApiBaseUrl()}/telemetry/frontend-issues`;
    if (navigator.sendBeacon) {
      const blob = new Blob([json], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
        keepalive: true,
      }).catch(() => {
        // Telemetry must never throw
      });
    }
  } catch {
    // Silently ignore telemetry transmission errors
  }
}

function getElementDescriptor(element: HTMLElement | null): string {
  if (!element) return 'unknown';
  const tag = element.tagName.toLowerCase();

  // Find meaningful text or label
  const ariaLabel = element.getAttribute('aria-label') || element.getAttribute('title');
  const innerText = (element.innerText || element.textContent || '').trim().slice(0, 40);
  const name = element.getAttribute('name') || element.getAttribute('id');
  const role = element.getAttribute('role');

  const desc = ariaLabel || innerText || name || role || tag;
  return `${tag}${desc ? `[${desc}]` : ''}`;
}

export const CHUNK_RELOAD_STORAGE_KEY = 'mos_chunk_reload_ts';
export const CHUNK_RELOAD_COOLDOWN_MS = 15000;

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const errObj = error as { name?: string; message?: string; reason?: unknown };
  const name = String(errObj.name || (errObj.reason && (errObj.reason as { name?: string }).name) || '');
  const message = String(
    errObj.message ||
      (errObj.reason && (errObj.reason as { message?: string }).message) ||
      errObj.reason ||
      error
  );
  const combined = `${name} ${message}`;
  return (
    /ChunkLoadError/i.test(combined) ||
    /Loading chunk [\w-]+ failed/i.test(combined) ||
    /Failed to load chunk/i.test(combined) ||
    /CSS_CHUNK_LOAD_FAILED/i.test(combined) ||
    /Failed to fetch dynamically imported module/i.test(combined) ||
    /Loading CSS chunk/i.test(combined)
  );
}

export function handleAutoChunkReload(error: unknown): boolean {
  if (typeof window === 'undefined') return false;
  if (!isChunkLoadError(error)) return false;

  const win = window as unknown as { __mos_chunk_reloading?: boolean };
  if (win.__mos_chunk_reloading) return true;

  try {
    const lastReloadStr = window.sessionStorage?.getItem(CHUNK_RELOAD_STORAGE_KEY);
    const now = Date.now();
    if (lastReloadStr) {
      const lastReload = parseInt(lastReloadStr, 10);
      if (!isNaN(lastReload) && now - lastReload < CHUNK_RELOAD_COOLDOWN_MS) {
        console.warn(
          '[ChunkReloader] ChunkLoadError detected, but reload cooldown is active. Skipping infinite reload loop.'
        );
        return false;
      }
    }

    window.sessionStorage?.setItem(CHUNK_RELOAD_STORAGE_KEY, String(now));
    win.__mos_chunk_reloading = true;
    console.warn('[ChunkReloader] Obsolete chunk detected. Automatically reloading page once to fetch latest build...');
    window.location.reload();
    return true;
  } catch (e) {
    console.error('[ChunkReloader] Auto-reload failed:', e);
    return false;
  }
}

function handleClick(event: MouseEvent): void {
  const target = event.target as HTMLElement | null;
  if (!target) return;

  // Find clickable parent if clicked on svg/icon/span
  const clickable = target.closest<HTMLElement>(
    'button, a, [role="button"], input[type="submit"], input[type="button"], .ant-btn, .ant-tabs-tab, .clickable-action'
  );

  // Active micro-interaction tactile feedback (MOS-BUG-46)
  if (clickable && !clickable.hasAttribute('disabled') && !clickable.getAttribute('aria-disabled')) {
    clickable.classList.remove('mos-active-tap');
    // Force reflow to restart CSS pulse animation if clicked in rapid succession
    void clickable.offsetWidth;
    clickable.classList.add('mos-active-tap');
    setTimeout(() => {
      clickable.classList.remove('mos-active-tap');
    }, 350);
  }

  const descriptor = getElementDescriptor(clickable || target);

  recordBreadcrumb('ui', 'click', descriptor);

  // Exclude non-action targets from rage-click detection:
  // 1. Text/search inputs where double/triple click is standard for text selection
  // 2. Numeric steppers/handlers where rapid clicking is intended to increase/decrease values
  const isTextInput =
    target instanceof HTMLInputElement &&
    ['text', 'search', 'password', 'email', 'number', 'tel', 'url'].includes(target.type);
  const isTextArea = target instanceof HTMLTextAreaElement || target.isContentEditable;
  const isStepperHandler =
    Boolean(target.closest('.ant-input-number-handler, .ant-input-number-handler-up, .ant-input-number-handler-down')) ||
    /decrease|increase|stepper/i.test(descriptor);

  if (isTextInput || isTextArea || isStepperHandler) {
    lastClickTarget = descriptor;
    clickCountInWindow = 1;
    lastClickTime = Date.now();
    return;
  }

  // Rage Click Heuristics for action elements
  const now = Date.now();
  if (descriptor === lastClickTarget && now - lastClickTime < RAGE_CLICK_WINDOW_MS) {
    clickCountInWindow++;
    if (clickCountInWindow >= RAGE_CLICK_THRESHOLD) {
      reportFrontendIssue({
        issueType: 'RAGE_CLICK',
        target: descriptor,
        message: `User clicked '${descriptor}' ${clickCountInWindow} times rapidly within 1 second. Possible frozen UI or unresponsive action.`,
        metadata: { clickCount: clickCountInWindow },
      });
      // Reset after reporting
      clickCountInWindow = 0;
    }
  } else {
    lastClickTarget = descriptor;
    clickCountInWindow = 1;
  }
  lastClickTime = now;
}

function handleWindowError(event: ErrorEvent): void {
  // Ignore harmless cross-origin resize observer loops
  if (event.message && /ResizeObserver loop limit exceeded/i.test(event.message)) {
    return;
  }

  // Check for failed resource chunk loads (e.g. <script> or <link>)
  const target = event.target as HTMLElement | null;
  if (target && target !== (window as unknown as HTMLElement)) {
    const tagName = target.tagName?.toUpperCase();
    const src = target.getAttribute?.('src') || target.getAttribute?.('href') || '';
    if ((tagName === 'SCRIPT' || tagName === 'LINK') && src.includes('/_next/static/')) {
      recordBreadcrumb('network', 'error', 'Script/Link chunk load failed', { src });
      handleAutoChunkReload(`Failed to load chunk asset: ${src}`);
      return;
    }
  }

  // Check if standard error event is a ChunkLoadError
  const errorObj = event.error || event.message;
  if (isChunkLoadError(errorObj)) {
    recordBreadcrumb('console', 'error', 'Window ChunkLoadError', { message: event.message });
    handleAutoChunkReload(errorObj);
  }

  recordBreadcrumb('console', 'error', 'Window Error', { message: event.message });

  reportFrontendIssue({
    issueType: 'UNCAUGHT_EXCEPTION',
    error: {
      name: event.error?.name || 'Error',
      message: event.message || String(event.error),
      stack: event.error?.stack || null,
    },
  });
}

function handleUnhandledRejection(event: PromiseRejectionEvent): void {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason);

  if (isChunkLoadError(reason)) {
    recordBreadcrumb('console', 'error', 'Unhandled Promise ChunkLoadError', { message });
    handleAutoChunkReload(reason);
  }

  recordBreadcrumb('console', 'error', 'Unhandled Promise Rejection', { message });

  reportFrontendIssue({
    issueType: 'UNCAUGHT_EXCEPTION',
    error: {
      name: reason instanceof Error ? reason.name : 'UnhandledRejection',
      message: message || 'Unhandled promise rejection',
      stack: reason instanceof Error ? reason.stack || null : null,
    },
  });
}

let isInitialized = false;

export function initFrontendObserver(): () => void {
  if (typeof window === 'undefined' || isInitialized) {
    return () => {};
  }

  isInitialized = true;

  // Record initial navigation breadcrumb
  recordBreadcrumb('navigation', 'route_change', getSafePath(), { title: getSafePageTitle() });

  // Attach global listeners with capture to ensure we see events before propagation stops
  window.addEventListener('click', handleClick, { capture: true, passive: true });
  window.addEventListener('error', handleWindowError, true);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  return () => {
    window.removeEventListener('click', handleClick, { capture: true });
    window.removeEventListener('error', handleWindowError, true);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    isInitialized = false;
  };
}
