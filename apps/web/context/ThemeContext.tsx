'use client';

import '../app/suppress-warnings';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import viVN from 'antd/locale/vi_VN';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_theme') as ThemeMode;
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    }
    return 'dark'; // Default to dark premium
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (themeMode === 'light') {
      root.classList.remove('dark-theme', 'dark');
      root.classList.add('light-theme');
    } else {
      root.classList.remove('light-theme');
      root.classList.add('dark-theme', 'dark');
    }
  }, [themeMode, mounted]);

  const toggleTheme = () => {
    const nextTheme = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(nextTheme);
    localStorage.setItem('mos_theme', nextTheme);
  };

  const isDark = !mounted || themeMode === 'dark';

  return (
    <ThemeContext.Provider value={{ themeMode, toggleTheme }}>
      <ConfigProvider
        locale={viVN}
        theme={{
          algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: {
            colorPrimary: '#D4A84B',
            colorInfo: '#D4A84B',
            colorSuccess: '#52c41a',
            colorWarning: '#faad14',
            colorError: '#ff4d4f',
            borderRadius: 8,
            borderRadiusLG: 12,
            borderRadiusSM: 6,
            borderRadiusXS: 4,
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            colorBgContainer: isDark ? '#111827' : '#ffffff',
            colorBgElevated: isDark ? '#1e293b' : '#ffffff',
            colorBgLayout: isDark ? '#0b0f19' : '#f5f7fa',
            colorBorder: isDark ? '#1f2937' : '#e5e7eb',
            colorBorderSecondary: isDark ? '#374151' : '#f3f4f6',
            colorText: isDark ? '#f8fafc' : '#0f172a',
            colorTextSecondary: isDark ? '#94a3b8' : '#64748b',
            colorTextDescription: isDark ? '#64748b' : '#94a3b8',
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
              headerBg: isDark ? '#1e293b' : '#f8fafc',
              headerColor: isDark ? '#f8fafc' : '#1e293b',
              headerSplitColor: isDark ? '#334155' : '#e2e8f0',
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
        <div style={{ opacity: mounted ? 1 : 0 }}>{children}</div>
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
