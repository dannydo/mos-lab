/**
 * Safe LocalStorage & SessionStorage Helpers
 * Prevents SecurityError / DOMException crashes on Chromebooks, managed browsers, or incognito mode.
 */

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`[safeStorage] getItem failed for key "${key}":`, e);
    }
    return null;
  },

  setItem(key: string, value: string): boolean {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return true;
      }
    } catch (e) {
      console.warn(`[safeStorage] setItem failed for key "${key}":`, e);
    }
    return false;
  },

  removeItem(key: string): boolean {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return true;
      }
    } catch (e) {
      console.warn(`[safeStorage] removeItem failed for key "${key}":`, e);
    }
    return false;
  },

  clear(): boolean {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
        return true;
      }
    } catch (e) {
      console.warn('[safeStorage] clear failed:', e);
    }
    return false;
  },
};
