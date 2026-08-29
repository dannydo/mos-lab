'use client';

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { SeasonalAccentPreset } from '@mos-lab/shared';
import { apiClient } from '../lib/api-client';
import { useTheme } from './ThemeContext';

export function SeasonalAccentProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { themeMode } = useTheme();
  const [preset, setPreset] = useState<SeasonalAccentPreset | null>(null);

  useEffect(() => {
    let active = true;
    apiClient.uiExperiences
      .resolve({ surface: 'DASHBOARD_ACCENT', route: pathname })
      .then((response) => {
        if (active) setPreset(response.accentPreset);
      })
      .catch(() => {
        if (active) setPreset(null);
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  const style = useMemo(() => {
    if (!preset) return undefined;
    const tokens = preset.modes[themeMode];
    return {
      '--mos-seasonal-accent': tokens.accent,
      '--mos-seasonal-accent-contrast': tokens.accentContrast,
      '--mos-seasonal-ambient-start': tokens.ambientStart,
      '--mos-seasonal-ambient-end': tokens.ambientEnd,
      '--mos-seasonal-header-gradient': tokens.headerGradient,
      '--mos-seasonal-sidebar-gradient': tokens.sidebarGradient,
      '--mos-seasonal-border': tokens.border,
    } as CSSProperties;
  }, [preset, themeMode]);

  return (
    <div style={{ display: 'contents', ...style }} data-seasonal-accent={preset?.key || undefined}>
      {children}
    </div>
  );
}
