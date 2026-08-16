'use client';

import '../app/suppress-warnings';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import viVN from 'antd/locale/vi_VN';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import updateLocale from 'dayjs/plugin/updateLocale';
import 'dayjs/locale/vi';
import { safeStorage } from '../lib/safe-storage';
import {
  getDensityMeasurements,
  isDesktopDensity,
  resolveDensityProfile,
  themeTokens,
  type DensityProfile,
  type DesktopDensity,
} from '@mos-lab/shared';
import { useResponsiveTier } from '../hooks/useResponsiveTier';

// Force Asia/Ho_Chi_Minh (UTC+7) timezone and Monday-First weekStart (1 = Monday) across entire application
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(updateLocale);
dayjs.tz.setDefault('Asia/Ho_Chi_Minh');
dayjs.locale('vi');
dayjs.updateLocale('vi', {
  weekStart: 1,
});
dayjs.updateLocale('en', {
  weekStart: 1,
});

type ThemeMode = 'light' | 'dark';

export const DESKTOP_DENSITY_STORAGE_KEY = 'mos_desktop_density';

interface ThemeContextType {
  themeMode: ThemeMode;
  toggleTheme: () => void;
  /** Saved preference used whenever the viewport is not a phone. */
  desktopDensity: DesktopDensity;
  /** The active profile after applying the mobile touch-safety policy. */
  effectiveDensity: DensityProfile;
  setDesktopDensity: (density: DesktopDensity) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = safeStorage.getItem('mos_theme') as ThemeMode;
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    return 'dark'; // Default to dark premium
  });
  const [mounted, setMounted] = useState(false);
  const [desktopDensity, setDesktopDensityState] = useState<DesktopDensity>(() => {
    const saved = safeStorage.getItem(DESKTOP_DENSITY_STORAGE_KEY);
    return isDesktopDensity(saved) ? saved : 'standard';
  });
  const responsiveTier = useResponsiveTier();
  const effectiveDensity = resolveDensityProfile(desktopDensity, responsiveTier);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const root = document.documentElement;
      if (themeMode === 'light') {
        root.classList.remove('dark-theme', 'dark');
        root.classList.add('light-theme');
      } else {
        root.classList.remove('light-theme');
        root.classList.add('dark-theme', 'dark');
      }
      const semantic = themeTokens.semantic[themeMode];
      const colors = themeTokens.colors[themeMode];
      root.style.setProperty('--mos-surface-raised', semantic.surfaceRaised);
      root.style.setProperty('--mos-surface-muted', semantic.surfaceMuted);
      root.style.setProperty('--mos-surface-border', semantic.border);
      root.style.setProperty('--mos-surface-border-strong', semantic.borderStrong);
      root.style.setProperty('--mos-text', semantic.text);
      root.style.setProperty('--mos-text-muted', semantic.textMuted);
      root.style.setProperty('--mos-accent', semantic.accent);
      root.style.setProperty('--mos-accent-contrast', semantic.accentContrast);
      root.style.setProperty('--mos-focus-ring', semantic.focusRing);
      root.style.setProperty('--mos-success', colors.success);
      root.dataset.uiDensity = effectiveDensity;
      root.dataset.desktopDensity = desktopDensity;
    } catch (_) {}
  }, [desktopDensity, effectiveDensity, mounted, themeMode]);

  const toggleTheme = () => {
    const nextTheme = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(nextTheme);
    safeStorage.setItem('mos_theme', nextTheme);
  };

  const setDesktopDensity = (density: DesktopDensity) => {
    setDesktopDensityState(density);
    safeStorage.setItem(DESKTOP_DENSITY_STORAGE_KEY, density);
  };

  const isDark = themeMode === 'dark';
  const currentTokens = isDark ? themeTokens.colors.dark : themeTokens.colors.light;
  const semanticTokens = themeTokens.semantic[themeMode];
  const density = getDensityMeasurements(effectiveDensity);

  return (
    <ThemeContext.Provider value={{ themeMode, toggleTheme, desktopDensity, effectiveDensity, setDesktopDensity }}>
      <ConfigProvider
        locale={viVN}
        pagination={{
          showSizeChanger: true,
        }}
        theme={{
          algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: {
            colorPrimary: currentTokens.primary,
            colorInfo: currentTokens.info,
            colorSuccess: currentTokens.success,
            colorWarning: currentTokens.warning,
            colorError: currentTokens.error,
            controlOutline: isDark ? 'rgba(212, 168, 75, 0.25)' : 'rgba(158, 113, 24, 0.25)',
            controlOutlineWidth: 2,
            controlHeight: density.controlHeight,
            fontSize: density.fontSize,
            borderRadius: themeTokens.radii.md,
            borderRadiusLG: themeTokens.radii.xl,
            borderRadiusSM: themeTokens.radii.sm,
            borderRadiusXS: themeTokens.radii.xs,
            fontFamily: themeTokens.typography.fontFamily,
            colorBgContainer: currentTokens.bgContainer,
            colorBgElevated: currentTokens.bgElevated,
            colorBgLayout: currentTokens.bgLayout,
            colorBorder: currentTokens.borderColor,
            colorBorderSecondary: currentTokens.borderSecondary,
            colorText: currentTokens.textPrimary,
            colorTextSecondary: currentTokens.textSecondary,
            colorTextDescription: currentTokens.textSecondary,
          },
          components: {
            DatePicker: {
              colorBorder: isDark ? '#1f2937' : '#e5e7eb',
            },
            Card: {
              paddingLG: 16,
              headerHeight: 48,
              borderRadiusLG: 12,
              colorBgContainer: isDark ? '#111827' : '#ffffff',
              colorBorderSecondary: isDark ? '#1f2937' : '#e5e7eb',
            },
            Table: {
              padding: density.cellPaddingInline,
              paddingContentVertical: density.cellPaddingBlock,
              headerBg: isDark ? '#1e293b' : '#f1f5f9',
              headerColor: isDark ? '#f8fafc' : '#0f172a',
              headerSplitColor: isDark ? '#334155' : '#cbd5e1',
              rowHoverBg: isDark ? 'rgba(212, 168, 75, 0.08)' : 'rgba(212, 168, 75, 0.05)',
              borderColor: isDark ? '#1f2937' : '#e2e8f0',
            },
            Button: {
              borderRadius: 6,
              fontWeight: 500,
              paddingInline: density.paddingInline,
            },
            Tag: {
              borderRadiusSM: 4,
              marginXS: 0,
            },
            Modal: {
              borderRadiusLG: 16,
              contentBg: isDark ? '#111827' : '#ffffff',
              headerBg: isDark ? '#111827' : '#ffffff',
            },
            Drawer: {
              colorBgContainer: isDark ? '#111827' : '#ffffff',
            },
            Tabs: {
              horizontalItemPadding: '10px 16px',
              cardGutter: 6,
            },
            Input: {
              borderRadius: 6,
              colorBgContainer: isDark ? '#1a2234' : '#ffffff',
            },
            Select: {
              borderRadius: 6,
              colorBgContainer: isDark ? '#1a2234' : '#ffffff',
            },
            Pagination: {
              // Pagination is an application control, not a table-specific
              // afterthought. Keeping it in the same density pipeline makes
              // every Ant table and standalone pager honour the selected
              // Compact / Standard / Comfortable profile.
              itemSize: density.controlHeight,
              itemSizeSM: density.controlHeight,
              itemBg: semanticTokens.surfaceRaised,
              itemLinkBg: semanticTokens.surfaceRaised,
              itemActiveBg: semanticTokens.accent,
              itemActiveColor: semanticTokens.accentContrast,
              itemActiveColorHover: semanticTokens.accentContrast,
              itemActiveBgDisabled: semanticTokens.surfaceMuted,
              itemActiveColorDisabled: semanticTokens.textMuted,
              itemInputBg: semanticTokens.surfaceRaised,
            },
          },
        }}
      >
        <div>{children}</div>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
