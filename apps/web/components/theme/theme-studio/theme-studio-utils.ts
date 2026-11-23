import type { ThemePresetInput } from '@mos-lab/shared';

export function extractDominantHexesFromImageData(imageData: Uint8ClampedArray): string[] {
  // Quantize colors into map
  const colorCounts: Record<string, { count: number; r: number; g: number; b: number }> = {};
  for (let i = 0; i < imageData.length; i += 16) {
    const r = Math.round(imageData[i] / 16) * 16;
    const g = Math.round(imageData[i + 1] / 16) * 16;
    const b = Math.round(imageData[i + 2] / 16) * 16;
    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    if (!colorCounts[hex]) {
      colorCounts[hex] = { count: 1, r, g, b };
    } else {
      colorCounts[hex].count++;
    }
  }

  return Object.entries(colorCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([hex]) => hex);
}

export function buildThemePresetCodeSnippet(input: ThemePresetInput): string {
  return `// Thêm vào packages/shared/src/theme/tokens.ts
export const ${input.id.replace(/[^a-zA-Z0-9]/g, '_')}Theme = defineTheme({
  id: '${input.id}',
  label: '${input.label}',
  description: '${input.description}',
  base: '${input.base}',
  colors: {
    primary: '${input.colors.primary}',
    bgLayout: '${input.colors.bgLayout}',
    bgContainer: '${input.colors.bgContainer}',
    bgElevated: '${input.colors.bgElevated}',
    borderColor: '${input.colors.borderColor}',
    textPrimary: '${input.colors.textPrimary}',
    textSecondary: '${input.colors.textSecondary}',
  },
});`;
}
