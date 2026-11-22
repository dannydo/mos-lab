'use client';

import React from 'react';
import { Tooltip } from 'antd';
import { ChevronRight, CornerDownRight, Pin, PinOff } from 'lucide-react';
import type { MosChatConversation, MosChatMessage, SafeAny } from '@mos-lab/shared';

export interface MosChatPinnedBannerProps {
  activeConversation: MosChatConversation | null;
  pinnedMessages: MosChatMessage[];
  pinnedBannerIndex: number;
  setPinnedBannerIndex: React.Dispatch<React.SetStateAction<number>>;
  isDark: boolean;
  borderColor: string;
  navigateToMessage: (convId: string, msgId: string) => void;
  setActiveSubtab: (tab: SafeAny) => void;
  handleTogglePin: (msgId: string) => void;
  formatMoveTargetSnippet: (msg: MosChatMessage) => string;
}

export const MosChatPinnedBanner: React.FC<MosChatPinnedBannerProps> = ({
  activeConversation,
  pinnedMessages,
  pinnedBannerIndex,
  setPinnedBannerIndex,
  isDark,
  borderColor,
  navigateToMessage,
  setActiveSubtab,
  handleTogglePin,
  formatMoveTargetSnippet,
}) => {
  if (pinnedMessages.length === 0 || !activeConversation) return null;

  const currentPinnedMsg = pinnedMessages[pinnedBannerIndex % pinnedMessages.length];

  return (
    <div
      className="px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 z-10 transition-colors text-[12px]"
      style={{
        background: isDark ? 'rgba(30, 41, 59, 0.72)' : 'rgba(254, 243, 199, 0.65)',
        borderBottom: `1px solid ${borderColor}`,
        backdropFilter: 'blur(6px)',
      }}
    >
      {/* Left: Icon + Text snippet (click to navigate) */}
      <div
        onClick={() => {
          if (currentPinnedMsg) navigateToMessage(activeConversation.id, currentPinnedMsg.id);
        }}
        className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer hover:opacity-85 transition-opacity"
        title="Nhấn để đi đến tin nhắn đã ghim"
      >
        <div
          className="w-6 h-6 rounded-md inline-flex items-center justify-center shrink-0"
          style={{ background: 'rgba(212, 168, 75, 0.2)', color: '#d4a84b' }}
        >
          <Pin size={13} className="fill-amber-400" />
        </div>

        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 shrink-0">
            {pinnedMessages.length > 1
              ? `Ghim (${(pinnedBannerIndex % pinnedMessages.length) + 1}/${pinnedMessages.length}):`
              : 'Đã ghim:'}
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 shrink-0">
            {currentPinnedMsg?.senderName}:
          </span>
          <span className="text-slate-600 dark:text-slate-300 truncate">
            {formatMoveTargetSnippet(currentPinnedMsg)}
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {pinnedMessages.length > 1 && (
          <Tooltip title="Xem tin nhắn đã ghim tiếp theo">
            <button
              type="button"
              aria-label="Tin nhắn ghim tiếp theo"
              onClick={() => setPinnedBannerIndex((prev) => (prev + 1) % pinnedMessages.length)}
              className="w-6 h-6 rounded inline-flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            >
              <ChevronRight size={13} />
            </button>
          </Tooltip>
        )}

        <Tooltip title="Đi đến tin nhắn này trong cuộc trò chuyện">
          <button
            type="button"
            aria-label="Đi đến tin nhắn đã ghim"
            onClick={() => {
              if (currentPinnedMsg) navigateToMessage(activeConversation.id, currentPinnedMsg.id);
            }}
            className="h-6 px-2 rounded-md inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer transition-colors"
            style={{
              background: 'rgba(212, 168, 75, 0.18)',
              color: '#d4a84b',
              border: '1px solid rgba(212, 168, 75, 0.35)',
            }}
          >
            <CornerDownRight size={12} />
            <span className="hidden sm:inline">Đi đến tin nhắn</span>
          </button>
        </Tooltip>

        <Tooltip title="Xem danh sách tất cả tin nhắn đã ghim">
          <button
            type="button"
            aria-label="Xem tất cả tin ghim"
            onClick={() => setActiveSubtab('pinned')}
            className="h-6 px-1.5 rounded-md inline-flex items-center text-[11px] font-semibold text-slate-400 hover:text-amber-500 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            Tất cả ({pinnedMessages.length})
          </button>
        </Tooltip>

        <Tooltip title="Bỏ ghim tin nhắn này">
          <button
            type="button"
            aria-label="Bỏ ghim"
            onClick={() => {
              if (currentPinnedMsg) handleTogglePin(currentPinnedMsg.id);
            }}
            className="w-6 h-6 rounded-md inline-flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
          >
            <PinOff size={13} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
