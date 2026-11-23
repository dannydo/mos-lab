/**
 * Core Built-in Theme Registry and Lookup
 */

import { mosCoreTheme, mosLightTheme, wingsTheme } from './brand-themes.js';
import { DEFAULT_CORE_THEME_ID } from './design-tokens.js';
import { blushTheme, emeraldTheme, ivoryTheme, midnightTheme } from './palette-themes.js';
import type { CoreThemeDefinition } from './types.js';

export const builtInThemes: Record<string, CoreThemeDefinition> = {
  [DEFAULT_CORE_THEME_ID]: mosCoreTheme,
  'mos-light': mosLightTheme,
  ivory: ivoryTheme,
  midnight: midnightTheme,
  emerald: emeraldTheme,
  blush: blushTheme,
  wings: wingsTheme,
};

export const coreThemeRegistry: Readonly<Record<string, CoreThemeDefinition>> = builtInThemes;

export function getCoreThemeDefinition(themeId = DEFAULT_CORE_THEME_ID): CoreThemeDefinition {
  return coreThemeRegistry[themeId] ?? coreThemeRegistry[DEFAULT_CORE_THEME_ID];
}
