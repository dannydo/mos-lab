'use client';

import React from 'react';
import { X, SendHorizontal, Smile } from 'lucide-react';
import { MosChatStickerAndEmojiPicker, type MosChatStickerItem, type MosChatStickerPackId } from '../mos-chat-stickers';
import { WINGS_SIGNATURE_EMOJIS, GOOGLE_CHAT_REACTION_EMOJIS } from '../constants/chat-constants';
import { useTheme } from '../../../context/ThemeContext';

export interface MosChatMobileStickerSheetProps {
  open: boolean;
  onClose: () => void;
  initialPack?: MosChatStickerPackId;
  onSelectSticker: (sticker: MosChatStickerItem) => void;
  onSelectEmoji: (emoji: string) => void;
  currentText?: string;
  onSend?: () => void;
}

export const MosChatMobileStickerSheet: React.FC<MosChatMobileStickerSheetProps> = ({
  open,
  onClose,
  initialPack = 'emoji',
  onSelectSticker,
  onSelectEmoji,
  currentText,
  onSend,
}) => {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end select-none">
      {/* Dimmed Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 backdrop-blur-sm transition-opacity ${isDark ? 'bg-black/60' : 'bg-slate-900/40'}`}
        aria-hidden="true"
      />

      {/* Slide-up Bottom Sheet */}
      <div className="relative bg-[var(--mos-surface-raised)] text-[var(--mos-text)] border-t border-[var(--mos-surface-border)] rounded-t-3xl px-3 pt-3 pb-[max(env(safe-area-inset-bottom,20px),16px)] shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[82vh] flex flex-col">
        {/* Grab Handle */}
        <div className="w-10 h-1 bg-[var(--mos-surface-border-strong)] rounded-full mx-auto mb-2 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-2 mb-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] flex items-center justify-center text-[var(--mos-accent)]">
              <Smile className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-[var(--mos-text)] tracking-tight">Biểu cảm & Nhãn dán</span>
              <span
                className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-semibold border ${
                  isDark
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                mOS Chat
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] active:scale-95"
            aria-label="Đóng bảng biểu cảm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Picker Area */}
        <div className="flex-1 overflow-y-auto">
          <MosChatStickerAndEmojiPicker
            isDark={isDark}
            borderColor="var(--mos-surface-border)"
            surfaceRaised="var(--mos-surface)"
            wingsSignatureEmojis={WINGS_SIGNATURE_EMOJIS}
            popularEmojis={GOOGLE_CHAT_REACTION_EMOJIS}
            defaultPack={initialPack}
            width="100%"
            onSelectSticker={(sticker) => {
              onSelectSticker(sticker);
              onClose();
            }}
            onSelectEmoji={(emoji) => {
              onSelectEmoji(emoji);
            }}
            mode="composer"
          />
        </div>

        {/* Live Composer Preview & Fast Send Bar */}
        {currentText && currentText.trim().length > 0 && onSend && (
          <div className="mt-2 pt-2 border-t border-[var(--mos-surface-border)] flex items-center justify-between gap-2 px-1 shrink-0">
            <div className="flex-1 truncate text-xs text-[var(--mos-text)] bg-[var(--mos-surface-muted)] rounded-xl px-3 py-1.5 border border-[var(--mos-surface-border)]">
              {currentText}
            </div>
            <button
              type="button"
              onClick={() => {
                onSend();
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[var(--mos-accent)] text-[var(--mos-accent-contrast)] font-bold text-xs flex items-center gap-1.5 active:scale-95 shadow-md hover:opacity-95"
            >
              <span>Gửi</span>
              <SendHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
