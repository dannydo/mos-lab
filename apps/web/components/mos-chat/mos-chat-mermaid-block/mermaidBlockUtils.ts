import type { MermaidConfig } from 'mermaid';
import type { SvgDimensions } from './mermaidBlockTypes';

export const DEFAULT_SVG_DIMENSIONS: SvgDimensions = { width: 800, height: 600 };

export const MERMAID_ZOOM_PRESETS = [0.5, 0.75, 1, 1.5, 2] as const;

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 5.0;
export const ZOOM_STEP = 0.25;
export const AUTO_FIT_MIN_ZOOM = 0.35;
export const AUTO_FIT_MAX_ZOOM = 2.5;
export const KEYBOARD_PAN_STEP = 40;

/**
 * Strip leading ```mermaid / ``` and trailing ``` code fences from raw block content.
 */
export function stripMermaidFences(rawCode: string): string {
  return String(rawCode || '')
    .trim()
    .replace(/^```(?:mermaid)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();
}

/**
 * Extract natural SVG dimensions from its viewBox attribute, falling back to default dimensions.
 */
export function extractSvgDimensions(svgHtml: string | null): SvgDimensions {
  if (!svgHtml) return DEFAULT_SVG_DIMENSIONS;
  const match = svgHtml.match(/viewBox="([^"]+)"/i);
  if (match) {
    const parts = match[1]
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }
  return DEFAULT_SVG_DIMENSIONS;
}

/**
 * Strip inline max-width from Mermaid's generated <svg> style attribute so arbitrary zoom scaling works.
 */
export function stripSvgInlineMaxWidth(svgHtml: string | null): string | null {
  if (!svgHtml) return null;
  return svgHtml.replace(/(<svg\b[^>]*style=")([^"]*)(")/i, (_, before: string, styles: string, after: string) => {
    const cleanedStyles = styles
      .split(';')
      .filter((s: string) => !s.trim().toLowerCase().startsWith('max-width'))
      .join(';');
    return `${before}${cleanedStyles}${after}`;
  });
}

/**
 * Clamp and round zoom factor to two decimal places within [MIN_ZOOM, MAX_ZOOM].
 */
export function clampZoom(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return Math.min(Math.max(rounded, MIN_ZOOM), MAX_ZOOM);
}

/**
 * Compute optimal zoom ratio so the rendered SVG fits comfortably inside the viewport canvas.
 */
export function computeAutoFitZoom(
  canvasWidth: number,
  canvasHeight: number,
  svgDimensions: SvgDimensions
): number | null {
  const usableWidth = canvasWidth - 64;
  const usableHeight = canvasHeight - 64;
  if (usableWidth <= 0 || usableHeight <= 0) return null;

  const scaleX = usableWidth / svgDimensions.width;
  const scaleY = usableHeight / svgDimensions.height;
  const fitScale = Math.min(scaleX, scaleY);
  return Math.min(Math.max(Math.round(fitScale * 100) / 100, AUTO_FIT_MIN_ZOOM), AUTO_FIT_MAX_ZOOM);
}

/**
 * Build Mermaid theme and flowchart configuration matching light/dark chat surfaces.
 */
export function buildMermaidInitializeConfig(isDark: boolean): MermaidConfig {
  return {
    startOnLoad: false,
    theme: isDark ? 'dark' : 'neutral',
    securityLevel: 'loose',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    flowchart: {
      htmlLabels: true,
      useMaxWidth: false,
      curve: 'basis',
      nodeSpacing: 45,
      rankSpacing: 45,
      padding: 16,
    },
    themeVariables: isDark
      ? {
          darkMode: true,
          background: 'rgb(15, 23, 42)',
          primaryColor: 'rgb(139, 92, 246)',
          primaryTextColor: 'rgb(248, 250, 252)',
          primaryBorderColor: 'rgb(167, 139, 250)',
          lineColor: 'rgb(148, 163, 184)',
          secondaryColor: 'rgb(59, 130, 246)',
          tertiaryColor: 'rgb(30, 41, 59)',
          edgeLabelBackground: 'rgb(30, 41, 59)',
        }
      : {
          darkMode: false,
          background: 'rgb(248, 250, 252)',
          primaryColor: 'rgb(224, 231, 255)',
          primaryTextColor: 'rgb(30, 27, 75)',
          primaryBorderColor: 'rgb(99, 102, 241)',
          lineColor: 'rgb(100, 116, 139)',
          secondaryColor: 'rgb(241, 245, 249)',
          tertiaryColor: 'rgb(255, 255, 255)',
          edgeLabelBackground: 'rgb(255, 255, 255)',
        },
  };
}
