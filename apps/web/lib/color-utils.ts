const parseHexColor = (value: string): [number, number, number] | null => {
  const normalized = value.trim().replace('#', '');
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((part) => `${part}${part}`)
          .join('')
      : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return null;
  return [0, 2, 4].map((offset) => Number.parseInt(expanded.slice(offset, offset + 2), 16)) as [number, number, number];
};

const relativeLuminance = (rgb: [number, number, number]) => {
  const [red, green, blue] = rgb.map((channel) => {
    const linear = channel / 255;
    return linear <= 0.04045 ? linear / 12.92 : ((linear + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

/** Returns the black or white foreground with the stronger WCAG contrast. */
export const getContrastingTextColor = (backgroundColor: string, fallback = '#000000') => {
  const rgb = parseHexColor(backgroundColor);
  if (!rgb) return fallback;
  const luminance = relativeLuminance(rgb);
  const blackContrast = (luminance + 0.05) / 0.05;
  const whiteContrast = 1.05 / (luminance + 0.05);
  return whiteContrast > blackContrast ? '#ffffff' : '#000000';
};
