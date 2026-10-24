'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Smile, AlertCircle } from 'lucide-react';
import { MosChatMobileMentionAutocomplete } from './MosChatMobileMentionAutocomplete';

export interface MosChatMobileEditModalProps {
  open: boolean;
  initialText: string;
  title?: string;
  onClose: () => void;
  onSave: (newText: string) => Promise<void> | void;
}

export const MosChatMobileEditModal: React.FC<MosChatMobileEditModalProps> = ({
  open,
  initialText,
  title = 'Chỉnh sửa tin nhắn',
  onClose,
  onSave,
}) => {
  const [text, setText] = useState<string>(initialText);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [keyboardOffset, setKeyboardOffset] = useState<number>(0);

  // Sync initialText whenever modal opens
  useEffect(() => {
    if (open) {
      setText(initialText);
      setIsSaving(false);
      // Auto focus with cursor at the end
      setTimeout(() => {
        const el = textareaRef.current;
        if (el) {
          el.focus();
          el.selectionStart = el.value.length;
          el.selectionEnd = el.value.length;
          el.style.height = 'auto';
          el.style.height = `${Math.min(180, Math.max(80, el.scrollHeight))}px`;
        }
      }, 100);
    }
  }, [open, initialText]);

  // iOS Safari Virtual Keyboard listener using visualViewport
  useEffect(() => {
    if (!open || typeof window === 'undefined' || !window.visualViewport) return;

    const handleViewportChange = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(offset);
    };

    window.visualViewport.addEventListener('resize', handleViewportChange);
    window.visualViewport.addEventListener('scroll', handleViewportChange);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, [open]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(180, Math.max(80, el.scrollHeight))}px`;
  }, [text]);

  if (!open) return null;

  const isUnchanged = text.trim() === initialText.trim();
  const isEmpty = !text.trim();
  const canSave = !isUnchanged && !isEmpty && !isSaving;

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed || isUnchanged || isSaving) return;
    setIsSaving(true);
    try {
      await onSave(trimmed);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end select-none">
      {/* Backdrop */}
      <div
        onClick={() => {
          if (!isSaving) onClose();
        }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Slide-up Edit Sheet */}
      <div
        style={{
          transform: keyboardOffset > 0 ? `translateY(-${keyboardOffset}px)` : 'none',
          transition: 'transform 0.15s ease-out',
          paddingBottom: keyboardOffset > 50 ? '12px' : 'max(env(safe-area-inset-bottom, 20px), 16px)',
        }}
        className="relative bg-slate-900 border-t border-slate-800 rounded-t-3xl px-4 pt-3 shadow-2xl animate-in slide-in-from-bottom duration-200 flex flex-col max-h-[85vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-edit-modal-title"
      >
        {/* Grab Handle */}
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-3" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-2.5 py-1 text-sm font-medium text-slate-400 hover:text-white active:scale-95 transition-all disabled:opacity-50"
          >
            Hủy
          </button>

          <h3 id="mobile-edit-modal-title" className="text-sm font-bold text-white tracking-tight">
            {title}
          </h3>

          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="px-3.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 active:scale-95 disabled:opacity-40 disabled:pointer-events-none bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm"
          >
            {isSaving ? (
              <span>Đang lưu...</span>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Lưu</span>
              </>
            )}
          </button>
        </div>

        {/* Autocomplete dropdown for @mentions inside edit box */}
        <MosChatMobileMentionAutocomplete
          text={text}
          onSelectMention={(nextText) => setText(nextText)}
          textareaRef={textareaRef}
        />

        {/* Textarea Input Container */}
        <div className="relative bg-slate-800/90 border border-slate-700/80 rounded-2xl p-2.5 focus-within:border-amber-400/80 transition-colors">
          <textarea
            ref={textareaRef}
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập nội dung chỉnh sửa..."
            className="w-full bg-transparent border-none outline-none text-sm text-white placeholder-slate-400 resize-none leading-relaxed min-h-[70px] max-h-[180px]"
          />
        </div>

        {/* Footer Hint Bar */}
        <div className="flex items-center justify-between mt-2.5 px-1 text-[11px] text-slate-400">
          <span className="italic text-slate-400">Tin nhắn sau khi lưu sẽ có nhãn (đã sửa)</span>
          <span className="tabular-nums font-medium text-slate-400">{text.length} ký tự</span>
        </div>
      </div>
    </div>
  );
};
