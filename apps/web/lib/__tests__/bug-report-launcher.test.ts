import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_BUG_REPORT_LAUNCHER_PREFERENCES,
  clampBugReportLauncherPosition,
  parseBugReportLauncherPreferences,
} from '../bug-report-launcher';

test('parses persisted launcher visibility and position', () => {
  assert.deepEqual(
    parseBugReportLauncherPreferences(JSON.stringify({ visible: false, position: { x: 120, y: 240 } })),
    { visible: false, position: { x: 120, y: 240 } }
  );
});

test('falls back safely for invalid persisted launcher data', () => {
  assert.deepEqual(parseBugReportLauncherPreferences('{invalid'), DEFAULT_BUG_REPORT_LAUNCHER_PREFERENCES);
  assert.deepEqual(parseBugReportLauncherPreferences(JSON.stringify({ visible: 'no', position: { x: '1', y: 2 } })), {
    visible: true,
    position: null,
  });
});

test('clamps launcher inside desktop and narrow mobile viewports', () => {
  assert.deepEqual(clampBugReportLauncherPosition({ x: -50, y: 9999 }, { width: 1440, height: 900 }), {
    x: 12,
    y: 844,
  });
  assert.deepEqual(clampBugReportLauncherPosition({ x: 999, y: -20 }, { width: 375, height: 667 }), {
    x: 319,
    y: 12,
  });
});
