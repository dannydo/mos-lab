/**
 * Color and Palette Utilities for mos-lab Multi-Theme Engine
 * Handles Hex parsing, luminance, saturation calculation, and smart palette auto-mapping.
 */

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface HslColor {
  h: number;
  s: number;
  l: number;
}

export interface AutoMappedPalette {
  base: 'light' | 'dark';
  primary: string;
  primaryHover: string;
  bgLayout: string;
  bgContainer: string;
  bgElevated: string;
  borderColor: string;
  borderSecondary: string;
  textPrimary: string;
  textSecondary: string;
}

/**
 * Normalizes a hex string (handles 3-digit and 6-digit with or without leading #).
 */
export function normalizeHex(hex: string): string | null {
  const cleaned = hex.replace(/^#/, '').trim();
  if (cleaned.length === 3) {
    return `#${cleaned[0]}${cleaned[0]}${cleaned[1]}${cleaned[1]}${cleaned[2]}${cleaned[2]}`.toLowerCase();
  }
  if (cleaned.length === 6 && /^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `#${cleaned}`.toLowerCase();
  }
  return null;
}

/**
 * Converts Hex string to RGB values.
 */
export function hexToRgb(hex: string): RgbColor | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const num = parseInt(normalized.slice(1), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Converts RGB values to Hex string.
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${((1 << 24) + (clamp(r) << 16) + (clamp(g) << 8) + clamp(b)).toString(16).slice(1)}`.toLowerCase();
}

/**
 * Calculates relative luminance according to WCAG specifications (0 = pitch black, 1 = pure white).
 */
export function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;

  const [rs, gs, bs] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((val) => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Converts Hex to HSL.
 */
export function hexToHsl(hex: string): HslColor | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Adjusts brightness of a hex color by a percentage (-100 to 100).
 */
export function adjustBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const factor = 1 + percent / 100;
  return rgbToHex(rgb.r * factor, rgb.g * factor, rgb.b * factor);
}

/**
 * Blends a hex color with another color by ratio (0 = color1, 1 = color2).
 */
export function blendColors(color1: string, color2: string, ratio: number): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return color1;

  const r = rgb1.r + (rgb2.r - rgb1.r) * ratio;
  const g = rgb1.g + (rgb2.g - rgb1.g) * ratio;
  const b = rgb1.b + (rgb2.b - rgb1.b) * ratio;

  return rgbToHex(r, g, b);
}

/**
 * Parses all Hex color codes from any input text (CSS, JSON, Coolors URL, comma-separated list, etc.).
 */
export function parseHexCodes(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g) || [];
  const unique = Array.from(new Set(matches.map((h) => normalizeHex(h)).filter((h): h is string => Boolean(h))));
  return unique;
}

/**
 * Intelligently auto-maps a list of Hex colors (from paste or screenshot) into structured theme slots.
 */
export function autoMapPalette(hexList: string[], preferredBase?: 'light' | 'dark'): AutoMappedPalette {
  const validHexes = hexList.map(normalizeHex).filter((h): h is string => Boolean(h));

  // Fallbacks if list is too small
  if (validHexes.length === 0) {
    validHexes.push('#855b0e', '#f5efeb', '#fdfbf7', '#2d2824', '#e8e1d5');
  } else if (validHexes.length === 1) {
    const single = validHexes[0];
    const lum = getLuminance(single);
    if (lum > 0.5) {
      validHexes.push('#d4a84b', '#111827', '#0b0f19', '#1f2937');
    } else {
      validHexes.push('#855b0e', '#ffffff', '#f5f7fa', '#e2e8f0');
    }
  }

  // Calculate luminance and saturation for each color
  const analyzed = validHexes.map((hex) => {
    const lum = getLuminance(hex);
    const hsl = hexToHsl(hex);
    return {
      hex,
      luminance: lum,
      saturation: hsl ? hsl.s : 0,
      lightness: hsl ? hsl.l : 50,
    };
  });

  // Determine base (light vs dark)
  let base: 'light' | 'dark' = preferredBase || 'light';
  if (!preferredBase) {
    const avgLum = analyzed.reduce((sum, item) => sum + item.luminance, 0) / analyzed.length;
    base = avgLum >= 0.4 ? 'light' : 'dark';
  }

  // Sort colors by luminance
  const sortedByLum = [...analyzed].sort((a, b) => a.luminance - b.luminance);

  // Find candidate for Primary (highest saturation, excluding extreme black/white)
  const coloredCandidates = analyzed.filter((c) => c.saturation >= 15 && c.luminance > 0.05 && c.luminance < 0.9);
  let primaryCandidate = coloredCandidates.sort((a, b) => b.saturation - a.saturation)[0];
  if (!primaryCandidate) {
    primaryCandidate = sortedByLum[Math.floor(sortedByLum.length / 2)];
  }

  const primary = primaryCandidate.hex;
  const primaryHover = base === 'light' ? adjustBrightness(primary, -15) : adjustBrightness(primary, 15);

  let bgLayout: string;
  let bgContainer: string;
  let bgElevated: string;
  let textPrimary: string;
  let textSecondary: string;
  let borderColor: string;
  let borderSecondary: string;

  if (base === 'light') {
    const lightColors = sortedByLum.filter((c) => c.hex !== primary && c.luminance >= 0.6);
    const darkColors = sortedByLum.filter((c) => c.hex !== primary && c.luminance < 0.4);

    bgLayout = lightColors[0]?.hex || '#f5efeb';
    bgContainer = lightColors[1]?.hex || '#ffffff';
    if (getLuminance(bgLayout) > getLuminance(bgContainer)) {
      const temp = bgLayout;
      bgLayout = bgContainer;
      bgContainer = temp;
    }
    bgElevated = '#ffffff';

    textPrimary = darkColors[0]?.hex || '#2d2824';
    textSecondary = darkColors[1]?.hex || blendColors(textPrimary, bgContainer, 0.4);

    borderColor = blendColors(textPrimary, bgContainer, 0.85);
    borderSecondary = blendColors(textPrimary, bgContainer, 0.92);
  } else {
    const darkColors = sortedByLum.filter((c) => c.hex !== primary && c.luminance <= 0.25);
    const lightColors = sortedByLum.filter((c) => c.hex !== primary && c.luminance > 0.4);

    bgLayout = darkColors[0]?.hex || '#0b0f19';
    bgContainer = darkColors[1]?.hex || adjustBrightness(bgLayout, 15);
    bgElevated = adjustBrightness(bgContainer, 15);

    textPrimary = lightColors[lightColors.length - 1]?.hex || '#f8fafc';
    textSecondary = lightColors[lightColors.length - 2]?.hex || blendColors(textPrimary, bgContainer, 0.35);

    borderColor = blendColors(textPrimary, bgContainer, 0.85);
    borderSecondary = blendColors(textPrimary, bgContainer, 0.92);
  }

  return {
    base,
    primary,
    primaryHover,
    bgLayout,
    bgContainer,
    bgElevated,
    borderColor,
    borderSecondary,
    textPrimary,
    textSecondary,
  };
}
