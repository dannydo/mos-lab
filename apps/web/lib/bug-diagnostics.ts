import type { BugReportApiFailure, BugReportClientError, BugReportContext } from '@mos-lab/shared';

export const OPEN_BUG_REPORT_EVENT = 'mos:open-bug-report';

const API_FAILURE_STORAGE_KEY = 'mos_bug_recent_api_failures_v1';
const CLIENT_ERROR_STORAGE_KEY = 'mos_bug_recent_client_errors_v1';
const SENSITIVE_QUERY_KEY = /token|secret|password|pass|authorization|api.?key|phone|email|search|query|name/i;
const MAX_BUFFER_ITEMS = 10;

function clipped(value: unknown, maxLength: number): string {
  return Array.from(String(value ?? ''))
    .filter((character) => {
      const code = character.charCodeAt(0);
      return !(code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31));
    })
    .join('')
    .trim()
    .slice(0, maxLength);
}

function redact(value: string): string {
  return value
    .replace(/bearer\s+[a-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/\beyJ[a-z0-9_-]{8,}\.[a-z0-9_-]{8,}(?:\.[a-z0-9_-]*)?\b/gi, '[REDACTED_TOKEN]')
    .replace(
      /(token|secret|password|pass|authorization|api.?key|phone|email|search|query|name)\s*["']?\s*[:=]\s*["']?([^"'&,\s}\]]+)/gi,
      '$1=[REDACTED]'
    )
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
    .replace(/(?:\+?84|0)(?:[\s.-]?\d){8,10}\b/g, '[REDACTED_PHONE]');
}

function readBuffer<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.slice(-MAX_BUFFER_ITEMS) : [];
  } catch {
    return [];
  }
}

function writeBuffer<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    const next = [...readBuffer<T>(key), value].slice(-MAX_BUFFER_ITEMS);
    window.sessionStorage.setItem(key, JSON.stringify(next));
  } catch {
    // Diagnostics must never interrupt the employee workflow.
  }
}

function sanitizeQuery(params: URLSearchParams): Record<string, string> {
  const result: Record<string, string> = {};
  Array.from(params.entries())
    .slice(0, 30)
    .forEach(([key, value]) => {
      result[clipped(key, 80)] = SENSITIVE_QUERY_KEY.test(key) ? '[REDACTED]' : clipped(value, 200);
    });
  return result;
}

function sanitizeUrl(value: unknown): string {
  const raw = clipped(value, 800);
  if (!raw || typeof window === 'undefined') return raw.split('?')[0];
  try {
    const url = new URL(raw, window.location.origin);
    const query = sanitizeQuery(url.searchParams);
    const serialized = new URLSearchParams(query).toString();
    return `${url.pathname}${serialized ? `?${serialized}` : ''}`;
  } catch {
    return raw.split('?')[0];
  }
}

export function recordApiFailure(error: unknown): void {
  const value = error as {
    config?: { method?: string; url?: string };
    response?: { status?: number; data?: { message?: string; code?: string } };
    code?: string;
    message?: string;
  };
  const item: BugReportApiFailure = {
    occurredAt: new Date().toISOString(),
    method: clipped(value?.config?.method, 12).toUpperCase() || 'UNKNOWN',
    url: sanitizeUrl(value?.config?.url),
    status: Number.isInteger(value?.response?.status) ? Number(value.response?.status) : null,
    code: value?.response?.data?.code
      ? clipped(value.response.data.code, 80)
      : value?.code
        ? clipped(value.code, 80)
        : null,
    message: redact(clipped(value?.response?.data?.message || value?.message || 'Request failed', 500)),
  };
  writeBuffer(API_FAILURE_STORAGE_KEY, item);
}

export function toBugClientError(error: unknown): BugReportClientError {
  const value = error instanceof Error ? error : new Error(clipped(error, 1000) || 'Unknown client error');
  return {
    occurredAt: new Date().toISOString(),
    name: clipped(value.name, 100) || 'Error',
    message: redact(clipped(value.message, 1000)),
    stack: value.stack ? redact(clipped(value.stack, 4000)) : null,
  };
}

export function recordClientError(error: unknown): BugReportClientError {
  const item = toBugClientError(error);
  writeBuffer(CLIENT_ERROR_STORAGE_KEY, item);
  return item;
}

function visibleOverlayTitles(): string[] {
  if (typeof document === 'undefined') return [];
  const selectors = [
    '.ant-modal-wrap .ant-modal-title',
    '.ant-drawer-content-wrapper .ant-drawer-title',
    '[role="dialog"] [data-bug-context-title]',
  ];
  const titles = selectors.flatMap((selector) =>
    Array.from(document.querySelectorAll<HTMLElement>(selector))
      .filter((element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden')
      .map((element) => clipped(element.innerText || element.textContent, 180))
      .filter(Boolean)
  );
  return Array.from(new Set(titles)).slice(-10).reverse();
}

export function captureBugReportContext(
  release: { deployedAt: string | null; commitSha: string | null } | null,
  errorBoundary?: BugReportClientError | null
): BugReportContext {
  const html = document.documentElement;
  const themeMode = html.classList.contains('dark-theme')
    ? 'dark'
    : html.classList.contains('light-theme')
      ? 'light'
      : 'unknown';
  return {
    capturedAt: new Date().toISOString(),
    path: window.location.pathname,
    query: sanitizeQuery(new URLSearchParams(window.location.search)),
    pageTitle: clipped(document.title, 200),
    overlays: visibleOverlayTitles(),
    themeMode,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
    },
    userAgent: clipped(window.navigator.userAgent, 500),
    online: window.navigator.onLine,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh',
    webCommit: process.env.NEXT_PUBLIC_APP_COMMIT_SHA || null,
    apiCommit: release?.commitSha || null,
    apiDeployedAt: release?.deployedAt || null,
    recentApiFailures: readBuffer<BugReportApiFailure>(API_FAILURE_STORAGE_KEY),
    recentClientErrors: readBuffer<BugReportClientError>(CLIENT_ERROR_STORAGE_KEY),
    errorBoundary: errorBoundary || null,
  };
}

export function openBugReport(error?: unknown): void {
  if (typeof window === 'undefined') return;
  const detail = error ? { errorBoundary: recordClientError(error) } : {};
  window.dispatchEvent(new CustomEvent(OPEN_BUG_REPORT_EVENT, { detail }));
}
