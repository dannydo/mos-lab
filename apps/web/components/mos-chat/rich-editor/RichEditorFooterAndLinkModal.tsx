'use client';

import React from 'react';
import { Modal } from 'antd';
import { Check, HelpCircle, SendHorizontal } from 'lucide-react';

interface RichEditorFooterProps {
  isMobile: boolean;
  isKeyboardOpen: boolean;
  isCompactMode: boolean;
  content: string;
  borderCol: string;
  toolbarBg: string;
  textColor: string;
  secondaryTextColor: string;
  onClose: () => void;
  onApply: () => void;
  onSend: () => void;
}

export const RichEditorFooter: React.FC<RichEditorFooterProps> = ({
  isMobile,
  isKeyboardOpen,
  isCompactMode,
  content,
  borderCol,
  toolbarBg,
  textColor,
  secondaryTextColor,
  onClose,
  onApply,
  onSend,
}) => {
  return (
    <div
      className={`flex items-center justify-between px-3 sm:px-4 pt-2 sm:py-2.5 border-t shrink-0 flex-wrap sm:flex-nowrap gap-2 ${
        isMobile ? (isKeyboardOpen ? 'pb-2' : 'pb-[max(env(safe-area-inset-bottom,12px),12px)]') : 'pb-2'
      }`}
      style={{ borderColor: borderCol, background: toolbarBg }}
    >
      <div
        className="hidden sm:flex items-center gap-1.5 text-[11px] sm:text-[11.5px]"
        style={{ color: secondaryTextColor }}
      >
        <HelpCircle size={14} className="text-amber-500 shrink-0" />
        <span>
          {isCompactMode
            ? 'Bản gọn gõ nhanh: Nhấn • để liệt kê ý, Enter tự tiếp nối dòng mới.'
            : 'Hỗ trợ bảng biểu, sơ đồ Mermaid, công thức KaTeX, danh sách việc cần làm và các phím tắt soạn thảo.'}
        </span>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto sm:ml-auto">
        <button
          type="button"
          onClick={onClose}
          className="h-10 sm:h-8 px-3 rounded-xl border flex items-center justify-center text-[12px] font-semibold hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          style={{ borderColor: borderCol, color: textColor }}
        >
          Hủy
        </button>

        <button
          type="button"
          onClick={onApply}
          className="flex-1 sm:flex-initial h-10 sm:h-8 px-2.5 sm:px-3.5 rounded-xl border flex items-center justify-center gap-1 sm:gap-1.5 text-[12px] font-semibold hover:bg-amber-500/10 transition-colors cursor-pointer text-amber-500 border-amber-500/40"
        >
          <Check size={14} />
          <span>Áp dụng vào chat</span>
        </button>

        <button
          type="button"
          onClick={onSend}
          disabled={!content.trim()}
          className={`flex-1 sm:flex-initial h-10 sm:h-8 px-3 sm:px-3.5 rounded-xl flex items-center justify-center gap-1 sm:gap-1.5 text-[12px] font-bold shadow-md transition-all cursor-pointer ${
            content.trim()
              ? 'bg-[#d4a84b] hover:bg-[#c3973a] text-slate-950 active:scale-95'
              : 'bg-zinc-700 text-zinc-400 opacity-50 cursor-not-allowed'
          }`}
        >
          <SendHorizontal size={14} />
          <span>Gửi tin nhắn ngay</span>
        </button>
      </div>
    </div>
  );
};

interface RichEditorLinkModalProps {
  open: boolean;
  zIndex: number;
  isMobile: boolean;
  linkText: string;
  linkUrl: string;
  borderCol: string;
  textColor: string;
  onCancel: () => void;
  onOk: () => void;
  onChangeLinkText: (value: string) => void;
  onChangeLinkUrl: (value: string) => void;
}

export const RichEditorLinkModal: React.FC<RichEditorLinkModalProps> = ({
  open,
  zIndex,
  isMobile,
  linkText,
  linkUrl,
  borderCol,
  textColor,
  onCancel,
  onOk,
  onChangeLinkText,
  onChangeLinkUrl,
}) => {
  return (
    <Modal
      open={open}
      zIndex={zIndex + 10}
      onCancel={onCancel}
      onOk={onOk}
      title="Chèn liên kết URL"
      okText="Chèn liên kết"
      cancelText="Hủy"
      centered={isMobile}
      className={isMobile ? 'adaptive-overlay' : undefined}
      width={isMobile ? 'min(420px, calc(100vw - 24px))' : 420}
      destroyOnHidden
    >
      <div className="space-y-3 pt-2">
        <div>
          <label className="block text-[12px] font-medium mb-1 text-zinc-400">Tiêu đề hiển thị:</label>
          <input
            type="text"
            value={linkText}
            onChange={(e) => onChangeLinkText(e.target.value)}
            placeholder="VD: Xem bảng chỉ tiêu..."
            className="w-full px-3 py-1.5 rounded-lg border bg-transparent text-[13px] outline-none"
            style={{ borderColor: borderCol, color: textColor }}
          />
        </div>
        <div>
          <label className="block text-[12px] font-medium mb-1 text-zinc-400">Đường dẫn liên kết (URL):</label>
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => onChangeLinkUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-1.5 rounded-lg border bg-transparent text-[13px] outline-none"
            style={{ borderColor: borderCol, color: textColor }}
          />
        </div>
      </div>
    </Modal>
  );
};
