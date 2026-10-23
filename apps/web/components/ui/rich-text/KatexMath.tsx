'use client';

import React, { useMemo } from 'react';
import katex from 'katex';

export interface KatexMathProps {
  math: string;
  block?: boolean;
  className?: string;
}

/**
 * Kiểm tra xem một chuỗi có phải cú pháp công thức Toán LaTeX hợp lệ hay không.
 * Ngăn chặn việc parse nhầm số tiền hoặc ký tự dollar thông thường ($100, $200).
 */
export function isMathValid(tex: string): boolean {
  if (!tex || !tex.trim()) return false;
  const trimmed = tex.trim();
  // Nếu bắt đầu bằng chữ số và không chứa ký tự toán học hoặc lệnh LaTeX escape, nhiều khả năng là tiền tệ
  if (/^\d/.test(trimmed) && !/[\\=+\-*\/^_<>%]/.test(trimmed)) {
    return false;
  }
  try {
    katex.renderToString(trimmed, {
      throwOnError: true,
      strict: (errorCode) => {
        if (errorCode === 'unicodeTextInMathMode') return 'error';
        return 'ignore';
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Component hiển thị công thức Toán học KaTeX chuẩn:
 * Hỗ trợ cả Inline Math ($...$) và Display/Block Math ($$...$$).
 */
export const KatexMath: React.FC<KatexMathProps> = ({ math, block = false, className = '' }) => {
  const cleanMath = useMemo(() => {
    let text = String(math || '').trim();
    if (block) {
      if (text.startsWith('$$') && text.endsWith('$$') && text.length > 2) {
        text = text.slice(2, -2).trim();
      }
    } else {
      if (text.startsWith('$') && text.endsWith('$') && text.length > 1) {
        text = text.slice(1, -1).trim();
      }
    }
    return text;
  }, [math, block]);

  const html = useMemo(() => {
    if (!cleanMath) return null;
    try {
      return katex.renderToString(cleanMath, {
        displayMode: block,
        throwOnError: false,
        strict: 'ignore',
        trust: true,
      });
    } catch {
      return null;
    }
  }, [cleanMath, block]);

  if (!html) {
    return (
      <span className={`font-mono text-[0.875em] ${className}`}>{block ? `$$${cleanMath}$$` : `$${cleanMath}$`}</span>
    );
  }

  if (block) {
    return (
      <div
        className={`my-2 py-2 px-3 overflow-x-auto text-center rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/10 select-text ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      className={`inline-block align-baseline px-0.5 select-text mx-0.5 ${className}`}
      title={`LaTeX: ${cleanMath}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
