import { safeStorage } from './safe-storage';

export const AI_LAUNCHER_STORAGE_KEY = 'mos_ai_copilot_launcher_position_v1';
export const AI_LAUNCHER_POSITION_EVENT = 'mos-ai-copilot-launcher-position-changed';

export const AI_LAUNCHER_SIZE = 48;
export const AI_LAUNCHER_MARGIN = 12;
export const DRAG_THRESHOLD = 4;

export interface AiLauncherPosition {
  x: number;
  y: number;
}

export function parseAiLauncherPosition(value: unknown): AiLauncherPosition | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parseAiLauncherPosition(parsed);
    } catch {
      return null;
    }
  }
  if (typeof value !== 'object') return null;
  const candidate = value as Partial<AiLauncherPosition>;
  if (!Number.isFinite(candidate.x) || !Number.isFinite(candidate.y)) return null;
  return { x: Number(candidate.x), y: Number(candidate.y) };
}

export function readAiLauncherPosition(): AiLauncherPosition | null {
  const raw = safeStorage.getItem(AI_LAUNCHER_STORAGE_KEY);
  return parseAiLauncherPosition(raw);
}

export function persistAiLauncherPosition(position: AiLauncherPosition): void {
  safeStorage.setItem(AI_LAUNCHER_STORAGE_KEY, JSON.stringify(position));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AI_LAUNCHER_POSITION_EVENT));
  }
}

export function clampAiLauncherPosition(
  position: AiLauncherPosition,
  viewport: { width: number; height: number },
  launcherSize = AI_LAUNCHER_SIZE,
  margin = AI_LAUNCHER_MARGIN
): AiLauncherPosition {
  const width = viewport.width > 0 ? viewport.width : 1024;
  const height = viewport.height > 0 ? viewport.height : 768;
  const maxX = Math.max(margin, width - launcherSize - margin);
  const maxY = Math.max(margin, height - launcherSize - margin);
  return {
    x: Math.max(margin, Math.min(maxX, Math.round(position.x))),
    y: Math.max(margin, Math.min(maxY, Math.round(position.y))),
  };
}

export function subscribeAiLauncherPosition(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === AI_LAUNCHER_STORAGE_KEY) listener();
  };
  window.addEventListener(AI_LAUNCHER_POSITION_EVENT, listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(AI_LAUNCHER_POSITION_EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}
