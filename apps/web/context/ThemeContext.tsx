'use client';

import '../app/suppress-warnings';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { safeStorage } from '../lib/safe-storage';
import { themeTokens } from '@mos-lab/shared';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  toggleTheme: () => void;
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
    } catch (_) {}
  }, [themeMode, mounted]);

  const toggleTheme = () => {
    const nextTheme = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(nextTheme);
    safeStorage.setItem('mos_theme', nextTheme);
  };

  const isDark = themeMode === 'dark';
  const currentTokens = isDark ? themeTokens.colors.dark : themeTokens.colors.light;

  return (
    <ThemeContext.Provider value={{ themeMode, toggleTheme }}>
      <ConfigProvider
        locale={viVN}
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
              padding: 12,
              paddingContentVertical: 10,
              headerBg: isDark ? '#1e293b' : '#f1f5f9',
              headerColor: isDark ? '#f8fafc' : '#0f172a',
              headerSplitColor: isDark ? '#334155' : '#cbd5e1',
              rowHoverBg: isDark ? 'rgba(212, 168, 75, 0.08)' : 'rgba(212, 168, 75, 0.05)',
              borderColor: isDark ? '#1f2937' : '#e2e8f0',
            },
            Button: {
              borderRadius: 6,
              fontWeight: 500,
              paddingInline: 14,
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
