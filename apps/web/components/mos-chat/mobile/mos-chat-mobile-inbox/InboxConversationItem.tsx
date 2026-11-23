'use client';

import React from 'react';
import { Hash, MessageSquareReply, Pin, Sparkles } from 'lucide-react';
import type { MosChatConversation, MosChatStaffMember } from '@mos-lab/shared';
import { AI_COPILOT_CONV_ID, isSpaceEmoji } from '../../constants/chat-constants';
import { MosChatAvatar } from '../../MosChatAvatar';
import type { MosChatSidebarFilter } from '../../types/mos-chat-types';
import { formatConversationTimeLabel, getConversationPreviewText, resolveSpaceAvatarToneClasses } from './inboxHelpers';

export interface InboxConversationItemProps {
  conv: MosChatConversation;
  prevConv: MosChatConversation | null;
  isDark: boolean;
  isSelected: boolean;
  isPinned: boolean;
  isPrevPinned: boolean;
  sidebarFilter: MosChatSidebarFilter;
  staffDirectory: MosChatStaffMember[];
  onSelect: (convId: string) => void;
  onTouchStart: (conv: MosChatConversation) => void;
  onTouchCancelOrEnd: () => void;
  onOpenActionSheet: (conv: MosChatConversation) => void;
}

export const InboxConversationItem: React.FC<InboxConversationItemProps> = ({
  conv,
  prevConv,
  isDark,
  isSelected,
  isPinned,
  isPrevPinned,
  sidebarFilter,
  staffDirectory,
  onSelect,
  onTouchStart,
  onTouchCancelOrEnd,
  onOpenActionSheet,
}) => {
  const isSpace = conv.type === 'space';
  const isAiCopilot = conv.id === AI_COPILOT_CONV_ID;
  const unread = conv.unreadCount || 0;
  const timeStr = formatConversationTimeLabel(conv);
  const preview = getConversationPreviewText(conv);
  const spaceToneClasses = resolveSpaceAvatarToneClasses(conv.color, isDark);

  const showPinnedSubHeader =
    sidebarFilter !== 'pinned' && isPinned && (!prevConv || prevConv.id === AI_COPILOT_CONV_ID);
  const showUnpinnedSubHeader =
    sidebarFilter !== 'pinned' && !isPinned && conv.id !== AI_COPILOT_CONV_ID && isPrevPinned;

  return (
    <>
      {showPinnedSubHeader && (
        <div
          className={`px-4 py-1.5 bg-[var(--mos-surface)] border-b border-[var(--mos-surface-border)] flex items-center justify-between text-[11px] font-bold uppercase tracking-wider select-none ${
            isDark ? 'text-amber-400' : 'text-amber-600'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Pin className={`w-3 h-3 ${isDark ? 'fill-amber-400' : 'fill-amber-600'}`} />
            <span>Đã ghim</span>
          </span>
          <span className="text-[10px] text-[var(--mos-text-muted)] font-normal lowercase">Luôn hiển thị ở đầu</span>
        </div>
      )}

      {showUnpinnedSubHeader && (
        <div className="px-4 py-1.5 bg-[var(--mos-surface-muted)] border-b border-[var(--mos-surface-border)] text-[11px] font-bold text-[var(--mos-text-muted)] uppercase tracking-wider select-none">
          {sidebarFilter === 'spaces'
            ? 'Không gian khác'
            : sidebarFilter === 'dms'
              ? 'Tin nhắn trực tiếp khác'
              : 'Tất cả cuộc trò chuyện'}
        </div>
      )}

      <div
        onClick={() => onSelect(conv.id)}
        onTouchStart={() => onTouchStart(conv)}
        onTouchMove={onTouchCancelOrEnd}
        onTouchEnd={onTouchCancelOrEnd}
        onContextMenu={(e) => {
          e.preventDefault();
          onOpenActionSheet(conv);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(conv.id);
          }
        }}
        className={`w-full px-3.5 py-2.5 flex items-center gap-3 active:bg-[var(--mos-surface-muted)] transition-colors border-b border-[var(--mos-surface-border)] select-none cursor-pointer ${
          isSelected ? 'bg-[var(--mos-surface-raised)]' : isPinned ? 'bg-amber-500/[0.04]' : 'bg-transparent'
        } ${isPinned ? 'border-l-[3px] border-l-amber-500' : ''}`}
      >
        {/* Avatar or Icon */}
        <div className="relative shrink-0">
          {isAiCopilot ? (
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
          ) : isSpace ? (
            <div
              className={`w-11 h-11 rounded-2xl border flex items-center justify-center font-bold text-xl shadow-xs ${spaceToneClasses}`}
            >
              {conv.avatar && isSpaceEmoji(conv.avatar) ? (
                <span className="select-none leading-none">{conv.avatar}</span>
              ) : (
                <Hash className="w-5 h-5" />
              )}
            </div>
          ) : (
            <MosChatAvatar
              size={44}
              shape="square"
              src={conv.avatar}
              name={conv.name}
              staffId={conv.participantStaffId}
              staffDirectory={staffDirectory}
              showOnline={true}
              isOnline={true}
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <h3
                className={`text-sm font-semibold truncate ${
                  unread > 0 ? 'text-[var(--mos-text)]' : isDark ? 'text-slate-200' : 'text-[var(--mos-text)]'
                }`}
              >
                {conv.name}
              </h3>
              {isPinned && (
                <Pin
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isDark ? 'text-amber-400 fill-amber-400' : 'text-amber-600 fill-amber-600'
                  }`}
                  aria-label="Đã ghim"
                />
              )}
            </div>
            {timeStr && (
              <span
                className={`text-[11px] shrink-0 tabular-nums ${
                  unread > 0
                    ? `${isDark ? 'text-amber-400' : 'text-amber-600'} font-semibold`
                    : 'text-[var(--mos-text-muted)]'
                }`}
              >
                {timeStr}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <p
              className={`text-xs truncate ${
                unread > 0 ? 'text-[var(--mos-text)] font-medium' : 'text-[var(--mos-text-muted)]'
              }`}
            >
              {preview}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              {(conv.unreadThreadCount || 0) > 0 && (
                <span
                  className={`h-[18px] px-1.5 inline-flex items-center gap-0.5 justify-center leading-none text-[10px] font-bold border rounded-full tabular-nums ${
                    isDark
                      ? 'text-indigo-300 bg-indigo-500/25 border-indigo-500/40'
                      : 'text-indigo-700 bg-indigo-500/15 border-indigo-500/35'
                  }`}
                >
                  <MessageSquareReply className="w-2.5 h-2.5" />
                  {conv.unreadThreadCount}
                </span>
              )}
              {unread > 0 && (
                <span className="min-w-[18px] h-[18px] px-1.5 inline-flex items-center justify-center leading-none text-[10px] font-bold text-white bg-rose-500 rounded-full tabular-nums shadow-xs shadow-rose-500/40">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
