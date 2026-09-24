import { describe, expect, it } from 'vitest';
import {
  AI_LAUNCHER_MARGIN,
  AI_LAUNCHER_SIZE,
  clampAiLauncherPosition,
  parseAiLauncherPosition,
} from '../ai-assistant-launcher';

describe('ai-assistant-launcher utilities', () => {
  it('parses valid position objects and JSON strings', () => {
    expect(parseAiLauncherPosition({ x: 150, y: 320 })).toEqual({ x: 150, y: 320 });
    expect(parseAiLauncherPosition(JSON.stringify({ x: 80, y: 190 }))).toEqual({ x: 80, y: 190 });
  });

  it('safely handles invalid or corrupted position data', () => {
    expect(parseAiLauncherPosition(null)).toBeNull();
    expect(parseAiLauncherPosition(undefined)).toBeNull();
    expect(parseAiLauncherPosition('{bad json')).toBeNull();
    expect(parseAiLauncherPosition({ x: 'invalid', y: 100 })).toBeNull();
    expect(parseAiLauncherPosition({ x: 100, y: NaN })).toBeNull();
  });

  it('clamps coordinates within viewport boundaries respecting margins', () => {
    const viewport = { width: 1200, height: 800 };
    // Clamping negative coordinates
    expect(clampAiLauncherPosition({ x: -100, y: -50 }, viewport)).toEqual({
      x: AI_LAUNCHER_MARGIN,
      y: AI_LAUNCHER_MARGIN,
    });

    // Clamping coordinates exceeding viewport
    const expectedMaxX = 1200 - AI_LAUNCHER_SIZE - AI_LAUNCHER_MARGIN;
    const expectedMaxY = 800 - AI_LAUNCHER_SIZE - AI_LAUNCHER_MARGIN;
    expect(clampAiLauncherPosition({ x: 2000, y: 1500 }, viewport)).toEqual({
      x: expectedMaxX,
      y: expectedMaxY,
    });

    // Valid coordinates inside bounds remain unchanged
    expect(clampAiLauncherPosition({ x: 400, y: 500 }, viewport)).toEqual({
      x: 400,
      y: 500,
    });
  });
});
