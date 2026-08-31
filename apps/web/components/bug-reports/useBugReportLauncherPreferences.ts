'use client';

import React from 'react';
import {
  DEFAULT_BUG_REPORT_LAUNCHER_PREFERENCES,
  readBugReportLauncherPreferences,
  subscribeBugReportLauncherPreferences,
  updateBugReportLauncherPreferences,
  type BugReportLauncherPosition,
} from '../../lib/bug-report-launcher';

export function useBugReportLauncherPreferences() {
  const [preferences, setPreferences] = React.useState(DEFAULT_BUG_REPORT_LAUNCHER_PREFERENCES);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const refresh = () => {
      setPreferences(readBugReportLauncherPreferences());
      setReady(true);
    };
    refresh();
    return subscribeBugReportLauncherPreferences(refresh);
  }, []);

  const setVisible = React.useCallback((visible: boolean) => {
    setPreferences(updateBugReportLauncherPreferences({ visible }));
  }, []);

  const setPosition = React.useCallback((position: BugReportLauncherPosition) => {
    setPreferences(updateBugReportLauncherPreferences({ position }));
  }, []);

  return { preferences, ready, setVisible, setPosition };
}
