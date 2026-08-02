/**
 * Unified Design Tokens for mos-lab Monorepo
 * Single Source of Truth for Theme Colors, Responsive Breakpoints,
 * Density Presets, Typography, and Tabular-nums Formatting.
 */

export interface ThemeColors {
  primary: string;
  primaryHover: string;
  info: string;
  success: string;
  warning: string;
  error: string;
  bgLayout: string;
  bgContainer: string;
  bgElevated: string;
  borderColor: string;
  borderSecondary: string;
  textPrimary: string;
  textSecondary: string;
}

export interface BreakpointTokens {
  phone: number;
  ipad: number;
  laptop: number;
  desktop: number;
  fourK: number;
}

export interface DensityStyle {
  padding: string;
  gap: string;
  fontSize: string;
  cellPadding: string;
}

export interface DensityTokens {
  compact: DensityStyle;
  comfort: DensityStyle;
  spacious: DensityStyle;
}

export interface RadiusTokens {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface StatusColorStyle {
  main: string;
  bg: string;
  border: string;
  text: string;
}

export interface StatusColors {
  verified: StatusColorStyle;
  needsImprovement: StatusColorStyle;
  notSynced: StatusColorStyle;
}

export interface DesignTokens {
  colors: {
    dark: ThemeColors;
    light: ThemeColors;
  };
  statusColors: StatusColors;
  breakpoints: BreakpointTokens;
  density: DensityTokens;
  radii: RadiusTokens;
  typography: {
    fontFamily: string;
    tabularNumsClass: string;
    tabularNumsStyle: {
      fontVariantNumeric: string;
      fontFeatureSettings: string;
    };
  };
}

export const themeTokens: DesignTokens = {
  colors: {
    dark: {
      primary: '#D4A84B',
      primaryHover: '#E5BA5C',
      info: '#38bdf8',
      success: '#52c41a',
      warning: '#faad14',
      error: '#ff4d4f',
      bgLayout: '#0b0f19',
      bgContainer: '#111827',
      bgElevated: '#1e293b',
      borderColor: '#1f2937',
      borderSecondary: '#374151',
      textPrimary: '#f8fafc',
      textSecondary: '#cbd5e1',
    },
    light: {
      primary: '#855b0e',
      primaryHover: '#6d4a0a',
      info: '#0284c7',
      success: '#16a34a',
      warning: '#d97706',
      error: '#dc2626',
      bgLayout: '#f5f7fa',
      bgContainer: '#ffffff',
      bgElevated: '#ffffff',
      borderColor: '#e2e8f0',
      borderSecondary: '#f1f5f9',
      textPrimary: '#0f172a',
      textSecondary: '#334155',
    },
  },
  statusColors: {
    verified: {
      main: '#10B981',
      bg: 'rgba(16, 185, 129, 0.15)',
      border: 'rgba(16, 185, 129, 0.4)',
      text: '#34d399',
    },
    needsImprovement: {
      main: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.5)',
      text: '#fbbf24',
    },
    notSynced: {
      main: '#EF4444',
      bg: 'rgba(239, 68, 68, 0.15)',
      border: 'rgba(239, 68, 68, 0.5)',
      text: '#f87171',
    },
  },
  breakpoints: {
    phone: 375,
    ipad: 768,
    laptop: 1024,
    desktop: 1440,
    fourK: 2560,
  },
  density: {
    compact: {
      padding: '8px 12px',
      gap: '8px',
      fontSize: '12px',
      cellPadding: '6px 8px',
    },
    comfort: {
      padding: '12px 16px',
      gap: '12px',
      fontSize: '14px',
      cellPadding: '10px 12px',
    },
    spacious: {
      padding: '16px 24px',
      gap: '16px',
      fontSize: '15px',
      cellPadding: '14px 16px',
    },
  },
  radii: {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
  },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    tabularNumsClass: 'tabular-nums',
    tabularNumsStyle: {
      fontVariantNumeric: 'tabular-nums',
      fontFeatureSettings: '"tnum"',
    },
  },
};
