'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  Copy,
  Check,
  Eye,
  Code2,
  Maximize2,
  Minimize2,
  AlertCircle,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize,
  Download,
} from 'lucide-react';
import { Tooltip, Modal, message } from 'antd';

export interface MosChatMermaidBlockProps {
  code: string;
  isDark?: boolean;
}

export const MosChatMermaidBlock: React.FC<MosChatMermaidBlockProps> = ({ code, isDark = false }) => {
  const [svgHtml, setSvgHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'diagram' | 'code'>('diagram');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Zoom & Pan state inside Modal
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isFullscreenWindow, setIsFullscreenWindow] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const pointerStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const cleanCode = useMemo(() => {
    let text = String(code || '').trim();
    // Strip leading ```mermaid or ``` if included in block content
    text = text
      .replace(/^```(?:mermaid)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();
    return text;
  }, [code]);

  // Extract viewBox dimensions from SVG so we know its natural width & height
  const svgDimensions = useMemo(() => {
    if (!svgHtml) return { width: 800, height: 600 };
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
    return { width: 800, height: 600 };
  }, [svgHtml]);

  // Strip inline max-width from SVG so that browser allows arbitrary scaling & zoom
  const processedSvgHtml = useMemo(() => {
    if (!svgHtml) return null;
    return svgHtml.replace(/(<svg\b[^>]*style=")([^"]*)(")/i, (_, before, styles, after) => {
      const cleanedStyles = styles
        .split(';')
        .filter((s: string) => !s.trim().toLowerCase().startsWith('max-width'))
        .join(';');
      return `${before}${cleanedStyles}${after}`;
    });
  }, [svgHtml]);

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

        mermaid.initialize({
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
                background: '#0f172a',
                primaryColor: '#8b5cf6',
                primaryTextColor: '#f8fafc',
                primaryBorderColor: '#a78bfa',
                lineColor: '#94a3b8',
                secondaryColor: '#3b82f6',
                tertiaryColor: '#1e293b',
                edgeLabelBackground: '#1e293b',
              }
            : {
                darkMode: false,
                background: '#f8fafc',
                primaryColor: '#e0e7ff',
                primaryTextColor: '#1e1b4b',
                primaryBorderColor: '#6366f1',
                lineColor: '#64748b',
                secondaryColor: '#f1f5f9',
                tertiaryColor: '#ffffff',
                edgeLabelBackground: '#ffffff',
              },
        });

        const { svg } = await mermaid.render(uniqueId, cleanCode);

        if (!isCancelled) {
          setSvgHtml(svg);
          setRenderError(null);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const errMessage = err instanceof Error ? err.message : String(err);
          // Clean up orphan DOM error elements mermaid might append to body
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

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(cleanCode);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [cleanCode]);

  // Auto-fit diagram to screen
  const handleFitToScreen = useCallback(() => {
    if (!canvasRef.current) return;
    const cw = canvasRef.current.clientWidth - 64;
    const ch = canvasRef.current.clientHeight - 64;
    if (cw <= 0 || ch <= 0) return;

    const scaleX = cw / svgDimensions.width;
    const scaleY = ch / svgDimensions.height;
    // Scale so diagram fills screen comfortably (min 0.35, max 2.5 on auto-fit)
    const fitScale = Math.min(scaleX, scaleY);
    const targetZoom = Math.min(Math.max(Math.round(fitScale * 100) / 100, 0.35), 2.5);
    setZoom(targetZoom);
    setPan({ x: 0, y: 0 });
  }, [svgDimensions]);

  // When modal opens, auto-fit to screen after DOM layout
  useEffect(() => {
    if (isModalOpen) {
      const timer = setTimeout(() => {
        handleFitToScreen();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      // Reset state on close
      setPan({ x: 0, y: 0 });
      setZoom(1);
      setIsDragging(false);
      setIsFullscreenWindow(false);
    }
  }, [isModalOpen, handleFitToScreen]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(Math.round((prev + 0.25) * 100) / 100, 5.0));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(Math.round((prev - 0.25) * 100) / 100, 0.25));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleSetPresetZoom = useCallback((preset: number) => {
    setZoom(preset);
    setPan({ x: 0, y: 0 });
  }, []);

  // Mouse Wheel Zoom via non-passive listener
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isModalOpen) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
      setZoom((prev) => {
        const next = Math.round(prev * zoomFactor * 100) / 100;
        return Math.min(Math.max(next, 0.25), 5.0);
      });
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [isModalOpen]);

  // Keyboard Shortcuts inside Modal
  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleFitToScreen();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPan((prev) => ({ ...prev, y: prev.y + 40 }));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPan((prev) => ({ ...prev, y: prev.y - 40 }));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPan((prev) => ({ ...prev, x: prev.x + 40 }));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPan((prev) => ({ ...prev, x: prev.x - 40 }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, handleZoomIn, handleZoomOut, handleFitToScreen]);

  // Pointer drag handlers for panning
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return; // Left click or touch only
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setIsDragging(true);
      pointerStartRef.current = { x: e.clientX, y: e.clientY };
      panStartRef.current = { ...pan };
    },
    [pan]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const dx = e.clientX - pointerStartRef.current.x;
      const dy = e.clientY - pointerStartRef.current.y;
      setPan({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
    },
    [isDragging]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }, []);

  // Download SVG file
  const handleDownloadSvg = useCallback(() => {
    if (!svgHtml) return;
    try {
      const blob = new Blob([svgHtml], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mermaid-diagram-${Date.now()}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success('Đã tải xuống tệp SVG thành công');
    } catch {
      message.error('Không thể tải tệp SVG');
    }
  }, [svgHtml]);

  const cardBg = isDark ? '#090d16' : '#ffffff';
  const cardBorder = isDark ? 'rgba(139, 92, 246, 0.25)' : 'rgba(139, 92, 246, 0.2)';
  const toolbarBg = isDark ? 'rgba(15, 23, 42, 0.8)' : '#f8fafc';
  const toolbarBorder = isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(226, 232, 240, 0.8)';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';

  return (
    <>
      <div
        className="my-3 rounded-2xl overflow-hidden shadow-sm transition-all text-left"
        style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
        }}
      >
        {/* Toolbar Header */}
        <div
          className="flex items-center justify-between px-3 py-1.5 text-[11px] select-none"
          style={{
            background: toolbarBg,
            borderBottom: `1px solid ${toolbarBorder}`,
            color: isDark ? '#cbd5e1' : '#475569',
          }}
        >
          <div className="flex items-center gap-1.5 font-bold">
            <Sparkles size={13} className="text-purple-500" />
            <span style={{ color: isDark ? '#e2e8f0' : '#1e293b' }}>Sơ đồ luồng (Mermaid)</span>
            {renderError && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30">
                <AlertCircle size={10} />
                Lỗi cú pháp
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* View Mode Toggle */}
            {!renderError && (
              <div
                className="flex items-center p-0.5 rounded-lg border text-[10.5px]"
                style={{
                  background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.8)',
                  borderColor: toolbarBorder,
                }}
              >
                <Tooltip title="Xem sơ đồ trực quan">
                  <button
                    type="button"
                    aria-label="Xem sơ đồ trực quan"
                    onClick={() => setViewMode('diagram')}
                    className={`p-1.5 rounded-md font-medium flex items-center justify-center transition-all cursor-pointer ${
                      viewMode === 'diagram'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : isDark
                          ? 'text-slate-400 hover:text-white hover:bg-white/5'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Eye size={13} />
                  </button>
                </Tooltip>
                <Tooltip title="Xem mã nguồn Mermaid">
                  <button
                    type="button"
                    aria-label="Xem mã nguồn Mermaid"
                    onClick={() => setViewMode('code')}
                    className={`p-1.5 rounded-md font-medium flex items-center justify-center transition-all cursor-pointer ${
                      viewMode === 'code'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : isDark
                          ? 'text-slate-400 hover:text-white hover:bg-white/5'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Code2 size={13} />
                  </button>
                </Tooltip>
              </div>
            )}

            {/* Expand / Fullscreen Button */}
            {viewMode === 'diagram' && svgHtml && (
              <Tooltip title="Xem toàn màn hình & Phóng to sơ đồ (Zoom & Pan)">
                <button
                  type="button"
                  aria-label="Xem toàn màn hình"
                  onClick={() => setIsModalOpen(true)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors cursor-pointer flex items-center justify-center"
                >
                  <Maximize2 size={13} />
                </button>
              </Tooltip>
            )}

            {/* Copy Button */}
            <Tooltip title={isCopied ? 'Đã sao chép mã Mermaid' : 'Sao chép mã nguồn Mermaid'}>
              <button
                type="button"
                aria-label="Sao chép mã nguồn Mermaid"
                onClick={handleCopy}
                className="p-1.5 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors cursor-pointer flex items-center justify-center"
              >
                {isCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Content Body */}
        {viewMode === 'diagram' ? (
          <div
            ref={containerRef}
            className="p-4 overflow-x-auto min-h-[140px] flex items-center justify-center transition-all select-text"
            style={{
              background: isDark ? '#0b1120' : '#ffffff',
            }}
          >
            {isLoading ? (
              <div className="flex items-center gap-2 text-[12px] text-slate-400 py-6">
                <div className="w-3.5 h-3.5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span>Đang kết xuất sơ đồ...</span>
              </div>
            ) : svgHtml ? (
              <div
                className="w-full flex justify-center [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:block [&>svg]:mx-auto cursor-pointer group relative transition-transform hover:scale-[1.005]"
                onClick={() => setIsModalOpen(true)}
                title="Bấm để mở to và phóng to sơ đồ (Zoom & Pan)"
              >
                <div
                  className="w-full flex justify-center [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:block [&>svg]:mx-auto"
                  dangerouslySetInnerHTML={{ __html: processedSvgHtml || svgHtml }}
                />
                {/* Floating pill hint on hover */}
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 backdrop-blur text-white text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md pointer-events-none">
                  <Maximize2 size={12} className="text-purple-400" />
                  <span>Phóng to & Zoom</span>
                </div>
              </div>
            ) : (
              <div className="text-[12px] text-slate-400 py-6">Không có dữ liệu sơ đồ</div>
            )}
          </div>
        ) : (
          <div className="relative">
            {renderError && (
              <div className="px-3 py-1.5 text-[11px] bg-amber-500/10 text-amber-400 border-b border-amber-500/20 flex items-center gap-1.5">
                <AlertCircle size={12} className="shrink-0" />
                <span>Không thể kết xuất sơ đồ dạng đồ họa. Hiển thị mã nguồn gốc bên dưới.</span>
              </div>
            )}
            <pre
              className="p-3 text-[11.5px] font-mono leading-relaxed overflow-x-auto m-0 select-text"
              style={{
                background: isDark ? '#0b1120' : '#f8fafc',
                color: textColor,
              }}
            >
              <code>{cleanCode}</code>
            </pre>
          </div>
        )}
      </div>

      {/* Fullscreen / Interactive Zoom Modal */}
      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={isFullscreenWindow ? '100vw' : 'min(96vw, 1360px)'}
        centered={!isFullscreenWindow}
        destroyOnHidden
        className={isFullscreenWindow ? 'm-0 p-0 top-0 max-w-none' : ''}
        style={isFullscreenWindow ? { top: 0, padding: 0, margin: 0, maxWidth: '100vw' } : { top: 20 }}
        styles={{
          content: {
            padding: '16px 20px',
            background: isDark ? '#0b1120' : '#ffffff',
            borderRadius: isFullscreenWindow ? '0px' : '18px',
            border: `1px solid ${cardBorder}`,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          },
        }}
        title={
          <div className="flex items-center justify-between gap-3 text-[14px] font-bold pr-6 select-none flex-wrap">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-purple-500" />
              <span style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>Sơ đồ quy trình (Toàn màn hình & Phóng to)</span>
            </div>

            {/* Quick Action Toolbar inside Header */}
            <div className="flex items-center gap-1.5 text-xs font-normal">
              {/* Zoom Out */}
              <Tooltip title="Thu nhỏ (Phím -)">
                <button
                  type="button"
                  aria-label="Thu nhỏ sơ đồ"
                  onClick={handleZoomOut}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <ZoomOut size={14} />
                </button>
              </Tooltip>

              {/* Zoom Percentage Badge */}
              <Tooltip title="Bấm để đặt lại 100%">
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className={`px-2.5 py-1 rounded-lg border text-[11.5px] font-mono tabular-nums transition-all cursor-pointer font-bold ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700 text-purple-400 hover:bg-slate-700'
                      : 'bg-white border-slate-200 text-purple-600 hover:bg-slate-100'
                  }`}
                >
                  {Math.round(zoom * 100)}%
                </button>
              </Tooltip>

              {/* Zoom In */}
              <Tooltip title="Phóng to (Phím +)">
                <button
                  type="button"
                  aria-label="Phóng to sơ đồ"
                  onClick={handleZoomIn}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <ZoomIn size={14} />
                </button>
              </Tooltip>

              {/* Fit Screen */}
              <Tooltip title="Vừa khung hình (Phím 0)">
                <button
                  type="button"
                  aria-label="Vừa khung hình"
                  onClick={handleFitToScreen}
                  className={`px-2 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Maximize size={13} />
                  <span className="hidden sm:inline">Vừa khung</span>
                </button>
              </Tooltip>

              {/* Reset 100% */}
              <Tooltip title="Đặt lại kích thước gốc 100% & giữa màn hình">
                <button
                  type="button"
                  aria-label="Đặt lại 100%"
                  onClick={handleResetZoom}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <RotateCcw size={13} />
                </button>
              </Tooltip>

              <div className="w-[1px] h-4 bg-slate-500/20 mx-0.5" />

              {/* Toggle Fullscreen Window */}
              <Tooltip title={isFullscreenWindow ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình trình duyệt'}>
                <button
                  type="button"
                  aria-label={isFullscreenWindow ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình trình duyệt'}
                  onClick={() => setIsFullscreenWindow((prev) => !prev)}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {isFullscreenWindow ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </button>
              </Tooltip>

              {/* Download SVG */}
              <Tooltip title="Tải xuống tệp đồ họa vector (SVG)">
                <button
                  type="button"
                  aria-label="Tải xuống tệp SVG"
                  onClick={handleDownloadSvg}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Download size={13} />
                </button>
              </Tooltip>

              {/* Copy Code */}
              <Tooltip title={isCopied ? 'Đã sao chép' : 'Sao chép mã nguồn Mermaid'}>
                <button
                  type="button"
                  aria-label="Sao chép mã Mermaid"
                  onClick={handleCopy}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {isCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                </button>
              </Tooltip>
            </div>
          </div>
        }
      >
        {/* Canvas Viewport */}
        <div
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={handleFitToScreen}
          className={`relative w-full overflow-hidden rounded-xl select-none transition-all touch-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{
            height: isFullscreenWindow ? 'calc(100vh - 100px)' : '76vh',
            background: isDark
              ? 'radial-gradient(circle, rgba(148, 163, 184, 0.18) 1.2px, #0b1120 1.2px) 0 0 / 24px 24px'
              : 'radial-gradient(circle, rgba(100, 116, 139, 0.22) 1.2px, #f8fafc 1.2px) 0 0 / 24px 24px',
            border: isDark ? '1px solid rgba(148, 163, 184, 0.15)' : '1px solid rgba(226, 232, 240, 0.9)',
          }}
        >
          {/* Centered Canvas Container with smooth Transform */}
          <div className="w-full h-full flex items-center justify-center pointer-events-none">
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.12s cubic-bezier(0.2, 0, 0, 1)',
                width: `${svgDimensions.width}px`,
                height: `${svgDimensions.height}px`,
              }}
              className="pointer-events-auto flex items-center justify-center shrink-0 [&_svg]:!max-w-none [&_svg]:w-full [&_svg]:h-full [&_svg]:block"
              dangerouslySetInnerHTML={{ __html: processedSvgHtml || '' }}
            />
          </div>

          {/* Floating HUD Helper & Preset Zoom Controls */}
          <div
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md border text-[11px] select-none pointer-events-auto"
            style={{
              background: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)',
              borderColor: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(203, 213, 225, 0.8)',
              color: isDark ? '#cbd5e1' : '#475569',
            }}
          >
            <span className="hidden md:inline font-medium">
              💡 Cuộn chuột / Phím +/- để phóng to • Kéo rê để di chuyển • Nhấp đúp để vừa khung
            </span>

            <div className="flex items-center gap-1 pl-1 font-mono text-[10.5px]">
              {[0.5, 0.75, 1, 1.5, 2].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSetPresetZoom(preset)}
                  className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                    Math.abs(zoom - preset) < 0.05
                      ? 'bg-purple-600 text-white font-bold'
                      : isDark
                        ? 'hover:bg-slate-700 text-slate-400'
                        : 'hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {Math.round(preset * 100)}%
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default MosChatMermaidBlock;
