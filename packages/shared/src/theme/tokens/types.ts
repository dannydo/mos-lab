/**
 * Type Definitions for mos-lab Unified Design Tokens and Core Themes
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
  accentSoft?: string;
  accentBorder?: string;
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
  description?: string;
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

export interface ThemePresetInput {
  id: string;
  label: string;
  description?: string;
  base: CoreThemeMode;
  colors: {
    primary: string;
    primaryHover?: string;
    info?: string;
    success?: string;
    warning?: string;
    error?: string;
    bgLayout: string;
    bgContainer: string;
    bgElevated?: string;
    borderColor: string;
    borderSecondary?: string;
    textPrimary: string;
    textSecondary: string;
  };
  chartPalette?: string[];
}
