'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Copy, Check, Eye, Code2, Maximize2, AlertCircle, Sparkles } from 'lucide-react';
import { Tooltip, Modal } from 'antd';

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
  const containerRef = useRef<HTMLDivElement>(null);

  const cleanCode = React.useMemo(() => {
    let text = String(code || '').trim();
    // Strip leading ```mermaid or ``` if included in block content
    text = text
      .replace(/^```(?:mermaid)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();
    return text;
  }, [code]);

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
            useMaxWidth: true,
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
                <button
                  type="button"
                  onClick={() => setViewMode('diagram')}
                  className={`px-2 py-0.5 rounded-md font-medium flex items-center gap-1 transition-all cursor-pointer ${
                    viewMode === 'diagram'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : isDark
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye size={11} />
                  <span>Sơ đồ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('code')}
                  className={`px-2 py-0.5 rounded-md font-medium flex items-center gap-1 transition-all cursor-pointer ${
                    viewMode === 'code'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : isDark
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Code2 size={11} />
                  <span>Mã code</span>
                </button>
              </div>
            )}

            {/* Expand / Fullscreen Button */}
            {viewMode === 'diagram' && svgHtml && (
              <Tooltip title="Xem toàn màn hình / Phóng to sơ đồ">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="p-1 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors cursor-pointer"
                >
                  <Maximize2 size={12} />
                </button>
              </Tooltip>
            )}

            {/* Copy Button */}
            <Tooltip title="Sao chép mã nguồn Mermaid">
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors cursor-pointer flex items-center gap-1 text-[10.5px]"
              >
                {isCopied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                <span>{isCopied ? 'Đã chép' : 'Sao chép'}</span>
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
                className="w-full flex justify-center [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:block [&>svg]:mx-auto"
                dangerouslySetInnerHTML={{ __html: svgHtml }}
              />
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

      {/* Fullscreen / Zoom Modal */}
      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width="min(95vw, 1100px)"
        centered
        destroyOnClose
        styles={{
          content: {
            padding: '20px',
            background: isDark ? '#0b1120' : '#ffffff',
            borderRadius: '16px',
            border: `1px solid ${cardBorder}`,
          },
        }}
        title={
          <div className="flex items-center gap-2 text-[14px] font-bold">
            <Sparkles size={16} className="text-purple-500" />
            <span style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>Sơ đồ quy trình (Toàn màn hình)</span>
          </div>
        }
      >
        <div className="py-4 overflow-auto max-h-[80vh] flex items-center justify-center [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:block [&>svg]:mx-auto">
          {svgHtml && <div dangerouslySetInnerHTML={{ __html: svgHtml }} />}
        </div>
      </Modal>
    </>
  );
};

export default MosChatMermaidBlock;
