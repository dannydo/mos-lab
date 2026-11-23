'use client';

import React from 'react';
import { Popover } from 'antd';
import {
  Bold,
  Bot,
  Check,
  Code,
  GitFork,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Quote,
  RotateCcw,
  Sigma,
  SquareCode,
  Strikethrough,
  Table,
  Underline,
} from 'lucide-react';
import { type EditorFormatType, QUICK_TEXT_COLORS } from './richEditorUtils';
import { EditorTooltip } from './RichEditorHeader';

interface RichEditorToolbarProps {
  isDark: boolean;
  isMobile: boolean;
  isCompactMode: boolean;
  canUseAiCopilot: boolean;
  borderCol: string;
  textColor: string;
  secondaryTextColor: string;
  activeColor: string;
  colorPopoverOpen: boolean;
  zIndex: number;
  activeFormats: Record<string, boolean>;
  onColorPopoverOpenChange: (open: boolean) => void;
  onCaptureSelection: () => void;
  onFormat: (formatType: EditorFormatType) => void;
  onApplyColor: (hex: string) => void;
  onTagMai: () => void;
}

const getBtnClass = (isActive?: boolean) =>
  `w-8 h-8 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
    isActive
      ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40 shadow-xs font-bold'
      : 'hover:bg-black/5 dark:hover:bg-white/10'
  }`;

export const RichEditorToolbar: React.FC<RichEditorToolbarProps> = ({
  isDark,
  isMobile,
  isCompactMode,
  canUseAiCopilot,
  borderCol,
  textColor,
  secondaryTextColor,
  activeColor,
  colorPopoverOpen,
  zIndex,
  activeFormats,
  onColorPopoverOpenChange,
  onCaptureSelection,
  onFormat,
  onApplyColor,
  onTagMai,
}) => {
  return (
    <div
      className="overflow-x-auto no-scrollbar flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 border-b shrink-0 select-none touch-pan-x"
      style={{
        borderColor: borderCol,
        background: isDark ? 'rgba(24, 24, 27, 0.95)' : 'rgba(250, 250, 250, 0.95)',
      }}
    >
      {/* Core Inline Styles: B, I, U, A (Color), S */}
      <div className="flex items-center gap-0.5">
        <EditorTooltip disabled={isMobile} title="In đậm (⌘B)">
          <button
            type="button"
            aria-label="In đậm"
            onPointerDown={onCaptureSelection}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onFormat('bold')}
            className={getBtnClass(activeFormats.bold)}
            style={{ color: activeFormats.bold ? undefined : textColor }}
          >
            <Bold size={14} strokeWidth={2.5} />
          </button>
        </EditorTooltip>

        <EditorTooltip disabled={isMobile} title="In nghiêng (⌘I)">
          <button
            type="button"
            aria-label="In nghiêng"
            onPointerDown={onCaptureSelection}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onFormat('italic')}
            className={getBtnClass(activeFormats.italic)}
            style={{ color: activeFormats.italic ? undefined : textColor }}
          >
            <Italic size={14} />
          </button>
        </EditorTooltip>

        <EditorTooltip disabled={isMobile} title="Gạch chân (⌘U)">
          <button
            type="button"
            aria-label="Gạch chân"
            onPointerDown={onCaptureSelection}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onFormat('underline')}
            className={getBtnClass(activeFormats.underline)}
            style={{ color: activeFormats.underline ? undefined : textColor }}
          >
            <Underline size={14} />
          </button>
        </EditorTooltip>

        <Popover
          open={colorPopoverOpen}
          onOpenChange={onColorPopoverOpenChange}
          trigger="click"
          placement="bottom"
          zIndex={zIndex + 20}
          content={
            <div className="p-1.5 flex items-center gap-1.5">
              {QUICK_TEXT_COLORS.map((c) => (
                <EditorTooltip key={c.id} disabled={isMobile} title={c.label}>
                  <button
                    type="button"
                    aria-label={`Màu chữ ${c.label}`}
                    onPointerDown={onCaptureSelection}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onApplyColor(c.hex)}
                    className="w-7 h-7 sm:w-6 sm:h-6 rounded-full border border-white/20 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
                    style={{ background: c.hex }}
                  >
                    {activeColor === c.hex && <Check size={12} className="text-slate-950 stroke-[3]" />}
                  </button>
                </EditorTooltip>
              ))}
            </div>
          }
        >
          <button
            type="button"
            aria-label="Chọn màu chữ"
            title={isMobile ? undefined : 'Màu chữ nổi bật (A)'}
            onPointerDown={onCaptureSelection}
            onMouseDown={(e) => e.preventDefault()}
            className="w-7 h-7 rounded-lg flex flex-col items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer shrink-0"
            style={{ color: textColor }}
          >
            <span className="font-bold text-[12px] leading-none">A</span>
            <span className="w-3.5 h-[2.5px] rounded-full mt-0.5" style={{ background: activeColor }} />
          </button>
        </Popover>

        <EditorTooltip disabled={isMobile} title="Gạch ngang (~~text~~)">
          <button
            type="button"
            aria-label="Gạch ngang"
            onPointerDown={onCaptureSelection}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onFormat('strike')}
            className={getBtnClass(activeFormats.strike)}
            style={{ color: activeFormats.strike ? undefined : textColor }}
          >
            <Strikethrough size={14} />
          </button>
        </EditorTooltip>
      </div>

      <div className="h-4 w-[1px] bg-zinc-700/40 shrink-0 mx-1" />

      {/* Lists: Bullet (•), Numbered (1.), Checklist ([ ]) */}
      <div className="flex items-center gap-0.5">
        <EditorTooltip
          disabled={isMobile}
          title="Danh sách dấu đầu dòng (• Mục) — Nhấn Enter để tự động thêm dấu • dòng tiếp theo"
        >
          <button
            type="button"
            aria-label="Danh sách dấu đầu dòng"
            onPointerDown={onCaptureSelection}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onFormat('bullet')}
            className={getBtnClass(activeFormats.bullet)}
            style={{ color: activeFormats.bullet ? undefined : textColor }}
          >
            <List size={15} />
          </button>
        </EditorTooltip>

        <EditorTooltip disabled={isMobile} title="Danh sách đánh số (1. Mục) — Nhấn Enter để tự động tăng số thứ tự">
          <button
            type="button"
            aria-label="Danh sách số thứ tự"
            onPointerDown={onCaptureSelection}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onFormat('number')}
            className={getBtnClass(activeFormats.number)}
            style={{ color: activeFormats.number ? undefined : textColor }}
          >
            <ListOrdered size={15} />
          </button>
        </EditorTooltip>

        <EditorTooltip disabled={isMobile} title="Danh sách việc cần làm (- [ ] Todo)">
          <button
            type="button"
            aria-label="Danh sách việc cần làm"
            onPointerDown={onCaptureSelection}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onFormat('todo')}
            className={getBtnClass(activeFormats.todo)}
            style={{ color: activeFormats.todo ? undefined : '#f59e0b' }}
          >
            <ListTodo size={15} />
          </button>
        </EditorTooltip>
      </div>

      <div className="h-4 w-[1px] bg-zinc-700/40 shrink-0 mx-1" />

      {/* Quote & Link */}
      <div className="flex items-center gap-0.5">
        <EditorTooltip disabled={isMobile} title="Trích dẫn (> Trích dẫn)">
          <button
            type="button"
            aria-label="Trích dẫn"
            onPointerDown={onCaptureSelection}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onFormat('quote')}
            className={getBtnClass(activeFormats.quote)}
            style={{ color: activeFormats.quote ? undefined : textColor }}
          >
            <Quote size={14} />
          </button>
        </EditorTooltip>

        <EditorTooltip disabled={isMobile} title="Chèn liên kết URL [Tên](https://...)">
          <button
            type="button"
            aria-label="Chèn liên kết"
            onPointerDown={onCaptureSelection}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onFormat('link')}
            className={getBtnClass(false)}
            style={{ color: textColor }}
          >
            <LinkIcon size={14} />
          </button>
        </EditorTooltip>
      </div>

      <div className="h-4 w-[1px] bg-zinc-700/40 shrink-0 mx-1" />

      {/* Code */}
      <div className="flex items-center gap-0.5">
        <EditorTooltip disabled={isMobile} title="Mã nội dòng (`code`)">
          <button
            type="button"
            aria-label="Mã nội dòng"
            onPointerDown={onCaptureSelection}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onFormat('code')}
            className={getBtnClass(activeFormats.code)}
            style={{ color: activeFormats.code ? undefined : textColor }}
          >
            <Code size={14} />
          </button>
        </EditorTooltip>

        <EditorTooltip disabled={isMobile} title="Khối mã đa dòng (```)">
          <button
            type="button"
            aria-label="Khối mã đa dòng"
            onPointerDown={onCaptureSelection}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onFormat('codeblock')}
            className={getBtnClass(false)}
            style={{ color: textColor }}
          >
            <SquareCode size={14} />
          </button>
        </EditorTooltip>
      </div>

      {/* Headings & Tables & Dividers */}
      <div className="h-4 w-[1px] bg-zinc-700/40 shrink-0 mx-1" />
      <div className="flex items-center gap-0.5">
        <EditorTooltip disabled={isMobile} title="Tiêu đề chính lớn (# H1)">
          <button
            type="button"
            aria-label="Tiêu đề H1"
            onPointerDown={onCaptureSelection}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onFormat('h1')}
            className={`h-7 px-1.5 rounded-md flex items-center justify-center font-bold text-[11.5px] cursor-pointer shrink-0 ${
              activeFormats.h1 ? 'bg-amber-500/20 text-amber-400' : 'text-amber-500 hover:bg-white/10'
            }`}
          >
            H1
          </button>
        </EditorTooltip>
        <EditorTooltip disabled={isMobile} title="Tiêu đề nhánh (## H2)">
          <button
            type="button"
            aria-label="Tiêu đề H2"
            onPointerDown={onCaptureSelection}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onFormat('h2')}
            className={`h-7 px-1.5 rounded-md flex items-center justify-center font-semibold text-[11px] cursor-pointer shrink-0 ${
              activeFormats.h2 ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-white/10'
            }`}
            style={{ color: textColor }}
          >
            H2
          </button>
        </EditorTooltip>
        <EditorTooltip disabled={isMobile} title="Tiêu đề nhỏ (### H3)">
          <button
            type="button"
            aria-label="Tiêu đề H3"
            onPointerDown={onCaptureSelection}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onFormat('h3')}
            className={`h-7 px-1.5 rounded-md flex items-center justify-center font-medium text-[10.5px] cursor-pointer shrink-0 ${
              activeFormats.h3 ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-white/10'
            }`}
            style={{ color: textColor }}
          >
            H3
          </button>
        </EditorTooltip>
        <EditorTooltip disabled={isMobile} title="Chèn bảng dữ liệu Markdown">
          <button
            type="button"
            aria-label="Chèn bảng"
            onPointerDown={onCaptureSelection}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onFormat('table')}
            className={getBtnClass(false)}
            style={{ color: textColor }}
          >
            <Table size={14} />
          </button>
        </EditorTooltip>
        <EditorTooltip disabled={isMobile} title="Đường kẻ phân cách ngang (---)">
          <button
            type="button"
            aria-label="Đường kẻ phân cách"
            onPointerDown={onCaptureSelection}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onFormat('divider')}
            className={getBtnClass(false)}
            style={{ color: textColor }}
          >
            <Minus size={15} />
          </button>
        </EditorTooltip>
      </div>

      {/* Extended Studio Diagrams (Mermaid, KaTeX) */}
      {!isCompactMode && (
        <>
          <div className="h-4 w-[1px] bg-zinc-700/40 shrink-0 mx-1" />
          <div className="flex items-center gap-0.5">
            <EditorTooltip disabled={isMobile} title="Sơ đồ quy trình tương tác Mermaid (```mermaid)">
              <button
                type="button"
                onPointerDown={onCaptureSelection}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onFormat('mermaid')}
                className="h-7 px-1.5 rounded-md flex items-center gap-1 text-[11px] font-medium text-purple-400 hover:bg-purple-500/10 cursor-pointer shrink-0"
              >
                <GitFork size={13} />
                <span>Mermaid</span>
              </button>
            </EditorTooltip>
            <EditorTooltip disabled={isMobile} title="Công thức toán học KaTeX ($$ formula $$)">
              <button
                type="button"
                onPointerDown={onCaptureSelection}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onFormat('math')}
                className="h-7 px-1.5 rounded-md flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/10 cursor-pointer shrink-0"
              >
                <Sigma size={13} />
                <span>KaTeX</span>
              </button>
            </EditorTooltip>
          </div>
        </>
      )}

      <div className="hidden sm:block h-4 w-[1px] bg-zinc-700/40 shrink-0 mx-1" />

      {/* Clear Format */}
      <EditorTooltip disabled={isMobile} title="Xóa ký tự định dạng của đoạn đã chọn">
        <button
          type="button"
          aria-label="Xóa định dạng"
          onPointerDown={onCaptureSelection}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onFormat('clear')}
          className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer opacity-75 hover:opacity-100 shrink-0"
          style={{ color: secondaryTextColor }}
        >
          <RotateCcw size={13} />
        </button>
      </EditorTooltip>

      {/* MAI trigger */}
      {canUseAiCopilot && (
        <EditorTooltip disabled={isMobile} title="Gắn tag @MAI để gọi mOS AI">
          <button
            type="button"
            onPointerDown={onCaptureSelection}
            onClick={onTagMai}
            className="h-7 px-2 rounded-md flex items-center gap-1 text-[11px] font-black text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 transition-colors cursor-pointer ml-auto shrink-0"
          >
            <Bot size={13} />
            <span>@MAI</span>
          </button>
        </EditorTooltip>
      )}
    </div>
  );
};
