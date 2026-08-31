import { safeStorage } from './safe-storage';

export const BUG_REPORT_LAUNCHER_STORAGE_KEY = 'mos_bug_report_launcher_preferences_v1';
export const BUG_REPORT_LAUNCHER_PREFERENCES_EVENT = 'mos-bug-report-launcher-preferences-changed';

export interface BugReportLauncherPosition {
  x: number;
  y: number;
}

export interface BugReportLauncherPreferences {
  visible: boolean;
  position: BugReportLauncherPosition | null;
}

export const DEFAULT_BUG_REPORT_LAUNCHER_PREFERENCES: BugReportLauncherPreferences = {
  visible: true,
  position: null,
};

const preferenceListeners = new Set<() => void>();
let detachBrowserListeners: (() => void) | null = null;

function emitPreferenceChange() {
  preferenceListeners.forEach((listener) => listener());
}

function attachBrowserListeners() {
  if (typeof window === 'undefined' || detachBrowserListeners) return;
  const onStorage = (event: StorageEvent) => {
    if (event.key === BUG_REPORT_LAUNCHER_STORAGE_KEY) emitPreferenceChange();
  };
  window.addEventListener(BUG_REPORT_LAUNCHER_PREFERENCES_EVENT, emitPreferenceChange);
  window.addEventListener('storage', onStorage);
  detachBrowserListeners = () => {
    window.removeEventListener(BUG_REPORT_LAUNCHER_PREFERENCES_EVENT, emitPreferenceChange);
    window.removeEventListener('storage', onStorage);
    detachBrowserListeners = null;
  };
}

function parsePosition(value: unknown): BugReportLauncherPosition | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<BugReportLauncherPosition>;
  if (!Number.isFinite(candidate.x) || !Number.isFinite(candidate.y)) return null;
  return { x: Number(candidate.x), y: Number(candidate.y) };
}

export function parseBugReportLauncherPreferences(value: string | null): BugReportLauncherPreferences {
  if (!value) return DEFAULT_BUG_REPORT_LAUNCHER_PREFERENCES;
  try {
    const parsed = JSON.parse(value) as Partial<BugReportLauncherPreferences>;
    return {
      visible: typeof parsed.visible === 'boolean' ? parsed.visible : true,
      position: parsePosition(parsed.position),
    };
  } catch {
    return DEFAULT_BUG_REPORT_LAUNCHER_PREFERENCES;
  }
}

export function readBugReportLauncherPreferences(): BugReportLauncherPreferences {
  return parseBugReportLauncherPreferences(safeStorage.getItem(BUG_REPORT_LAUNCHER_STORAGE_KEY));
}

export function updateBugReportLauncherPreferences(
  patch: Partial<BugReportLauncherPreferences>
): BugReportLauncherPreferences {
  const current = readBugReportLauncherPreferences();
  const next: BugReportLauncherPreferences = {
    visible: typeof patch.visible === 'boolean' ? patch.visible : current.visible,
    position: patch.position === undefined ? current.position : parsePosition(patch.position),
  };
  safeStorage.setItem(BUG_REPORT_LAUNCHER_STORAGE_KEY, JSON.stringify(next));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(BUG_REPORT_LAUNCHER_PREFERENCES_EVENT));
  }
  return next;
}

export function subscribeBugReportLauncherPreferences(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  preferenceListeners.add(listener);
  attachBrowserListeners();
  return () => {
    preferenceListeners.delete(listener);
    if (!preferenceListeners.size) detachBrowserListeners?.();
  };
}

export function clampBugReportLauncherPosition(
  position: BugReportLauncherPosition,
  viewport: { width: number; height: number },
  launcherSize = 44,
  margin = 12
): BugReportLauncherPosition {
  const maxX = Math.max(margin, viewport.width - launcherSize - margin);
  const maxY = Math.max(margin, viewport.height - launcherSize - margin);
  return {
    x: Math.max(margin, Math.min(maxX, position.x)),
    y: Math.max(margin, Math.min(maxY, position.y)),
  };
}
