'use client';

import React from 'react';
import { X, SendHorizontal, Smile } from 'lucide-react';
import { MosChatStickerAndEmojiPicker, type MosChatStickerItem, type MosChatStickerPackId } from '../mos-chat-stickers';
import { WINGS_SIGNATURE_EMOJIS, GOOGLE_CHAT_REACTION_EMOJIS } from '../constants/chat-constants';

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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end select-none">
      {/* Dimmed Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />

      {/* Slide-up Bottom Sheet */}
      <div className="relative bg-slate-900 border-t border-slate-800 rounded-t-3xl px-3 pt-3 pb-[max(env(safe-area-inset-bottom,20px),16px)] shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[82vh] flex flex-col">
        {/* Grab Handle */}
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-2 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-2 mb-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Smile className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight">Biểu cảm & Nhãn dán</span>
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                mOS Chat
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white active:scale-95"
            aria-label="Đóng bảng biểu cảm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Picker Area */}
        <div className="flex-1 overflow-y-auto">
          <MosChatStickerAndEmojiPicker
            isDark={true}
            borderColor="#334155"
            surfaceRaised="#0f172a"
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
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 px-1 shrink-0">
            <div className="flex-1 truncate text-xs text-slate-200 bg-slate-800/90 rounded-xl px-3 py-1.5 border border-slate-700/60">
              {currentText}
            </div>
            <button
              type="button"
              onClick={() => {
                onSend();
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 active:scale-95 shadow-md shadow-amber-500/20"
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
