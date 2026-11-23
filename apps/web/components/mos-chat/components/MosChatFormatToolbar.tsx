'use client';

import React from 'react';
import { Popover, Tooltip, type GlobalToken } from 'antd';
import {
  Bold,
  Check,
  Code,
  Eye,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  SquareCode,
  Strikethrough,
  Underline,
  X,
  Zap,
} from 'lucide-react';
import { detectActiveFormatsAtCursor, QUICK_TEXT_COLORS, type RichEditorViewMode } from '../MosChatRichEditorModal';
import type { ChatComposerFormatType } from '../utils/chat-format-toolbar';

export interface MosChatFormatToolbarProps {
  scope: 'main' | 'thread';
  variant?: 'inline' | 'floating';
  isDark: boolean;
  token: GlobalToken;
  currentText: string;
  cursorPos: number;
  isPreview: boolean;
  togglePreview: () => void;
  closeToolbar: () => void;
  colorPopoverScope: 'main' | 'thread' | null;
  setColorPopoverScope: (val: 'main' | 'thread' | null) => void;
  inlineTextColor: string;
  setInlineTextColor: (hex: string) => void;
  handleApplyFormat: (formatType: ChatComposerFormatType, scope: 'main' | 'thread', customColorHex?: string) => void;
  setRichEditorModalState: React.Dispatch<
    React.SetStateAction<{
      open: boolean;
      scope: 'main' | 'thread';
      title: string;
      initialMode?: RichEditorViewMode;
    }>
  >;
}

export const MosChatFormatToolbar: React.FC<MosChatFormatToolbarProps> = ({
  scope,
  variant = 'floating',
  isDark,
  token,
  currentText,
  cursorPos,
  isPreview,
  togglePreview,
  closeToolbar,
  colorPopoverScope,
  setColorPopoverScope,
  inlineTextColor,
  setInlineTextColor,
  handleApplyFormat,
  setRichEditorModalState,
}) => {
  const activeFormats = detectActiveFormatsAtCursor(currentText, cursorPos);

  const getInlineBtnClass = (isActive?: boolean) =>
    `min-w-[28px] h-[28px] px-1.5 rounded-lg flex items-center justify-center text-[13px] shrink-0 active:scale-95 transition-all cursor-pointer ${
      isActive
        ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40 font-bold shadow-xs'
        : 'hover:bg-black/5 dark:hover:bg-white/10'
    }`;

  const isInline = variant === 'inline';

  return (
    <div
      data-format-toolbar={scope}
      data-testid={`chat-format-toolbar-${scope}`}
      className={
        isInline
          ? 'flex items-center gap-0.5 pb-1.5 mb-1.5 border-b overflow-x-auto no-scrollbar select-none'
          : 'flex items-center gap-1 px-2 py-1.5 overflow-x-auto no-scrollbar rounded-xl mb-1.5 shadow-md border animate-in slide-in-from-bottom-2 duration-150 select-none'
      }
      style={
        isInline
          ? { borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)' }
          : {
              background: isDark ? 'rgba(28, 28, 30, 0.96)' : 'rgba(242, 242, 247, 0.96)',
              backdropFilter: 'blur(16px)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
            }
      }
    >
      <button
        type="button"
        aria-label="In đậm"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => handleApplyFormat('bold', scope)}
        title="In đậm (⌘B)"
        className={getInlineBtnClass(activeFormats.bold)}
        style={{ color: activeFormats.bold ? undefined : token.colorText }}
      >
        <Bold size={14} strokeWidth={2.5} />
      </button>

      <button
        type="button"
        aria-label="In nghiêng"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => handleApplyFormat('italic', scope)}
        title="In nghiêng (⌘I)"
        className={getInlineBtnClass(activeFormats.italic)}
        style={{ color: activeFormats.italic ? undefined : token.colorText }}
      >
        <Italic size={14} />
      </button>

      <button
        type="button"
        aria-label="Gạch chân"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => handleApplyFormat('underline', scope)}
        title="Gạch chân (⌘U)"
        className={getInlineBtnClass(activeFormats.underline)}
        style={{ color: activeFormats.underline ? undefined : token.colorText }}
      >
        <Underline size={14} />
      </button>

      <Popover
        open={colorPopoverScope === scope}
        onOpenChange={(vis) => setColorPopoverScope(vis ? scope : null)}
        trigger="click"
        placement="top"
        content={
          <div className="p-1.5 flex items-center gap-1.5">
            {QUICK_TEXT_COLORS.map((c) => (
              <Tooltip key={c.id} title={c.label}>
                <button
                  type="button"
                  aria-label={`Màu chữ ${c.label}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setInlineTextColor(c.hex);
                    setColorPopoverScope(null);
                    handleApplyFormat('color', scope, c.hex);
                  }}
                  className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
                  style={{ background: c.hex }}
                >
                  {inlineTextColor === c.hex && <Check size={12} className="text-slate-950 stroke-[3]" />}
                </button>
              </Tooltip>
            ))}
          </div>
        }
      >
        <button
          type="button"
          aria-label="Màu chữ"
          onMouseDown={(e) => e.preventDefault()}
          title="Màu chữ nổi bật (A)"
          className="min-w-[28px] h-[28px] px-1.5 rounded-lg flex flex-col items-center justify-center shrink-0 active:scale-95 transition-all hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          style={{ color: token.colorText }}
        >
          <span className="font-bold text-[12px] leading-none">A</span>
          <span className="w-3.5 h-[2.5px] rounded-full mt-0.5" style={{ background: inlineTextColor }} />
        </button>
      </Popover>

      <button
        type="button"
        aria-label="Gạch ngang"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => handleApplyFormat('strike', scope)}
        title="Gạch ngang (~~text~~)"
        className={getInlineBtnClass(activeFormats.strike)}
        style={{ color: activeFormats.strike ? undefined : token.colorText }}
      >
        <Strikethrough size={14} />
      </button>

      <div className="h-4 w-[1px] bg-zinc-500/20 shrink-0 mx-0.5" />

      <button
        type="button"
        aria-label="Danh sách dấu đầu dòng"
        data-testid={`chat-format-btn-${scope}-bullet`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => handleApplyFormat('bullet', scope)}
        title="Danh sách dấu đầu dòng (• Mục) — Shift+Enter để tự động thêm • dòng tiếp theo"
        className={getInlineBtnClass(activeFormats.bullet)}
        style={{ color: activeFormats.bullet ? undefined : token.colorText }}
      >
        <List size={15} />
      </button>

      <button
        type="button"
        aria-label="Danh sách đánh số"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => handleApplyFormat('number', scope)}
        title="Danh sách đánh số (1. Mục) — Shift+Enter tự tăng số thứ tự"
        className={getInlineBtnClass(activeFormats.number)}
        style={{ color: activeFormats.number ? undefined : token.colorText }}
      >
        <ListOrdered size={15} />
      </button>

      <button
        type="button"
        aria-label="Danh sách việc cần làm"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => handleApplyFormat('todo', scope)}
        title="Việc cần làm (- [ ] Việc)"
        className={getInlineBtnClass(activeFormats.todo)}
        style={{ color: activeFormats.todo ? undefined : '#f59e0b' }}
      >
        <ListTodo size={15} />
      </button>

      <div className="h-4 w-[1px] bg-zinc-500/20 shrink-0 mx-0.5" />

      <button
        type="button"
        aria-label="Trích dẫn"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => handleApplyFormat('quote', scope)}
        title="Trích dẫn (> Trích dẫn)"
        className={getInlineBtnClass(activeFormats.quote)}
        style={{ color: activeFormats.quote ? undefined : token.colorText }}
      >
        <Quote size={14} />
      </button>

      <button
        type="button"
        aria-label="Chèn liên kết"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => handleApplyFormat('link', scope)}
        title="Chèn liên kết URL [Tên](https://...)"
        className={getInlineBtnClass(false)}
        style={{ color: token.colorText }}
      >
        <LinkIcon size={14} />
      </button>

      <div className="h-4 w-[1px] bg-zinc-500/20 shrink-0 mx-0.5" />

      <button
        type="button"
        aria-label="Mã nội dòng"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => handleApplyFormat('code', scope)}
        title="Mã nội dòng (`code`)"
        className={getInlineBtnClass(activeFormats.code)}
        style={{ color: activeFormats.code ? undefined : token.colorText }}
      >
        <Code size={14} />
      </button>

      <button
        type="button"
        aria-label="Khối mã code"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => handleApplyFormat('codeblock', scope)}
        title="Khối mã đa dòng (```)"
        className={getInlineBtnClass(false)}
        style={{ color: token.colorText }}
      >
        <SquareCode size={14} />
      </button>

      <div className="ml-auto flex items-center gap-1 pl-1 shrink-0">
        <button
          type="button"
          onClick={togglePreview}
          title={isPreview ? 'Quay lại chế độ soạn thảo' : 'Xem trước trực quan (WYSIWYG Preview)'}
          className={`h-[26px] px-2 rounded-lg flex items-center gap-1 text-[10.5px] font-bold shrink-0 active:scale-95 transition-all cursor-pointer ${
            isPreview
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30'
          }`}
        >
          <Eye size={12} />
          <span className="hidden sm:inline">{isPreview ? 'Đang xem' : 'Xem trước'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setRichEditorModalState({
              open: true,
              scope,
              title: scope === 'main' ? 'Soạn thảo phong phú (CKEditor)' : 'Soạn thảo phản hồi (CKEditor)',
              initialMode: 'compact',
            });
          }}
          title="Mở cửa sổ Bản gọn (Type nhanh) — nhấn Enter tự xuống dòng •"
          className="h-[26px] px-2 rounded-lg flex items-center gap-1 text-[10.5px] font-bold shrink-0 active:scale-95 transition-all cursor-pointer text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30"
        >
          <Zap size={12} />
          <span className="hidden sm:inline">Bản gọn</span>
        </button>

        <button
          type="button"
          onClick={closeToolbar}
          title="Đóng thanh định dạng"
          className="w-[26px] h-[26px] rounded-lg flex items-center justify-center text-[12px] shrink-0 active:scale-95 transition-all hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer opacity-70 hover:opacity-100"
          style={{ color: token.colorTextSecondary }}
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
};
