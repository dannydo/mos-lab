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
  const [themeMode, setThemeMode] = useState<ThemeMode>('light'); // Default to light mode for maximum readability
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('wings_ads_theme') as ThemeMode;
    if (saved === 'light' || saved === 'dark') {
      setThemeMode(saved);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (themeMode === 'light') {
      root.classList.remove('dark', 'dark-theme');
      root.classList.add('light', 'light-theme');
    } else {
      root.classList.remove('light', 'light-theme');
      root.classList.add('dark', 'dark-theme');
    }
  }, [themeMode, mounted]);

  const toggleTheme = () => {
    const nextTheme = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(nextTheme);
    localStorage.setItem('wings_ads_theme', nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ themeMode, toggleTheme }}>
      <ConfigProvider
        locale={viVN}
        theme={{
          algorithm: !mounted || themeMode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: {
            colorPrimary: '#b8941f', // Wings gold
            colorInfo: '#2563eb', // Blue info
            borderRadius: 8,
            fontFamily: 'var(--font-sans, "Outfit", -apple-system, BlinkMacSystemFont, sans-serif)',
            colorBgContainer: !mounted || themeMode === 'dark' ? '#0d1222' : '#ffffff', // Navy or White container
            colorBgLayout: !mounted || themeMode === 'dark' ? '#070a13' : '#f8fafc', // Deep navy or Slate app background
            colorText: !mounted || themeMode === 'dark' ? '#f8fafc' : '#0f172a', // High contrast text token
            colorTextHeading: !mounted || themeMode === 'dark' ? '#ffffff' : '#020617', // High contrast heading
          },
        }}
      >
        <div style={{ opacity: mounted ? 1 : 0 }} className="h-full">
          {children}
        </div>
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
