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

/**
 * Behaviour breakpoints are deliberately separate from the QA/device presets
 * above. A 390px iPhone 12 is a product viewport; it must not become a CSS
 * breakpoint just because it is used in screenshots.
 */
export interface ResponsiveBreakpointTokens {
  mobile: number;
  /** A phone remains mobile when rotated; do not promote it to a tablet by width alone. */
  mobileLandscapeMaxWidth: number;
  mobileLandscapeMaxHeight: number;
  tablet: number;
  desktop: number;
  fhd: number;
  wide: number;
  uhd: number;
}

export type ResponsiveTier = 'mobile' | 'tablet' | 'desktop' | 'fhd' | 'wide' | 'uhd';

/**
 * A person's preferred desktop density is intentionally separate from the
 * viewport tier. A power user on a 4K display may still prefer Compact.
 */
export type DesktopDensity = 'compact' | 'standard' | 'comfortable';

/** Mobile uses a compact content rhythm while preserving 44px touch targets. */
export type DensityProfile = DesktopDensity | 'mobileCompact';

export interface ResponsiveLayoutTier {
  pageGutter: number;
  sectionGap: number;
  surfacePadding: number;
  toolbarPadding: number;
  headerHeight: number;
  navigationWidth: number;
  navigationCollapsedWidth: number;
  contentMaxWidth: number | null;
}

export interface ResponsiveTokens {
  /** CSS/JS thresholds for changing layout behaviour, expressed in CSS px. */
  breakpoints: ResponsiveBreakpointTokens;
  /** Real product viewports used by visual QA. They are not CSS thresholds. */
  viewportPresets: {
    iphone12: { width: number; height: number };
    iphone12Landscape: { width: number; height: number };
    ipadPortrait: { width: number; height: number };
    ipadLandscape: { width: number; height: number };
    fhd: { width: number; height: number };
    fourK: { width: number; height: number };
  };
  layout: Record<ResponsiveTier, ResponsiveLayoutTier>;
  touchTarget: {
    minimum: number;
    compact: number;
  };
  safeArea: {
    mobileInset: number;
    floatingControlOffset: number;
  };
  /** Default profile only; it must never override a saved desktop preference. */
  densityByTier: Record<ResponsiveTier, DensityProfile>;
}

export interface DensityStyle {
  controlHeight: string;
  iconSize: string;
  padding: string;
  gap: string;
  fontSize: string;
  cellPadding: string;
}

export interface DensityTokens {
  compact: DensityStyle;
  standard: DensityStyle;
  comfortable: DensityStyle;
  mobileCompact: DensityStyle;
}

/** Numeric measurements derived from the CSS-oriented density contract. */
export interface DensityMeasurements {
  controlHeight: number;
  iconSize: number;
  paddingBlock: number;
  paddingInline: number;
  gap: number;
  fontSize: number;
  cellPaddingBlock: number;
  cellPaddingInline: number;
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
  responsive: ResponsiveTokens;
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
  semantic: {
    dark: SemanticThemeTokens;
    light: SemanticThemeTokens;
  };
}

/**
 * Semantic UI roles. Feature code should consume these roles (or the mapped
 * Ant Design tokens) instead of encoding a palette locally.
 */
export interface SemanticThemeTokens {
  surface: string;
  surfaceRaised: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  border: string;
  borderStrong: string;
  accent: string;
  accentContrast: string;
  focusRing: string;
  shadow: string;
}

export type CoreThemeMode = 'light' | 'dark';

export interface CoreThemeComponentTokens {
  controlOutline: string;
  tableHeaderBg: string;
  tableHeaderColor: string;
  tableHeaderSplit: string;
  tableRowHover: string;
  inputBg: string;
}

export interface CoreThemeModeDefinition {
  colors: ThemeColors;
  semantic: SemanticThemeTokens;
  components: CoreThemeComponentTokens;
}

/**
 * A brand theme is a typed registry entry instead of a collection of page
 * overrides. Adding a theme must not require edits in feature pages.
 */
export interface CoreThemeDefinition {
  id: string;
  label: string;
  defaultMode: CoreThemeMode;
  modes: Record<CoreThemeMode, CoreThemeModeDefinition>;
  typography: DesignTokens['typography'];
  radii: RadiusTokens;
  motion: {
    fast: number;
    standard: number;
    slow: number;
    easing: string;
  };
  chartPalette: string[];
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
  responsive: {
    breakpoints: {
      mobile: 0,
      mobileLandscapeMaxWidth: 960,
      mobileLandscapeMaxHeight: 480,
      tablet: 768,
      desktop: 1200,
      fhd: 1600,
      wide: 2560,
      uhd: 3200,
    },
    viewportPresets: {
      iphone12: { width: 390, height: 844 },
      iphone12Landscape: { width: 844, height: 390 },
      ipadPortrait: { width: 768, height: 1024 },
      ipadLandscape: { width: 1024, height: 768 },
      fhd: { width: 1920, height: 1080 },
      fourK: { width: 3840, height: 2160 },
    },
    layout: {
      mobile: {
        pageGutter: 12,
        sectionGap: 12,
        surfacePadding: 12,
        toolbarPadding: 12,
        headerHeight: 56,
        navigationWidth: 320,
        navigationCollapsedWidth: 0,
        contentMaxWidth: null,
      },
      tablet: {
        pageGutter: 16,
        sectionGap: 16,
        surfacePadding: 16,
        toolbarPadding: 16,
        headerHeight: 60,
        navigationWidth: 232,
        navigationCollapsedWidth: 64,
        contentMaxWidth: null,
      },
      desktop: {
        pageGutter: 20,
        sectionGap: 20,
        surfacePadding: 20,
        toolbarPadding: 16,
        headerHeight: 64,
        navigationWidth: 240,
        navigationCollapsedWidth: 64,
        contentMaxWidth: null,
      },
      fhd: {
        pageGutter: 24,
        sectionGap: 20,
        surfacePadding: 24,
        toolbarPadding: 20,
        headerHeight: 64,
        navigationWidth: 248,
        navigationCollapsedWidth: 64,
        contentMaxWidth: null,
      },
      wide: {
        pageGutter: 28,
        sectionGap: 24,
        surfacePadding: 28,
        toolbarPadding: 20,
        headerHeight: 68,
        navigationWidth: 256,
        navigationCollapsedWidth: 64,
        contentMaxWidth: 2400,
      },
      uhd: {
        pageGutter: 32,
        sectionGap: 24,
        surfacePadding: 32,
        toolbarPadding: 24,
        headerHeight: 72,
        navigationWidth: 264,
        navigationCollapsedWidth: 72,
        contentMaxWidth: 3200,
      },
    },
    touchTarget: {
      minimum: 44,
      compact: 36,
    },
    safeArea: {
      mobileInset: 12,
      floatingControlOffset: 16,
    },
    densityByTier: {
      mobile: 'mobileCompact',
      tablet: 'standard',
      desktop: 'standard',
      fhd: 'standard',
      wide: 'standard',
      uhd: 'standard',
    },
  },
  density: {
    compact: {
      controlHeight: '32px',
      iconSize: '16px',
      padding: '8px 12px',
      gap: '8px',
      fontSize: '12px',
      cellPadding: '6px 8px',
    },
    standard: {
      controlHeight: '36px',
      iconSize: '18px',
      padding: '12px 16px',
      gap: '12px',
      fontSize: '14px',
      cellPadding: '10px 12px',
    },
    comfortable: {
      controlHeight: '44px',
      iconSize: '20px',
      padding: '16px 24px',
      gap: '16px',
      fontSize: '15px',
      cellPadding: '14px 16px',
    },
    mobileCompact: {
      controlHeight: '44px',
      iconSize: '20px',
      padding: '12px',
      gap: '8px',
      fontSize: '14px',
      cellPadding: '10px 12px',
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
  semantic: {
    dark: {
      surface: '#111827',
      surfaceRaised: '#1e293b',
      surfaceMuted: '#0f172a',
      text: '#f8fafc',
      textMuted: '#cbd5e1',
      border: '#1f2937',
      borderStrong: '#374151',
      accent: '#D4A84B',
      accentContrast: '#111827',
      focusRing: 'rgba(212, 168, 75, 0.28)',
      shadow: '0 12px 28px rgba(0, 0, 0, 0.22)',
    },
    light: {
      surface: '#ffffff',
      surfaceRaised: '#ffffff',
      surfaceMuted: '#f8fafc',
      text: '#0f172a',
      textMuted: '#475569',
      border: '#e2e8f0',
      borderStrong: '#cbd5e1',
      accent: '#855b0e',
      accentContrast: '#ffffff',
      focusRing: 'rgba(133, 91, 14, 0.2)',
      shadow: '0 12px 28px rgba(15, 23, 42, 0.08)',
    },
  },
};

export const DEFAULT_CORE_THEME_ID = 'mos';

export const coreThemeRegistry: Readonly<Record<string, CoreThemeDefinition>> = {
  [DEFAULT_CORE_THEME_ID]: {
    id: DEFAULT_CORE_THEME_ID,
    label: 'mOS Gold',
    defaultMode: 'dark',
    typography: themeTokens.typography,
    radii: themeTokens.radii,
    motion: {
      fast: 120,
      standard: 180,
      slow: 280,
      easing: 'cubic-bezier(0.2, 0, 0, 1)',
    },
    chartPalette: ['#D4A84B', '#38bdf8', '#22c55e', '#a78bfa', '#f97316', '#ec4899'],
    modes: {
      dark: {
        colors: themeTokens.colors.dark,
        semantic: themeTokens.semantic.dark,
        components: {
          controlOutline: 'rgba(212, 168, 75, 0.25)',
          tableHeaderBg: '#1e293b',
          tableHeaderColor: '#f8fafc',
          tableHeaderSplit: '#334155',
          tableRowHover: 'rgba(212, 168, 75, 0.08)',
          inputBg: '#1a2234',
        },
      },
      light: {
        colors: themeTokens.colors.light,
        semantic: themeTokens.semantic.light,
        components: {
          controlOutline: 'rgba(133, 91, 14, 0.25)',
          tableHeaderBg: '#f1f5f9',
          tableHeaderColor: '#0f172a',
          tableHeaderSplit: '#cbd5e1',
          tableRowHover: 'rgba(212, 168, 75, 0.05)',
          inputBg: '#ffffff',
        },
      },
    },
  },
};

export function getCoreThemeDefinition(themeId = DEFAULT_CORE_THEME_ID): CoreThemeDefinition {
  return coreThemeRegistry[themeId] ?? coreThemeRegistry[DEFAULT_CORE_THEME_ID];
}

/** Maps viewport dimensions to the single responsive contract used by the web app. */
export function getResponsiveTier(viewportWidth: number, viewportHeight?: number): ResponsiveTier {
  const { breakpoints } = themeTokens.responsive;

  const isMobileLandscape =
    typeof viewportHeight === 'number' &&
    viewportWidth > viewportHeight &&
    viewportWidth <= breakpoints.mobileLandscapeMaxWidth &&
    viewportHeight <= breakpoints.mobileLandscapeMaxHeight;

  if (isMobileLandscape) return 'mobile';

  if (viewportWidth >= breakpoints.uhd) return 'uhd';
  if (viewportWidth >= breakpoints.wide) return 'wide';
  if (viewportWidth >= breakpoints.fhd) return 'fhd';
  if (viewportWidth >= breakpoints.desktop) return 'desktop';
  if (viewportWidth >= breakpoints.tablet) return 'tablet';
  return 'mobile';
}

export function isDesktopDensity(value: unknown): value is DesktopDensity {
  return value === 'compact' || value === 'standard' || value === 'comfortable';
}

/**
 * Keeps a saved desktop preference intact while a phone uses the mandatory
 * touch-safe compact profile. When the viewport becomes desktop again, the
 * saved choice is restored without another write to storage.
 */
export function resolveDensityProfile(preference: DesktopDensity, tier: ResponsiveTier): DensityProfile {
  return tier === 'mobile' ? 'mobileCompact' : preference;
}

function parsePixelValue(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseSpacingPair(value: string): [number, number] {
  const values = value
    .trim()
    .split(/\s+/)
    .map(parsePixelValue)
    .filter((item) => item > 0);
  const block = values[0] ?? 0;
  return [block, values[1] ?? block];
}

/**
 * Converts a shared density style into numeric measurements for renderers such
 * as Ant Design. It prevents each app surface from re-parsing pixel strings.
 */
export function getDensityMeasurements(profile: DensityProfile): DensityMeasurements {
  const style = themeTokens.density[profile];
  const [paddingBlock, paddingInline] = parseSpacingPair(style.padding);
  const [cellPaddingBlock, cellPaddingInline] = parseSpacingPair(style.cellPadding);

  return {
    controlHeight: parsePixelValue(style.controlHeight),
    iconSize: parsePixelValue(style.iconSize),
    paddingBlock,
    paddingInline,
    gap: parsePixelValue(style.gap),
    fontSize: parsePixelValue(style.fontSize),
    cellPaddingBlock,
    cellPaddingInline,
  };
}

export function isCompactResponsiveTier(tier: ResponsiveTier): boolean {
  return tier === 'mobile' || tier === 'tablet';
}
