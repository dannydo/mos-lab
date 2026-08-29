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
  coreThemeRegistry,
  DEFAULT_CORE_THEME_ID,
  getDensityMeasurements,
  getCoreThemeDefinition,
  isDesktopDensity,
  resolveDensityProfile,
  type CoreThemeMode,
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

type ThemeMode = CoreThemeMode;

export const DESKTOP_DENSITY_STORAGE_KEY = 'mos_desktop_density';
export const CORE_THEME_STORAGE_KEY = 'mos_core_theme';

interface ThemeContextType {
  coreThemeId: string;
  availableCoreThemes: ReadonlyArray<{ id: string; label: string }>;
  setCoreThemeId: (themeId: string) => void;
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
  const [coreThemeId, setCoreThemeIdState] = useState(() => {
    const saved = safeStorage.getItem(CORE_THEME_STORAGE_KEY);
    return saved && coreThemeRegistry[saved] ? saved : DEFAULT_CORE_THEME_ID;
  });
  const coreTheme = getCoreThemeDefinition(coreThemeId);
  const availableCoreThemes = Object.values(coreThemeRegistry).map(({ id, label }) => ({ id, label }));
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = safeStorage.getItem('mos_theme') as ThemeMode;
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    return coreTheme.defaultMode;
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
      const activeMode = coreTheme.modes[themeMode];
      const semantic = activeMode.semantic;
      const colors = activeMode.colors;
      root.style.setProperty('--mos-surface', semantic.surface);
      root.style.setProperty('--mos-surface-raised', semantic.surfaceRaised);
      root.style.setProperty('--mos-surface-muted', semantic.surfaceMuted);
      root.style.setProperty('--mos-surface-border', semantic.border);
      root.style.setProperty('--mos-surface-border-strong', semantic.borderStrong);
      root.style.setProperty('--mos-text', semantic.text);
      root.style.setProperty('--mos-text-muted', semantic.textMuted);
      root.style.setProperty('--mos-accent', semantic.accent);
      root.style.setProperty('--mos-accent-contrast', semantic.accentContrast);
      root.style.setProperty('--mos-focus-ring', semantic.focusRing);
      root.style.setProperty('--mos-shadow', semantic.shadow);
      root.style.setProperty('--mos-success', colors.success);
      root.style.setProperty('--mos-motion-fast', `${coreTheme.motion.fast}ms`);
      root.style.setProperty('--mos-motion-standard', `${coreTheme.motion.standard}ms`);
      root.style.setProperty('--mos-motion-slow', `${coreTheme.motion.slow}ms`);
      root.style.setProperty('--mos-motion-easing', coreTheme.motion.easing);
      root.dataset.uiDensity = effectiveDensity;
      root.dataset.desktopDensity = desktopDensity;
    } catch (_) {}
  }, [coreTheme, desktopDensity, effectiveDensity, mounted, themeMode]);

  const toggleTheme = () => {
    const nextTheme = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(nextTheme);
    safeStorage.setItem('mos_theme', nextTheme);
  };

  const setDesktopDensity = (density: DesktopDensity) => {
    setDesktopDensityState(density);
    safeStorage.setItem(DESKTOP_DENSITY_STORAGE_KEY, density);
  };

  const setCoreThemeId = (themeId: string) => {
    if (!coreThemeRegistry[themeId]) return;
    setCoreThemeIdState(themeId);
    safeStorage.setItem(CORE_THEME_STORAGE_KEY, themeId);
  };

  const isDark = themeMode === 'dark';
  const activeMode = coreTheme.modes[themeMode];
  const currentTokens = activeMode.colors;
  const semanticTokens = activeMode.semantic;
  const componentTokens = activeMode.components;
  const density = getDensityMeasurements(effectiveDensity);

  return (
    <ThemeContext.Provider
      value={{
        coreThemeId: coreTheme.id,
        availableCoreThemes,
        setCoreThemeId,
        themeMode,
        toggleTheme,
        desktopDensity,
        effectiveDensity,
        setDesktopDensity,
      }}
    >
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
            controlOutline: componentTokens.controlOutline,
            controlOutlineWidth: 2,
            controlHeight: density.controlHeight,
            fontSize: density.fontSize,
            borderRadius: coreTheme.radii.md,
            borderRadiusLG: coreTheme.radii.xl,
            borderRadiusSM: coreTheme.radii.sm,
            borderRadiusXS: coreTheme.radii.xs,
            fontFamily: coreTheme.typography.fontFamily,
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
              colorBorder: currentTokens.borderColor,
            },
            Card: {
              paddingLG: 16,
              headerHeight: 48,
              borderRadiusLG: 12,
              colorBgContainer: currentTokens.bgContainer,
              colorBorderSecondary: currentTokens.borderColor,
            },
            Table: {
              padding: density.cellPaddingInline,
              paddingContentVertical: density.cellPaddingBlock,
              headerBg: componentTokens.tableHeaderBg,
              headerColor: componentTokens.tableHeaderColor,
              headerSplitColor: componentTokens.tableHeaderSplit,
              rowHoverBg: componentTokens.tableRowHover,
              borderColor: currentTokens.borderColor,
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
              contentBg: currentTokens.bgContainer,
              headerBg: currentTokens.bgContainer,
            },
            Drawer: {
              colorBgContainer: currentTokens.bgContainer,
            },
            Tabs: {
              horizontalItemPadding: '10px 16px',
              cardGutter: 6,
            },
            Input: {
              borderRadius: 6,
              colorBgContainer: componentTokens.inputBg,
            },
            Select: {
              borderRadius: 6,
              colorBgContainer: componentTokens.inputBg,
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
