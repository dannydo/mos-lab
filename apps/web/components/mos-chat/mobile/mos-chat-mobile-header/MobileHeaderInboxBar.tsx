'use client';

import React from 'react';
import { MoreHorizontal, SquarePen, X } from 'lucide-react';
import type { MosChatPresenceStatus, SafeAny } from '@mos-lab/shared';
import MosAppLauncher from '../../../layout/MosAppLauncher';
import type { MosChatSidebarFilter } from '../../types/mos-chat-types';
import { formatUnreadBadgeCount } from './mobileHeaderTypes';
import { MobileInboxOverflowMenu } from './MobileInboxOverflowMenu';

export interface MobileHeaderInboxBarProps {
  isDark: boolean;
  currentUser: SafeAny;
  totalUnreadCount: number;
  inboxMenuOpen: boolean;
  presence: MosChatPresenceStatus;
  presenceDotClass: string;
  openTaskCount: number;
  pinnedConvCount: number;
  sidebarFilter: MosChatSidebarFilter;
  isPushSubscribed: boolean;
  onToggleInboxMenu: () => void;
  onCloseInboxMenu: () => void;
  onSelectPresence: (presence: MosChatPresenceStatus) => void;
  onOpenTasks: () => void;
  onTogglePinnedFilter: () => void;
  onOpenSearch?: () => void;
  onOpenThemeSheet?: () => void;
  onOpenPushSettings?: () => void;
  onOpenNewDm?: () => void;
  onClose?: () => void;
}

export const MobileHeaderInboxBar: React.FC<MobileHeaderInboxBarProps> = ({
  isDark,
  currentUser,
  totalUnreadCount,
  inboxMenuOpen,
  presence,
  presenceDotClass,
  openTaskCount,
  pinnedConvCount,
  sidebarFilter,
  isPushSubscribed,
  onToggleInboxMenu,
  onCloseInboxMenu,
  onSelectPresence,
  onOpenTasks,
  onTogglePinnedFilter,
  onOpenSearch,
  onOpenThemeSheet,
  onOpenPushSettings,
  onOpenNewDm,
  onClose,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[var(--mos-surface)]/90 backdrop-blur-xl border-b border-[var(--mos-surface-border)] shadow-xs flex flex-col select-none">
      <div className="px-3 pt-[max(env(safe-area-inset-top),8px)] pb-2 min-h-[44px] flex items-center justify-between gap-2">
        {/* Left: [9-Dot App Launcher] + [⋯] Utility & Navigation Menu */}
        <div className="min-w-[76px] flex items-center justify-start gap-1.5 relative shrink-0">
          <MosAppLauncher
            currentApp="chat"
            userRole={currentUser?.role}
            teamCodes={currentUser?.teamCodes}
            displayName={currentUser?.displayName}
            unreadChatCount={totalUnreadCount}
            onAfterNavigate={() => onClose?.()}
            onOpenProfile={onOpenThemeSheet}
            shape="circle"
          />
          <button
            type="button"
            data-testid="mos-chat-inbox-more-btn"
            onClick={onToggleInboxMenu}
            className={`w-8 h-8 relative rounded-full border flex items-center justify-center transition-colors active:scale-95 cursor-pointer ${
              inboxMenuOpen
                ? isDark
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-[var(--mos-surface-muted)] border-[var(--mos-surface-border)] text-[var(--mos-text)] hover:opacity-85'
            }`}
            aria-label="Mở menu tiện ích & điều hướng"
            aria-expanded={inboxMenuOpen}
            title="Menu tiện ích & điều hướng"
          >
            <MoreHorizontal className="w-4 h-4" />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-[var(--mos-surface)] ${presenceDotClass}`}
              aria-hidden="true"
            />
            {(!isPushSubscribed || openTaskCount > 0) && !inboxMenuOpen && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400" aria-hidden="true" />
            )}
          </button>

          <MobileInboxOverflowMenu
            isDark={isDark}
            inboxMenuOpen={inboxMenuOpen}
            presence={presence}
            openTaskCount={openTaskCount}
            pinnedConvCount={pinnedConvCount}
            sidebarFilter={sidebarFilter}
            isPushSubscribed={isPushSubscribed}
            onCloseMenu={onCloseInboxMenu}
            onSelectPresence={onSelectPresence}
            onOpenTasks={onOpenTasks}
            onTogglePinnedFilter={onTogglePinnedFilter}
            onOpenSearch={onOpenSearch}
            onOpenThemeSheet={onOpenThemeSheet}
            onOpenPushSettings={onOpenPushSettings}
          />
        </div>

        {/* Center: Clean Title "Chat" + Unread Badge */}
        <div className="flex-1 flex items-center justify-center min-w-0">
          <h1 className="text-base font-semibold text-[var(--mos-text)] tracking-tight leading-none inline-flex items-center gap-1.5">
            <span>Chat</span>
            {totalUnreadCount > 0 && (
              <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 text-[11px] font-bold bg-rose-500 text-white rounded-full tabular-nums">
                {formatUnreadBadgeCount(totalUnreadCount)}
              </span>
            )}
          </h1>
        </div>

        {/* Right: [📝 Compose] + Optional [✕ Close] */}
        <div className="w-20 flex items-center justify-end gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onOpenNewDm?.()}
            className="w-8 h-8 rounded-full bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] text-[var(--mos-accent)] hover:opacity-85 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            aria-label="Soạn tin nhắn DM mới"
            title="Tin nhắn mới / Danh bạ"
          >
            <SquarePen className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] active:scale-95 transition-all flex items-center justify-center cursor-pointer"
              aria-label="Đóng Chat"
              title="Đóng Chat"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
