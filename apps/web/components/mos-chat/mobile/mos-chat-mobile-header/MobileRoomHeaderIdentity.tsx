'use client';

import React from 'react';
import { CheckSquare, Hash, Pin, Sparkles } from 'lucide-react';
import type { MosChatConversation, MosChatStaffMember } from '@mos-lab/shared';
import { isSpaceEmoji } from '../../constants/chat-constants';
import { MosChatAvatar } from '../../MosChatAvatar';

export interface MobileRoomHeaderIdentityProps {
  isDark: boolean;
  isTasksSubtab: boolean;
  isAiCopilot: boolean;
  isSpace: boolean;
  isRoomPinned: boolean;
  roomTitle: string;
  subtitle: string;
  activeConversation: MosChatConversation | null;
  staffDirectory: MosChatStaffMember[];
  onOpenSettings?: () => void;
  onOpenMembersModal?: () => void;
}

export const MobileRoomHeaderIdentity: React.FC<MobileRoomHeaderIdentityProps> = ({
  isDark,
  isTasksSubtab,
  isAiCopilot,
  isSpace,
  isRoomPinned,
  roomTitle,
  subtitle,
  activeConversation,
  staffDirectory,
  onOpenSettings,
  onOpenMembersModal,
}) => {
  return (
    <div
      onClick={!isTasksSubtab && isSpace ? onOpenSettings : undefined}
      role={!isTasksSubtab && isSpace ? 'button' : undefined}
      className={`flex-1 min-w-0 flex items-center justify-start ${
        !isTasksSubtab && isSpace ? 'cursor-pointer active:opacity-75' : ''
      }`}
    >
      {isTasksSubtab ? (
        <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
          <div
            className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
              isDark
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-[var(--mos-text)] truncate leading-snug">{roomTitle}</h2>
            <p className="text-[11px] text-[var(--mos-text-muted)] truncate leading-none mt-0.5">{subtitle}</p>
          </div>
        </div>
      ) : isAiCopilot ? (
        <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20 shrink-0">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-[var(--mos-text)] truncate leading-snug">🤖 MAI</h2>
              <span
                className={`inline-flex items-center justify-center leading-none text-[10px] px-1.5 py-0.5 rounded font-bold uppercase border shrink-0 ${
                  isDark
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'bg-purple-100 text-purple-700 border-purple-200'
                }`}
              >
                mOS AI
              </span>
            </div>
            <p
              className={`text-[11px] truncate leading-none mt-0.5 ${isDark ? 'text-purple-300/80' : 'text-purple-700'}`}
            >
              Tra cứu & Phân tích riêng tư
            </p>
          </div>
        </div>
      ) : isSpace ? (
        <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
          <div className="w-8 h-8 rounded-xl bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] flex items-center justify-center shrink-0">
            {activeConversation?.avatar && isSpaceEmoji(activeConversation.avatar) ? (
              <span className="text-sm leading-none">{activeConversation.avatar}</span>
            ) : (
              <Hash className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h2 className="text-sm font-bold text-[var(--mos-text)] truncate leading-snug">{roomTitle}</h2>
              {isRoomPinned && (
                <Pin
                  className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-amber-400 fill-amber-400' : 'text-amber-600 fill-amber-600'}`}
                  aria-label="Đã ghim"
                />
              )}
            </div>
            <p
              onClick={(e) => {
                if (onOpenMembersModal) {
                  e.stopPropagation();
                  onOpenMembersModal();
                }
              }}
              className="text-[11px] text-[var(--mos-text-muted)] hover:text-emerald-500 transition-colors truncate leading-none mt-0.5"
            >
              {subtitle}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
          <div className="shrink-0">
            <MosChatAvatar
              size="md"
              src={activeConversation?.avatar}
              name={roomTitle}
              staffId={activeConversation?.participantStaffId}
              staffDirectory={staffDirectory}
              showOnline={true}
              isOnline={true}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h2 className="text-sm font-bold text-[var(--mos-text)] truncate leading-snug">{roomTitle}</h2>
              {isRoomPinned && (
                <Pin
                  className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-amber-400 fill-amber-400' : 'text-amber-600 fill-amber-600'}`}
                  aria-label="Đã ghim"
                />
              )}
            </div>
            <p className="text-[11px] text-[var(--mos-text-muted)] truncate leading-none mt-0.5">{subtitle}</p>
          </div>
        </div>
      )}
    </div>
  );
};
