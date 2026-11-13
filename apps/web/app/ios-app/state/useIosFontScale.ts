import { useCallback, useEffect, useState } from 'react';

export const IOS_FONT_SCALE_STEPS = [0.75, 0.8, 0.85, 0.92, 1.0, 1.08, 1.16] as const;
export type IosFontScale = (typeof IOS_FONT_SCALE_STEPS)[number];

export const DEFAULT_IOS_FONT_SCALE: IosFontScale = 0.85;
export const DEFAULT_IOS_FONT_SCALE_INDEX = 2;

const IOS_FONT_SCALE_EVENT = 'mos-ios-font-scale-change';
const GUEST_FONT_SCALE_KEY = 'mos_ios_font_scale:guest';

/**
 * Resolves the per-user localStorage key for iOS App typography scale so
 * each logged-in staff member retains their personal text size across reloads.
 */
export function resolvePersonalFontScaleKey(staffId?: number): string {
  if (typeof window === 'undefined') return GUEST_FONT_SCALE_KEY;
  try {
    const rawUser = window.localStorage.getItem('mos_user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser) as Record<string, unknown>;
      const userKey = parsed?.id ?? parsed?.username ?? parsed?.legacyStaffId ?? staffId;
      if (userKey !== undefined && userKey !== null && String(userKey).trim() !== '') {
        return `mos_ios_font_scale:user:${String(userKey).trim()}`;
      }
    }
  } catch {
    // Ignore malformed localStorage payload and fall back to staffId / guest key
  }

  if (typeof staffId === 'number' && Number.isFinite(staffId) && staffId > 0) {
    return `mos_ios_font_scale:user:${staffId}`;
  }
  return GUEST_FONT_SCALE_KEY;
}

/**
 * Snaps any persisted numeric scale to the closest supported Apple Dynamic Type step.
 */
export function normalizeIosFontScale(rawValue: unknown): IosFontScale {
  const num = typeof rawValue === 'number' ? rawValue : Number.parseFloat(String(rawValue ?? ''));
  if (!Number.isFinite(num) || num < 0.7 || num > 1.25) {
    return DEFAULT_IOS_FONT_SCALE;
  }

  let closest: IosFontScale = DEFAULT_IOS_FONT_SCALE;
  let minDiff = Number.POSITIVE_INFINITY;
  for (const step of IOS_FONT_SCALE_STEPS) {
    const diff = Math.abs(step - num);
    if (diff < minDiff) {
      minDiff = diff;
      closest = step;
    }
  }
  return closest;
}

/**
 * Reads the persisted font scale for the active user, defaulting to 85% (0.85).
 */
export function readStoredIosFontScale(staffId?: number): IosFontScale {
  if (typeof window === 'undefined') return DEFAULT_IOS_FONT_SCALE;
  try {
    const key = resolvePersonalFontScaleKey(staffId);
    const raw = window.localStorage.getItem(key);
    if (!raw) return DEFAULT_IOS_FONT_SCALE;
    return normalizeIosFontScale(raw);
  } catch {
    return DEFAULT_IOS_FONT_SCALE;
  }
}

/**
 * Applies `--ios-font-scale` on the document root, persists to per-user storage,
 * and broadcasts the update across mounted `/ios-app` components.
 */
export function writeIosFontScale(nextScale: IosFontScale, staffId?: number): void {
  if (typeof window === 'undefined') return;
  const normalized = normalizeIosFontScale(nextScale);
  const key = resolvePersonalFontScaleKey(staffId);

  try {
    window.localStorage.setItem(key, String(normalized));
  } catch {
    // Storage quota or privacy mode failure should not break live CSS scaling
  }

  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--ios-font-scale', String(normalized));
  }

  window.dispatchEvent(
    new CustomEvent<{ scale: IosFontScale; key: string }>(IOS_FONT_SCALE_EVENT, {
      detail: { scale: normalized, key },
    })
  );
}

/**
 * React hook managing personal `/ios-app` font scale with immediate live CSS
 * updates and localStorage persistence across page reloads (F5).
 */
export function useIosFontScale(staffId?: number) {
  const [fontScale, setFontScaleState] = useState<IosFontScale>(() => readStoredIosFontScale(staffId));

  useEffect(() => {
    const stored = readStoredIosFontScale(staffId);
    setFontScaleState(stored);
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--ios-font-scale', String(stored));
    }

    const handleCustomChange = (event: Event) => {
      const custom = event as CustomEvent<{ scale?: IosFontScale; key?: string }>;
      const activeKey = resolvePersonalFontScaleKey(staffId);
      if (!custom.detail?.key || custom.detail.key === activeKey) {
        const next = custom.detail?.scale
          ? normalizeIosFontScale(custom.detail.scale)
          : readStoredIosFontScale(staffId);
        setFontScaleState(next);
        if (typeof document !== 'undefined') {
          document.documentElement.style.setProperty('--ios-font-scale', String(next));
        }
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === resolvePersonalFontScaleKey(staffId) || event.key === 'mos_user') {
        const next = readStoredIosFontScale(staffId);
        setFontScaleState(next);
        if (typeof document !== 'undefined') {
          document.documentElement.style.setProperty('--ios-font-scale', String(next));
        }
      }
    };

    window.addEventListener(IOS_FONT_SCALE_EVENT, handleCustomChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(IOS_FONT_SCALE_EVENT, handleCustomChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [staffId]);

  const stepIndex = Math.max(0, IOS_FONT_SCALE_STEPS.indexOf(fontScale));

  const setFontScale = useCallback(
    (nextScale: IosFontScale) => {
      const normalized = normalizeIosFontScale(nextScale);
      setFontScaleState(normalized);
      writeIosFontScale(normalized, staffId);
    },
    [staffId]
  );

  const setStepIndex = useCallback(
    (nextIndex: number) => {
      const clamped = Math.min(IOS_FONT_SCALE_STEPS.length - 1, Math.max(0, Math.round(nextIndex)));
      setFontScale(IOS_FONT_SCALE_STEPS[clamped]);
    },
    [setFontScale]
  );

  const decreaseStep = useCallback(() => {
    setStepIndex(stepIndex - 1);
  }, [setStepIndex, stepIndex]);

  const increaseStep = useCallback(() => {
    setStepIndex(stepIndex + 1);
  }, [setStepIndex, stepIndex]);

  const resetFontScale = useCallback(() => {
    setFontScale(DEFAULT_IOS_FONT_SCALE);
  }, [setFontScale]);

  return {
    fontScale,
    stepIndex,
    percentLabel: `${Math.round(fontScale * 100)}%`,
    isDefault: fontScale === DEFAULT_IOS_FONT_SCALE,
    canDecrease: stepIndex > 0,
    canIncrease: stepIndex < IOS_FONT_SCALE_STEPS.length - 1,
    setFontScale,
    setStepIndex,
    decreaseStep,
    increaseStep,
    resetFontScale,
  };
}
