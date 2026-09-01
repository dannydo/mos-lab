import { expect, test } from 'vitest';
import {
  DEFAULT_BUG_REPORT_LAUNCHER_PREFERENCES,
  clampBugReportLauncherPosition,
  parseBugReportLauncherPreferences,
} from '../bug-report-launcher';

test('parses persisted launcher visibility and position', () => {
  expect(parseBugReportLauncherPreferences(JSON.stringify({ visible: false, position: { x: 120, y: 240 } }))).toEqual({
    visible: false,
    position: { x: 120, y: 240 },
  });
});

test('falls back safely for invalid persisted launcher data', () => {
  expect(parseBugReportLauncherPreferences('{invalid')).toEqual(DEFAULT_BUG_REPORT_LAUNCHER_PREFERENCES);
  expect(parseBugReportLauncherPreferences(JSON.stringify({ visible: 'no', position: { x: '1', y: 2 } }))).toEqual({
    visible: true,
    position: null,
  });
});

test('clamps launcher inside desktop and narrow mobile viewports', () => {
  expect(clampBugReportLauncherPosition({ x: -50, y: 9999 }, { width: 1440, height: 900 })).toEqual({
    x: 12,
    y: 844,
  });
  expect(clampBugReportLauncherPosition({ x: 999, y: -20 }, { width: 375, height: 667 })).toEqual({
    x: 319,
    y: 12,
  });
});
