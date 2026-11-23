/**
 * Responsive Viewport Tier and Density Profile Resolution Helpers
 */

import { themeTokens } from './design-tokens.js';
import type { DensityMeasurements, DensityProfile, DesktopDensity, ResponsiveTier } from './types.js';

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
