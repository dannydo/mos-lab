'use client';

import { useEffect, useMemo, useState } from 'react';
import type { MermaidViewMode, SvgDimensions } from './mermaidBlockTypes';
import {
  buildMermaidInitializeConfig,
  extractSvgDimensions,
  stripMermaidFences,
  stripSvgInlineMaxWidth,
} from './mermaidBlockUtils';

export interface UseMermaidRendererOptions {
  code: string;
  isDark: boolean;
}

export interface UseMermaidRendererResult {
  cleanCode: string;
  svgHtml: string | null;
  processedSvgHtml: string | null;
  svgDimensions: SvgDimensions;
  isLoading: boolean;
  renderError: string | null;
  viewMode: MermaidViewMode;
  setViewMode: React.Dispatch<React.SetStateAction<MermaidViewMode>>;
}

/**
 * Dynamically imports Mermaid, renders the cleaned diagram definition to SVG,
 * and cleans up any orphan error elements Mermaid inserts into document.body.
 */
export function useMermaidRenderer({ code, isDark }: UseMermaidRendererOptions): UseMermaidRendererResult {
  const [svgHtml, setSvgHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<MermaidViewMode>('diagram');

  const cleanCode = useMemo(() => stripMermaidFences(code), [code]);
  const svgDimensions = useMemo(() => extractSvgDimensions(svgHtml), [svgHtml]);
  const processedSvgHtml = useMemo(() => stripSvgInlineMaxWidth(svgHtml), [svgHtml]);

  useEffect(() => {
    let isCancelled = false;
    const uniqueId = `mermaid_svg_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`;

    async function renderMermaid() {
      if (!cleanCode) {
        setIsLoading(false);
        setSvgHtml(null);
        return;
      }

      setIsLoading(true);
      setRenderError(null);

      try {
        const mermaidModule = await import('mermaid');
        const mermaid = mermaidModule.default;

        mermaid.initialize(buildMermaidInitializeConfig(isDark));

        const { svg } = await mermaid.render(uniqueId, cleanCode);

        if (!isCancelled) {
          setSvgHtml(svg);
          setRenderError(null);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const errMessage = err instanceof Error ? err.message : String(err);
          const orphanErr = document.getElementById(`d${uniqueId}`);
          if (orphanErr) {
            orphanErr.remove();
          }
          setRenderError(errMessage);
          setIsLoading(false);
          setViewMode('code');
        }
      }
    }

    renderMermaid();

    return () => {
      isCancelled = true;
      const orphan = document.getElementById(`d${uniqueId}`);
      if (orphan) orphan.remove();
    };
  }, [cleanCode, isDark]);

  return {
    cleanCode,
    svgHtml,
    processedSvgHtml,
    svgDimensions,
    isLoading,
    renderError,
    viewMode,
    setViewMode,
  };
}
