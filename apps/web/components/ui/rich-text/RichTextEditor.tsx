'use client';

import React, { useRef, useState, useCallback, useId } from 'react';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code,
  SquareCode,
  Link as LinkIcon,
  Minus,
  Eye,
  PenLine,
  Columns2,
} from 'lucide-react';
import { RichTextViewer } from './RichTextViewer';

export interface RichTextEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
  showToolbar?: boolean;
  showPreviewTab?: boolean;
  defaultTab?: 'edit' | 'preview';
}

export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder = 'Nhập nội dung (hỗ trợ định dạng rich text & markdown)…',
  maxLength,
  rows = 5,
  autoFocus = false,
  disabled = false,
  className = '',
  showToolbar = true,
  showPreviewTab = true,
  defaultTab = 'edit',
}: RichTextEditorProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>(defaultTab);
  const [splitView, setSplitView] = useState(false);

  // Helper to wrap or insert text at cursor position in textarea
  const insertFormatting = useCallback(
    (prefix: string, suffix = '', defaultText = '') => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = value.slice(start, end) || defaultText;
      const replacement = `${prefix}${selected}${suffix}`;
      const nextValue = value.slice(0, start) + replacement + value.slice(end);

      if (maxLength && nextValue.length > maxLength) return;

      onChange(nextValue);

      // Re-focus and restore selection
      requestAnimationFrame(() => {
        textarea.focus();
        if (selected && selected !== defaultText) {
          textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
        } else {
          // Put cursor inside formatting markers
          const cursorPosition = start + prefix.length;
          textarea.setSelectionRange(cursorPosition, cursorPosition + defaultText.length);
        }
      });
    },
    [value, onChange, maxLength]
  );

  // Toggle line prefix like `- `, `1. `, `# `
  const toggleLinePrefix = useCallback(
    (prefix: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = value.indexOf('\n', start);
      const effectiveLineEnd = lineEnd === -1 ? value.length : lineEnd;
      const currentLine = value.slice(lineStart, effectiveLineEnd);

      let nextLine: string;
      if (currentLine.startsWith(prefix)) {
        nextLine = currentLine.slice(prefix.length);
      } else {
        nextLine = `${prefix}${currentLine}`;
      }

      const nextValue = value.slice(0, lineStart) + nextLine + value.slice(effectiveLineEnd);
      if (maxLength && nextValue.length > maxLength) return;

      onChange(nextValue);

      requestAnimationFrame(() => {
        textarea.focus();
        const cursorOffset = nextLine.length - currentLine.length;
        textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
      });
    },
    [value, onChange, maxLength]
  );

  // Handle smart Enter (continue lists) & Keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Shortcuts: Cmd/Ctrl + B, Cmd/Ctrl + I, Cmd/Ctrl + K
    const isCmdOrCtrl = e.metaKey || e.ctrlKey;
    if (isCmdOrCtrl && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      insertFormatting('**', '**', 'văn bản in đậm');
      return;
    }
    if (isCmdOrCtrl && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      insertFormatting('*', '*', 'văn bản in nghiêng');
      return;
    }
    if (isCmdOrCtrl && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      insertFormatting('[', '](https://)', 'tiêu đề liên kết');
      return;
    }

    // Smart Enter for list items
    if (e.key === 'Enter' && !e.shiftKey) {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const currentLine = value.slice(lineStart, start);

      // Check bullet list: `- `, `* `, `+ `
      const bulletMatch = currentLine.match(/^(\s*)([-*+])\s*(.*)$/);
      if (bulletMatch) {
        e.preventDefault();
        const [, indent, bullet, rest] = bulletMatch;
        if (!rest.trim()) {
          // Empty item: clear line bullet
          const nextValue = value.slice(0, lineStart) + value.slice(start);
          onChange(nextValue);
          requestAnimationFrame(() => {
            textarea.setSelectionRange(lineStart, lineStart);
          });
        } else {
          // Continue bullet list
          const insertion = `\n${indent}${bullet} `;
          const nextValue = value.slice(0, start) + insertion + value.slice(start);
          onChange(nextValue);
          requestAnimationFrame(() => {
            textarea.setSelectionRange(start + insertion.length, start + insertion.length);
          });
        }
        return;
      }

      // Check ordered list: `1. `
      const orderedMatch = currentLine.match(/^(\s*)(\d+)\.\s*(.*)$/);
      if (orderedMatch) {
        e.preventDefault();
        const [, indent, numStr, rest] = orderedMatch;
        if (!rest.trim()) {
          // Empty item: clear line number
          const nextValue = value.slice(0, lineStart) + value.slice(start);
          onChange(nextValue);
          requestAnimationFrame(() => {
            textarea.setSelectionRange(lineStart, lineStart);
          });
        } else {
          // Continue ordered list with incremented number
          const nextNum = parseInt(numStr, 10) + 1;
          const insertion = `\n${indent}${nextNum}. `;
          const nextValue = value.slice(0, start) + insertion + value.slice(start);
          onChange(nextValue);
          requestAnimationFrame(() => {
            textarea.setSelectionRange(start + insertion.length, start + insertion.length);
          });
        }
        return;
      }

      // Check task list: `- [ ] ` or `- [x] `
      const taskMatch = currentLine.match(/^(\s*)([-*+])\s+\[([ xX])\]\s*(.*)$/);
      if (taskMatch) {
        e.preventDefault();
        const [, indent, bullet, , rest] = taskMatch;
        if (!rest.trim()) {
          const nextValue = value.slice(0, lineStart) + value.slice(start);
          onChange(nextValue);
          requestAnimationFrame(() => {
            textarea.setSelectionRange(lineStart, lineStart);
          });
        } else {
          const insertion = `\n${indent}${bullet} [ ] `;
          const nextValue = value.slice(0, start) + insertion + value.slice(start);
          onChange(nextValue);
          requestAnimationFrame(() => {
            textarea.setSelectionRange(start + insertion.length, start + insertion.length);
          });
        }
        return;
      }
    }
  };

  const remainingChars = maxLength ? maxLength - value.length : null;
  const isNearLimit = remainingChars !== null && remainingChars < 100;

  return (
    <div
      className={`overflow-hidden rounded-lg border border-slate-300 bg-white transition-colors focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 ${className}`}
    >
      {/* Top Bar: Tabs & Formatting Toolbar */}
      {showToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-200 bg-slate-50/80 px-2 py-1.5 dark:border-slate-800 dark:bg-slate-800/60">
          {/* Left: Formatting buttons */}
          <div className="flex flex-wrap items-center gap-0.5">
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => insertFormatting('**', '**', 'in đậm')}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-700 hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              title="In đậm (Ctrl+B)"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => insertFormatting('*', '*', 'in nghiêng')}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-700 hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              title="In nghiêng (Ctrl+I)"
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
            <div className="mx-1 h-3.5 w-[1px] bg-slate-200 dark:bg-slate-700" />
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => toggleLinePrefix('# ')}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-700 hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              title="Tiêu đề 1"
            >
              <Heading1 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => toggleLinePrefix('## ')}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-700 hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              title="Tiêu đề 2"
            >
              <Heading2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => toggleLinePrefix('### ')}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-700 hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              title="Tiêu đề 3"
            >
              <Heading3 className="h-3.5 w-3.5" />
            </button>
            <div className="mx-1 h-3.5 w-[1px] bg-slate-200 dark:bg-slate-700" />
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => toggleLinePrefix('- ')}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-700 hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              title="Danh sách gạch đầu dòng"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => toggleLinePrefix('1. ')}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-700 hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              title="Danh sách đánh số"
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => toggleLinePrefix('- [ ] ')}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-700 hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              title="Danh sách công việc (Checklist)"
            >
              <ListTodo className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => toggleLinePrefix('> ')}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-700 hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              title="Trích dẫn / Lưu ý"
            >
              <Quote className="h-3.5 w-3.5" />
            </button>
            <div className="mx-1 h-3.5 w-[1px] bg-slate-200 dark:bg-slate-700" />
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => insertFormatting('`', '`', 'mã')}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-700 hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              title="Đoạn mã inline"
            >
              <Code className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => insertFormatting('```\n', '\n```', 'khối mã')}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-700 hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              title="Khối mã (Code block)"
            >
              <SquareCode className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => insertFormatting('[', '](https://)', 'liên kết')}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-700 hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              title="Chèn liên kết (Ctrl+K)"
            >
              <LinkIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => insertFormatting('\n---\n')}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-700 hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              title="Đường phân cách"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Right: Tab Mode Switcher (Soạn thảo vs Xem trước vs Chia đôi) */}
          {showPreviewTab && (
            <div className="flex items-center gap-1 rounded bg-slate-200/60 p-0.5 text-xs dark:bg-slate-700/60">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('edit');
                  setSplitView(false);
                }}
                className={`inline-flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors ${
                  activeTab === 'edit' && !splitView
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <PenLine className="h-3 w-3" />
                <span>Soạn thảo</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('preview');
                  setSplitView(false);
                }}
                className={`inline-flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors ${
                  activeTab === 'preview' && !splitView
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Eye className="h-3 w-3" />
                <span>Xem trước</span>
              </button>
              <button
                type="button"
                onClick={() => setSplitView((v) => !v)}
                className={`hidden md:inline-flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors ${
                  splitView
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
                title="Xem song song"
              >
                <Columns2 className="h-3 w-3" />
                <span>Song song</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Editor Body */}
      <div
        className={
          splitView
            ? 'grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800'
            : ''
        }
      >
        {/* Write View */}
        {(activeTab === 'edit' || splitView) && (
          <div className="relative">
            <textarea
              ref={textareaRef}
              id={inputId}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={rows}
              autoFocus={autoFocus}
              disabled={disabled}
              maxLength={maxLength}
              className="w-full resize-y border-0 bg-transparent p-3 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-0 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
        )}

        {/* Preview View */}
        {(activeTab === 'preview' || splitView) && (
          <div
            className={`min-h-[120px] p-3 text-sm overflow-y-auto ${
              splitView ? 'bg-slate-50/50 dark:bg-slate-900/50 max-h-[360px]' : ''
            }`}
          >
            {value.trim() ? (
              <RichTextViewer content={value} />
            ) : (
              <p className="italic text-slate-400 dark:text-slate-600">Chưa có nội dung để xem trước…</p>
            )}
          </div>
        )}
      </div>

      {/* Footer info: Character Count & Markdown tip */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-500 dark:border-slate-800/80 dark:bg-slate-900/40 dark:text-slate-400">
        <span className="opacity-75">Hỗ trợ Markdown & Rich Text</span>
        {maxLength ? (
          <span className={`tabular-nums ${isNearLimit ? 'font-semibold text-amber-600 dark:text-amber-400' : ''}`}>
            {value.length} / {maxLength}
          </span>
        ) : (
          <span className="tabular-nums">{value.length} ký tự</span>
        )}
      </div>
    </div>
  );
}
