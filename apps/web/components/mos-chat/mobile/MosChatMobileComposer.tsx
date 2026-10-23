'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, SendHorizontal, Mic, Smile, X, Sparkles } from 'lucide-react';
import { useMosChat } from '../context/MosChatContext';
import type { MosChatStickerPackId } from '../mos-chat-stickers';

export interface MosChatMobileComposerProps {
  onOpenActionSheet: () => void;
  onOpenStickerSheet: (pack?: MosChatStickerPackId) => void;
  text?: string;
  onTextChange?: (text: string) => void;
}

export const MosChatMobileComposer: React.FC<MosChatMobileComposerProps> = ({
  onOpenActionSheet,
  onOpenStickerSheet,
  text: controlledText,
  onTextChange,
}) => {
  const { sendMessage, replyingToMessage, setReplyingToMessage, activeConversation } = useMosChat();

  const [internalText, setInternalText] = useState<string>('');
  const text = controlledText !== undefined ? controlledText : internalText;
  const setText = (val: string | ((prev: string) => string)) => {
    const nextVal = typeof val === 'function' ? val(text) : val;
    if (onTextChange) {
      onTextChange(nextVal);
    } else {
      setInternalText(nextVal);
    }
  };

  const [isSending, setIsSending] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [keyboardOffset, setKeyboardOffset] = useState<number>(0);

  // iOS Safari Virtual Keyboard listener using visualViewport
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

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
  }, []);

  // Auto-focus when replying to a message
  useEffect(() => {
    if (replyingToMessage) {
      textareaRef.current?.focus();
    }
  }, [replyingToMessage]);

  // Auto-resize textarea height
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(120, el.scrollHeight)}px`;
  }, [text]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    const success = await sendMessage(trimmed, {
      replyToId: replyingToMessage?.id,
    });
    setIsSending(false);

    if (success) {
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isKeyboardOpen = keyboardOffset > 50;
  const placeholder = activeConversation?.name ? `Nhắn tin trong #${activeConversation.name}...` : 'Nhập tin nhắn...';

  return (
    <div
      style={{
        transform: keyboardOffset > 0 ? `translateY(-${keyboardOffset}px)` : 'none',
        transition: 'transform 0.15s ease-out',
        paddingBottom: isKeyboardOpen ? '8px' : 'max(env(safe-area-inset-bottom, 14px), 12px)',
      }}
      className="sticky bottom-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/80 px-3 pt-2 shadow-lg"
    >
      {/* Quoted Message Preview Banner */}
      {replyingToMessage && (
        <div className="flex items-center justify-between bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5 mb-2 text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="w-1 h-3.5 rounded-full bg-amber-400 shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-amber-300">Trả lời {replyingToMessage.senderName}:</span>{' '}
              <span className="text-slate-300 truncate">{replyingToMessage.text}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingToMessage(null)}
            className="p-1 text-slate-400 hover:text-white rounded-full"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Composer Row */}
      <div className="flex items-end gap-2">
        {/* [+] Action Sheet Button */}
        <button
          type="button"
          onClick={onOpenActionSheet}
          className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700/80 flex items-center justify-center text-slate-300 active:scale-90 transition-transform shrink-0 mb-0.5"
          aria-label="Tác vụ đính kèm"
        >
          <Plus className="w-5 h-5 text-amber-400" />
        </button>

        {/* Text Input Box */}
        <div className="flex-1 min-h-[38px] max-h-[120px] bg-slate-800/90 border border-slate-700/80 rounded-2xl px-3 py-1.5 flex items-center gap-2 focus-within:border-amber-400/80 transition-colors">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-slate-400 resize-none max-h-[110px] py-1 leading-snug"
          />

          {/* Quick Emoji / Sticker Icon */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onOpenStickerSheet('emoji')}
            className="p-1 text-slate-400 hover:text-amber-400 active:scale-90 transition-transform shrink-0"
            aria-label="Biểu cảm Emoji & Nhãn dán"
            title="Biểu cảm Emoji & Nhãn dán"
          >
            <Smile className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Send / Mic Button */}
        {text.trim() ? (
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending}
            className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/30 active:scale-90 transition-transform shrink-0 mb-0.5 disabled:opacity-50"
            aria-label="Gửi tin nhắn"
          >
            <SendHorizontal className="w-4 h-4 text-slate-950 font-bold" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenActionSheet}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700/80 flex items-center justify-center text-slate-300 active:scale-90 transition-transform shrink-0 mb-0.5"
            aria-label="Ghi âm giọng nói"
          >
            <Mic className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>
    </div>
  );
};
