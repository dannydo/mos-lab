'use client';

import React, { useMemo, useState } from 'react';
import { Copy, Check, Eye, Code2 } from 'lucide-react';
import { Tooltip, message as antdMessage } from 'antd';
import katex from 'katex';

export interface MosChatMathBlockProps {
  math: string;
  isDark?: boolean;
}

export { isMathValid } from '../ui/rich-text/KatexMath';

/**
 * Component hiển thị khối công thức toán học chuyên dụng trong Bong bóng Chat (MAI Copilot & Spaces).
 * Cho phép xem trực quan công thức, xem mã nguồn LaTeX và 1-click sao chép.
 */
export const MosChatMathBlock: React.FC<MosChatMathBlockProps> = ({ math, isDark = false }) => {
  const [viewMode, setViewMode] = useState<'rendered' | 'latex'>('rendered');
  const [copied, setCopied] = useState<boolean>(false);

  const cleanMath = useMemo(() => {
    let text = String(math || '').trim();
    if (text.startsWith('$$') && text.endsWith('$$') && text.length > 2) {
      text = text.slice(2, -2).trim();
    }
    return text;
  }, [math]);

  const renderedHtml = useMemo(() => {
    if (!cleanMath) return null;
    try {
      return katex.renderToString(cleanMath, {
        displayMode: true,
        throwOnError: false,
        strict: 'ignore',
        trust: true,
      });
    } catch {
      return null;
    }
  }, [cleanMath]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard?.writeText(cleanMath);
    setCopied(true);
    antdMessage.success('Đã sao chép công thức LaTeX');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!cleanMath) return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="group relative my-2 rounded-xl overflow-hidden transition-all text-left select-text"
      style={{
        background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Top Header Toolbar */}
      <div
        className="flex items-center justify-between px-3 py-1 text-[10.5px] border-b select-none"
        style={{
          background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
          color: isDark ? '#94a3b8' : '#64748b',
        }}
      >
        <span className="font-semibold flex items-center gap-1.5">
          <span className="text-amber-500 font-serif italic text-xs font-bold">ƒ(x)</span>
          <span>Công thức Toán học</span>
        </span>

        <div className="flex items-center gap-1.5">
          {/* Mode Switcher: Rendered vs LaTeX Code */}
          <div
            className="flex items-center p-0.5 rounded-md"
            style={{ background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)' }}
          >
            <Tooltip title="Hiển thị công thức trực quan">
              <button
                type="button"
                aria-label="Hiển thị công thức trực quan"
                onClick={() => setViewMode('rendered')}
                className={`p-1 rounded cursor-pointer transition-all ${
                  viewMode === 'rendered'
                    ? 'bg-amber-500 text-black shadow-xs font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye size={12} />
              </button>
            </Tooltip>
            <Tooltip title="Xem mã nguồn LaTeX">
              <button
                type="button"
                aria-label="Xem mã nguồn LaTeX"
                onClick={() => setViewMode('latex')}
                className={`p-1 rounded cursor-pointer transition-all ${
                  viewMode === 'latex'
                    ? 'bg-amber-500 text-black shadow-xs font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 size={12} />
              </button>
            </Tooltip>
          </div>

          {/* Copy Button */}
          <Tooltip title="Sao chép mã LaTeX">
            <button
              type="button"
              aria-label="Sao chép mã LaTeX"
              onClick={handleCopy}
              className="p-1 px-1.5 rounded-md cursor-pointer flex items-center gap-1 transition-all hover:bg-black/10 dark:hover:bg-white/10"
              style={{ color: copied ? '#10b981' : isDark ? '#cbd5e1' : '#475569' }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              <span className="text-[10px] font-medium">{copied ? 'Đã chép' : 'Sao chép'}</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Content Body */}
      {viewMode === 'rendered' && renderedHtml ? (
        <div
          className="p-3 overflow-x-auto text-center font-normal leading-relaxed text-[13.5px] select-text"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      ) : (
        <pre
          className="p-3 m-0 overflow-x-auto text-[11.5px] font-mono leading-relaxed select-text"
          style={{
            background: isDark ? '#090d16' : '#f8fafc',
            color: isDark ? '#f1f5f9' : '#0f172a',
          }}
        >
          <code>{cleanMath}</code>
        </pre>
      )}
    </div>
  );
};

/**
 * Hiển thị công thức toán học nội dòng (Inline Math $...$)
 */
export const MosChatMathInline: React.FC<{ math: string }> = ({ math }) => {
  const cleanMath = useMemo(() => {
    let text = String(math || '').trim();
    if (text.startsWith('$') && text.endsWith('$') && text.length > 1) {
      text = text.slice(1, -1).trim();
    }
    return text;
  }, [math]);

  const html = useMemo(() => {
    if (!cleanMath) return null;
    try {
      return katex.renderToString(cleanMath, {
        displayMode: false,
        throwOnError: false,
        strict: 'ignore',
        trust: true,
      });
    } catch {
      return null;
    }
  }, [cleanMath]);

  if (!html) {
    return <span className="font-mono text-[0.9em]">${cleanMath}$</span>;
  }

  return (
    <span
      className="inline-block align-baseline px-0.5 select-text mx-0.5"
      title={`LaTeX: ${cleanMath}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
