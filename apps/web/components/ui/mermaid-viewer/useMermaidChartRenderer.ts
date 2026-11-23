'use client';

import { useEffect, useState } from 'react';
import { buildMermaidViewerConfig, injectCustomSvgStyles } from './mermaidSvgUtils';

export interface UseMermaidChartRendererOptions {
  chart: string;
  isDark: boolean;
}

export interface UseMermaidChartRendererResult {
  svgContent: string;
  loading: boolean;
  error: string | null;
}

export function useMermaidChartRenderer({
  chart,
  isDark,
}: UseMermaidChartRendererOptions): UseMermaidChartRendererResult {
  const [svgContent, setSvgContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const id = `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`;
    setLoading(true);
    setError(null);

    async function renderChart() {
      try {
        const mermaidModule = await import('mermaid');
        const mermaid = mermaidModule.default;

        mermaid.initialize(buildMermaidViewerConfig(isDark));

        const { svg } = await mermaid.render(id, chart);
        const styledSvg = injectCustomSvgStyles(svg, id, isDark);

        if (isMounted) {
          setSvgContent(styledSvg);
          setLoading(false);
        }
      } catch (err: unknown) {
        console.error('Mermaid render error:', err);
        const orphanErr = document.getElementById(`d${id}`);
        if (orphanErr) orphanErr.remove();

        if (isMounted) {
          const errMessage =
            err instanceof Error
              ? err.message
              : typeof err === 'object' && err !== null && 'message' in err
                ? String((err as { message?: unknown }).message || 'Lỗi render sơ đồ Mermaid')
                : 'Lỗi render sơ đồ Mermaid';
          setError(errMessage || 'Lỗi render sơ đồ Mermaid');
          setLoading(false);
        }
      }
    }

    renderChart();

    return () => {
      isMounted = false;
      const orphanErr = document.getElementById(`d${id}`);
      if (orphanErr) orphanErr.remove();
    };
  }, [chart, isDark]);

  return { svgContent, loading, error };
}
