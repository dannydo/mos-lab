'use client';

import React from 'react';
import { Loader2, Send, Trash2 } from 'lucide-react';
import { QUICK_CHAT_CHIPS } from './copilot-utils';

export interface CopilotInputAreaProps {
  hasMessages: boolean;
  inputMessage: string;
  pastedImage: string | null;
  sending: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onInputChange: (value: string) => void;
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onClearImage: () => void;
  onSendMessage: (textToSend?: string) => void;
}

export function CopilotInputArea({
  hasMessages,
  inputMessage,
  pastedImage,
  sending,
  inputRef,
  onInputChange,
  onPaste,
  onClearImage,
  onSendMessage,
}: CopilotInputAreaProps) {
  return (
    <>
      {/* Quick chip bar (when conversation has started) */}
      {hasMessages && (
        <div className="px-4 py-1.5 bg-slate-100/60 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <span className="text-slate-400 text-[10px] whitespace-nowrap">Gợi ý:</span>
          {QUICK_CHAT_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => onSendMessage(chip.prompt)}
              className="whitespace-nowrap px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-600 dark:text-slate-300 transition-colors"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Box Area */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        {pastedImage && (
          <div className="mb-2 relative inline-block">
            <div className="relative rounded-lg overflow-hidden border border-indigo-200 dark:border-indigo-800 max-h-28 max-w-xs shadow-sm bg-slate-100 dark:bg-slate-800">
              <img src={pastedImage} alt="Ảnh chụp màn hình" className="max-h-28 object-contain" />
              <button
                type="button"
                onClick={onClearImage}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors cursor-pointer"
                title="Gỡ ảnh đính kèm"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <span className="block text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">
              📷 Đã dán ảnh chụp màn hình từ Clipboard
            </span>
          </div>
        )}
        <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => onInputChange(e.target.value)}
            onPaste={onPaste}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSendMessage();
              }
            }}
            placeholder="Hỏi về cấu trúc khách hàng, dán ảnh màn hình (Ctrl+V) hoặc yêu cầu lọc dữ liệu..."
            rows={1}
            className="flex-1 bg-transparent resize-none border-0 focus:outline-none focus:ring-0 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 max-h-24 py-1.5 px-2 leading-relaxed"
          />
          <button
            type="button"
            disabled={(!inputMessage.trim() && !pastedImage) || sending}
            onClick={() => onSendMessage()}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors flex-shrink-0 cursor-pointer"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex items-center justify-between mt-1 px-1 text-[10px] text-slate-400">
          <span>Enter để gửi · Shift+Enter để xuống dòng · Ctrl+V dán ảnh</span>
          <span>Workspace cá nhân</span>
        </div>
      </div>
    </>
  );
}
