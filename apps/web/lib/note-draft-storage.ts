/**
 * Safe sessionStorage helpers for preserving in-progress note drafts across
 * accidental modal closes, tab switches, or unexpected page resets.
 */

export function readSessionDraft<T>(key: string | null): T | null {
  if (!key || typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage?.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeSessionDraft<T>(key: string | null, value: T): void {
  if (!key || typeof window === 'undefined') return;
  try {
    window.sessionStorage?.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota or restricted-mode errors
  }
}

export function clearSessionDraft(key: string | null): void {
  if (!key || typeof window === 'undefined') return;
  try {
    window.sessionStorage?.removeItem(key);
  } catch {
    // Ignore restricted-mode errors
  }
}
