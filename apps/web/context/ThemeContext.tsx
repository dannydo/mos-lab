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
      root.classList.remove('dark-theme');
      root.classList.add('light-theme');
    } else {
      root.classList.remove('light-theme');
      root.classList.add('dark-theme');
    }
  }, [themeMode, mounted]);

  const toggleTheme = () => {
    const nextTheme = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(nextTheme);
    localStorage.setItem('mos_theme', nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ themeMode, toggleTheme }}>
      <ConfigProvider
        locale={viVN}
        theme={{
          algorithm: !mounted || themeMode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: {
            colorPrimary: '#D4A84B',
            colorInfo: '#D4A84B',
            borderRadius: 6,
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            colorBgContainer: !mounted || themeMode === 'dark' ? '#111827' : '#ffffff',
            colorBgLayout: !mounted || themeMode === 'dark' ? '#0b0f19' : '#f5f7fa',
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
