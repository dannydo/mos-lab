/**
 * Theme Preset Factory for Building CoreThemeDefinition Registry Entries
 */

import { adjustBrightness, hexToRgba } from '../palette-utils.js';
import { themeTokens } from './design-tokens.js';
import type {
  CoreThemeComponentTokens,
  CoreThemeDefinition,
  CoreThemeModeDefinition,
  SemanticThemeTokens,
  ThemeColors,
  ThemePresetInput,
} from './types.js';

export function defineTheme(input: ThemePresetInput): CoreThemeDefinition {
  const isLight = input.base === 'light';
  const c = input.colors;
  const primaryHover = c.primaryHover ?? (isLight ? adjustBrightness(c.primary, -15) : adjustBrightness(c.primary, 15));
  const bgElevated = c.bgElevated ?? (isLight ? '#ffffff' : adjustBrightness(c.bgContainer, 15));
  const borderSecondary =
    c.borderSecondary ?? (isLight ? adjustBrightness(c.borderColor, 5) : adjustBrightness(c.borderColor, -5));

  const primaryModeColors: ThemeColors = {
    primary: c.primary,
    primaryHover,
    info: c.info ?? (isLight ? '#0284c7' : '#38bdf8'),
    success: c.success ?? (isLight ? '#16a34a' : '#52c41a'),
    warning: c.warning ?? (isLight ? '#d97706' : '#faad14'),
    error: c.error ?? (isLight ? '#dc2626' : '#ff4d4f'),
    bgLayout: c.bgLayout,
    bgContainer: c.bgContainer,
    bgElevated,
    borderColor: c.borderColor,
    borderSecondary,
    textPrimary: c.textPrimary,
    textSecondary: c.textSecondary,
  };

  const primarySemantic: SemanticThemeTokens = {
    surface: c.bgContainer,
    surfaceRaised: bgElevated,
    surfaceMuted: c.bgLayout,
    text: c.textPrimary,
    textMuted: c.textSecondary,
    border: c.borderColor,
    borderStrong: borderSecondary,
    accent: c.primary,
    accentContrast: isLight ? '#ffffff' : '#111827',
    accentSoft: hexToRgba(c.primary, isLight ? 0.12 : 0.16),
    accentBorder: hexToRgba(c.primary, isLight ? 0.34 : 0.38),
    focusRing: hexToRgba(c.primary, isLight ? 0.2 : 0.25),
    shadow: isLight ? '0 12px 28px rgba(0, 0, 0, 0.08)' : '0 12px 28px rgba(0, 0, 0, 0.25)',
  };

  const primaryComponents: CoreThemeComponentTokens = {
    controlOutline: hexToRgba(c.primary, isLight ? 0.2 : 0.25),
    tableHeaderBg: isLight ? adjustBrightness(c.bgLayout, -3) : adjustBrightness(c.bgContainer, 10),
    tableHeaderColor: c.textPrimary,
    tableHeaderSplit: c.borderColor,
    tableRowHover: hexToRgba(c.primary, isLight ? 0.05 : 0.08),
    inputBg: c.bgContainer,
  };

  const primaryDefinition: CoreThemeModeDefinition = {
    colors: primaryModeColors,
    semantic: primarySemantic,
    components: primaryComponents,
  };

  const companionColors: ThemeColors = isLight
    ? {
        ...themeTokens.colors.dark,
        primary: c.primary,
        primaryHover,
      }
    : {
        ...themeTokens.colors.light,
        primary: c.primary,
        primaryHover,
      };

  const companionSemantic: SemanticThemeTokens = isLight
    ? {
        ...themeTokens.semantic.dark,
        accent: c.primary,
        accentSoft: hexToRgba(c.primary, 0.16),
        accentBorder: hexToRgba(c.primary, 0.38),
      }
    : {
        ...themeTokens.semantic.light,
        accent: c.primary,
        accentSoft: hexToRgba(c.primary, 0.12),
        accentBorder: hexToRgba(c.primary, 0.34),
      };

  const companionComponents: CoreThemeComponentTokens = isLight
    ? {
        controlOutline: hexToRgba(c.primary, 0.25),
        tableHeaderBg: '#1e293b',
        tableHeaderColor: '#f8fafc',
        tableHeaderSplit: '#334155',
        tableRowHover: hexToRgba(c.primary, 0.08),
        inputBg: '#1a2234',
      }
    : {
        controlOutline: hexToRgba(c.primary, 0.25),
        tableHeaderBg: '#f1f5f9',
        tableHeaderColor: '#0f172a',
        tableHeaderSplit: '#cbd5e1',
        tableRowHover: hexToRgba(c.primary, 0.05),
        inputBg: '#ffffff',
      };

  const companionDefinition: CoreThemeModeDefinition = {
    colors: companionColors,
    semantic: companionSemantic,
    components: companionComponents,
  };

  return {
    id: input.id,
    label: input.label,
    defaultMode: input.base,
    typography: themeTokens.typography,
    radii: themeTokens.radii,
    motion: {
      fast: 120,
      standard: 180,
      slow: 280,
      easing: 'cubic-bezier(0.2, 0, 0, 1)',
    },
    chartPalette: input.chartPalette ?? ['#D4A84B', '#38bdf8', '#22c55e', '#a78bfa', '#f97316', '#ec4899'],
    modes: {
      light: isLight ? primaryDefinition : companionDefinition,
      dark: isLight ? companionDefinition : primaryDefinition,
    },
  };
}
