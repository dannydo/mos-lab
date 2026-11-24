'use client';

export const MOS_CHAT_OPEN_OMICALL_DIALER_EVENT = 'mos-chat:open-omicall-dialer';
const RECENT_DIALS_STORAGE_PREFIX = 'mos_chat_omicall_recent_dials_v1';
const MAX_RECENT_DIALS = 8;

export interface MosChatOmiCallDialerPrefill {
  phone?: string;
  name?: string;
  customerId?: number;
  avatar?: string | null;
}

export interface RecentMosChatDial {
  phone: string;
  name?: string;
  customerId?: number;
  avatar?: string | null;
  dialedAt: number;
}

/**
 * Regex source for detecting unmasked Vietnamese mobile/landline phone numbers inside chat messages.
 * Matched after URLs, markdown links, HTML tags, code spans, math, and @mentions so those stay intact.
 */
export const VN_PHONE_INLINE_PATTERN =
  '((?<![0-9A-Za-z._/-])(?:\\+?84[\\s.-]?|0)(?:3|5|7|8|9|2\\d)(?:[\\s.-]?\\d){7,8}(?![0-9A-Za-z]))';

export function dispatchOpenMosChatOmiCallDialer(prefill?: MosChatOmiCallDialerPrefill): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<MosChatOmiCallDialerPrefill>(MOS_CHAT_OPEN_OMICALL_DIALER_EVENT, {
      detail: prefill || {},
    })
  );
}

export function normalizeVietnamDialPhone(raw: string): string {
  const digits = String(raw || '')
    .trim()
    .replace(/[^0-9]/g, '');

  if (/^84[35789]\d{8}$/.test(digits) || /^842\d{9}$/.test(digits)) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

export function isValidDialablePhone(raw: string | null | undefined): boolean {
  if (!raw || typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.includes('*') || trimmed.includes('/')) return false;
  if (/^\d{4}[-.]\d{1,2}[-.]\d{1,2}$/.test(trimmed) || /^\d{1,2}[-.]\d{1,2}[-.]\d{4}$/.test(trimmed)) {
    return false;
  }

  const normalized = normalizeVietnamDialPhone(trimmed);
  if (!normalized) return false;

  // Standard Vietnam mobile (10 digits starting with 03/05/07/08/09) or landline (11 digits starting with 02)
  if (normalized.startsWith('0')) {
    return /^0(?:[35789]\d{8}|2\d{9})$/.test(normalized) || /^00\d{7,13}$/.test(normalized);
  }

  // Vietnam toll-free / hotline (1800 / 1900 with 8-10 digits)
  if (/^1[89]00\d{4,6}$/.test(normalized)) {
    return true;
  }

  // International phone numbers must explicitly carry '+' or '84' prefix
  if (trimmed.startsWith('+') || normalized.startsWith('84')) {
    return normalized.length >= 8 && normalized.length <= 15;
  }

  return false;
}

export function formatDisplayPhone(raw: string): string {
  const normalized = normalizeVietnamDialPhone(raw);
  if (/^0[35789]\d{8}$/.test(normalized)) {
    return `${normalized.slice(0, 4)} ${normalized.slice(4, 7)} ${normalized.slice(7)}`;
  }
  if (/^02\d{9}$/.test(normalized)) {
    return `${normalized.slice(0, 4)} ${normalized.slice(4, 7)} ${normalized.slice(7)}`;
  }
  if (/^1[89]00\d{4}$/.test(normalized)) {
    return `${normalized.slice(0, 4)} ${normalized.slice(4)}`;
  }
  return normalized || String(raw || '').trim();
}

function getRecentDialsStorageKey(userKey?: string | number | null): string {
  const cleanKey = userKey != null && String(userKey).trim() ? String(userKey).trim() : 'anon';
  return `${RECENT_DIALS_STORAGE_PREFIX}:${cleanKey}`;
}

export function readRecentMosChatDials(userKey?: string | number | null): RecentMosChatDial[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(getRecentDialsStorageKey(userKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.phone === 'string' && isValidDialablePhone(item.phone))
      .slice(0, MAX_RECENT_DIALS);
  } catch {
    return [];
  }
}

export function saveRecentMosChatDial(
  userKey: string | number | null | undefined,
  entry: Omit<RecentMosChatDial, 'dialedAt'>
): RecentMosChatDial[] {
  const normalizedPhone = normalizeVietnamDialPhone(entry.phone);
  if (!normalizedPhone) return readRecentMosChatDials(userKey);

  const nextEntry: RecentMosChatDial = {
    phone: normalizedPhone,
    name: entry.name || undefined,
    customerId: entry.customerId,
    avatar: entry.avatar ?? null,
    dialedAt: Date.now(),
  };

  const existing = readRecentMosChatDials(userKey).filter(
    (item) => normalizeVietnamDialPhone(item.phone) !== normalizedPhone
  );
  const nextList = [nextEntry, ...existing].slice(0, MAX_RECENT_DIALS);

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(getRecentDialsStorageKey(userKey), JSON.stringify(nextList));
    } catch {
      // ignore storage quota errors
    }
  }
  return nextList;
}

export function clearRecentMosChatDials(userKey?: string | number | null): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(getRecentDialsStorageKey(userKey));
  } catch {
    // ignore
  }
}
