'use client';

import React from 'react';
import { Eye, FilePenLine, FileText } from 'lucide-react';
import { MosChatRichText } from '../MosChatRichText';
import { type RichEditorViewMode } from './richEditorUtils';

interface RichEditorWorkspaceProps {
  isCompactMode: boolean;
  viewMode: RichEditorViewMode;
  isDark: boolean;
  content: string;
  showCompactPreview: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  borderCol: string;
  toolbarBg: string;
  textColor: string;
  secondaryTextColor: string;
  onChangeContent: (value: string) => void;
  onUpdateSelection: (target: HTMLTextAreaElement, fallbackPos?: number) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, allowMetaEnterSend: boolean) => void;
  onToggleCompactPreview: () => void;
}

export const RichEditorWorkspace: React.FC<RichEditorWorkspaceProps> = ({
  isCompactMode,
  viewMode,
  isDark,
  content,
  showCompactPreview,
  textareaRef,
  borderCol,
  toolbarBg,
  textColor,
  secondaryTextColor,
  onChangeContent,
  onUpdateSelection,
  onKeyDown,
  onToggleCompactPreview,
}) => {
  if (isCompactMode) {
    return (
      <div className="flex-1 flex flex-col min-h-[120px] sm:min-h-[160px] overflow-hidden">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            onChangeContent(e.target.value);
            onUpdateSelection(e.target, e.target.value.length);
          }}
          onClick={(e) => onUpdateSelection(e.currentTarget)}
          onKeyUp={(e) => onUpdateSelection(e.currentTarget)}
          onSelect={(e) => onUpdateSelection(e.currentTarget)}
          onTouchEnd={(e) => onUpdateSelection(e.currentTarget)}
          onKeyDown={(e) => onKeyDown(e, true)}
          data-testid="rich-editor-compact-textarea"
          placeholder="Gõ nhanh nội dung... (Bấm • để tạo danh sách, nhấn Enter tự động xuống dòng • tiếp theo, ⌘+Enter để gửi ngay)"
          className="flex-1 w-full p-3 sm:p-4 bg-transparent border-0 outline-none resize-none text-[15px] sm:text-[14px] leading-relaxed select-text min-h-[120px] sm:min-h-[140px] overscroll-contain"
          style={{ color: textColor }}
        />

        {content.trim() && (
          <div className="border-t px-4 py-2 bg-black/5 dark:bg-white/[0.02]" style={{ borderColor: borderCol }}>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onToggleCompactPreview}
                className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 cursor-pointer hover:underline"
              >
                <Eye size={12} />
                <span>{showCompactPreview ? 'Ẩn xem trước' : 'Xem trước hiển thị'}</span>
              </button>
              <span className="text-[10.5px] opacity-60" style={{ color: secondaryTextColor }}>
                Enter: Xuống dòng · ⌘+Enter: Gửi ngay
              </span>
            </div>
            {showCompactPreview && (
              <div className="mt-2 pt-2 border-t border-white/5 max-h-[140px] overflow-y-auto">
                <MosChatRichText content={content} isMe={false} isDark={isDark} />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex-1 flex overflow-hidden min-h-0 ${viewMode === 'split' ? 'flex-col md:flex-row' : ''}`}>
      {viewMode !== 'preview' && (
        <div
          className={`flex-1 flex flex-col min-w-0 min-h-0 ${
            viewMode === 'split' ? 'border-b md:border-b-0 md:border-r' : ''
          }`}
          style={{ borderColor: borderCol }}
        >
          <div
            className="px-4 py-1.5 border-b text-[11px] font-semibold flex items-center justify-between uppercase tracking-wider shrink-0"
            style={{ borderColor: borderCol, color: secondaryTextColor, background: toolbarBg }}
          >
            <div className="flex items-center gap-1.5">
              <FileText size={12} className="text-amber-500" />
              <span>Khung soạn thảo (Markdown / CKEditor Source)</span>
            </div>
            <span className="text-[10px] lowercase opacity-75">⌘B đậm · ⌘I nghiêng · ⌘U gạch chân</span>
          </div>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              onChangeContent(e.target.value);
              onUpdateSelection(e.target, e.target.value.length);
            }}
            onClick={(e) => onUpdateSelection(e.currentTarget)}
            onKeyUp={(e) => onUpdateSelection(e.currentTarget)}
            onSelect={(e) => onUpdateSelection(e.currentTarget)}
            onTouchEnd={(e) => onUpdateSelection(e.currentTarget)}
            onKeyDown={(e) => onKeyDown(e, false)}
            placeholder="Nhập nội dung tin nhắn, thông báo, quy trình hoặc tài liệu cần soạn thảo..."
            className="flex-1 w-full p-3 sm:p-4 bg-transparent border-0 outline-none resize-none font-mono text-[14px] sm:text-[13.5px] leading-relaxed select-text overscroll-contain"
            style={{ color: textColor }}
          />
        </div>
      )}

      {viewMode !== 'edit' && (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-black/5 dark:bg-white/[0.02]">
          <div
            className="px-4 py-1.5 border-b text-[11px] font-semibold flex items-center justify-between uppercase tracking-wider shrink-0"
            style={{ borderColor: borderCol, color: secondaryTextColor, background: toolbarBg }}
          >
            <div className="flex items-center gap-1.5">
              <Eye size={12} className="text-emerald-500" />
              <span>Xem trước trực quan (Live Render)</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold lowercase">Trực quan thời gian thực</span>
          </div>
          <div className="flex-1 p-4 sm:p-5 overflow-y-auto overscroll-contain select-text">
            {content.trim() ? (
              <div className="prose max-w-none">
                <MosChatRichText content={content} isMe={false} isDark={isDark} />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                <FilePenLine size={36} className="mb-2 opacity-30 text-amber-500" />
                <p className="text-[13px] font-medium m-0">Chưa có nội dung để hiển thị</p>
                <p className="text-[11.5px] opacity-75 mt-1 max-w-sm">
                  Hãy nhập nội dung vào khung bên trái hoặc chọn một mẫu soạn thảo nhanh ở trên.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
