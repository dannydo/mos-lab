'use client';

import React, { useMemo } from 'react';
import { ChevronLeft, MoreHorizontal, Phone, RefreshCw } from 'lucide-react';
import type { MosChatConversation, MosChatStaffMember } from '@mos-lab/shared';
import { useOmiCall } from '~/context/OmiCallContext';
import { AdaptiveModal } from '~/components/ui';
import type { MosChatActiveSubtab } from '../../types/mos-chat-types';
import { resolveDmOmiCallTarget } from '../../utils/resolveDmOmiCallTarget';
import { formatUnreadBadgeCount } from './mobileHeaderTypes';
import { MobileRoomHeaderIdentity } from './MobileRoomHeaderIdentity';
import { MobileRoomOverflowMenu } from './MobileRoomOverflowMenu';
import { MobileRoomSubtabReturnBar } from './MobileRoomSubtabReturnBar';

export interface MobileHeaderRoomBarProps {
  isDark: boolean;
  totalUnreadCount: number;
  activeSubtab: MosChatActiveSubtab;
  activeConversation: MosChatConversation | null;
  staffDirectory: MosChatStaffMember[];
  isAiCopilot: boolean;
  isSpace: boolean;
  isTasksSubtab: boolean;
  isRoomPinned: boolean;
  roomTitle: string;
  roomSubtitle: string;
  openTaskCount: number;
  pinnedCount: number;
  filesCount: number;
  isPushSubscribed: boolean;
  moreMenuOpen: boolean;
  resetAiConfirmOpen: boolean;
  onBackToInbox: () => void;
  onToggleMoreMenu: () => void;
  onCloseMoreMenu: () => void;
  onSetActiveSubtab: (tab: MosChatActiveSubtab) => void;
  onTogglePinConversation: (convId: string) => void;
  onOpenResetAiConfirm: () => void;
  onCloseResetAiConfirm: () => void;
  onConfirmResetAiChat?: () => Promise<void> | void;
  onCallRoom?: () => void;
  onOpenSettings?: () => void;
  onOpenMembersModal?: () => void;
  onOpenSearch?: () => void;
  onOpenThemeSheet?: () => void;
  onOpenPushSettings?: () => void;
  onClose?: () => void;
}

export const MobileHeaderRoomBar: React.FC<MobileHeaderRoomBarProps> = ({
  isDark,
  totalUnreadCount,
  activeSubtab,
  activeConversation,
  staffDirectory,
  isAiCopilot,
  isSpace,
  isTasksSubtab,
  isRoomPinned,
  roomTitle,
  roomSubtitle,
  openTaskCount,
  pinnedCount,
  filesCount,
  isPushSubscribed,
  moreMenuOpen,
  resetAiConfirmOpen,
  onBackToInbox,
  onToggleMoreMenu,
  onCloseMoreMenu,
  onSetActiveSubtab,
  onTogglePinConversation,
  onOpenResetAiConfirm,
  onCloseResetAiConfirm,
  onConfirmResetAiChat,
  onCallRoom,
  onOpenSettings,
  onOpenMembersModal,
  onOpenSearch,
  onOpenThemeSheet,
  onOpenPushSettings,
  onClose,
}) => {
  const { makeCall, canAccessOmiCall } = useOmiCall();
  const omiCallTarget = useMemo(
    () => (canAccessOmiCall ? resolveDmOmiCallTarget(activeConversation, staffDirectory) : null),
    [canAccessOmiCall, activeConversation, staffDirectory]
  );

  return (
    <header className="sticky top-0 z-40 bg-[var(--mos-surface)]/90 backdrop-blur-xl border-b border-[var(--mos-surface-border)] shadow-xs flex flex-col select-none">
      <div className="px-3 pt-[max(env(safe-area-inset-top),10px)] pb-2 min-h-[44px] flex items-center justify-between gap-2">
        {/* Left: Back button + Compact Room Identity */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <button
            type="button"
            onClick={onBackToInbox}
            className={`shrink-0 inline-flex items-center font-medium text-sm py-1 pr-1 active:opacity-70 transition-opacity cursor-pointer ${
              isDark ? 'text-amber-400' : 'text-amber-600'
            }`}
            aria-label="Quay lại danh sách hội thoại"
          >
            <ChevronLeft className="w-5 h-5 -ml-1" />
            {totalUnreadCount > 0 && (
              <span className="text-xs font-semibold tabular-nums -ml-0.5 leading-none">
                {formatUnreadBadgeCount(totalUnreadCount)}
              </span>
            )}
          </button>

          <MobileRoomHeaderIdentity
            isDark={isDark}
            isTasksSubtab={isTasksSubtab}
            isAiCopilot={isAiCopilot}
            isSpace={isSpace}
            isRoomPinned={isRoomPinned}
            roomTitle={roomTitle}
            subtitle={roomSubtitle}
            activeConversation={activeConversation}
            staffDirectory={staffDirectory}
            onOpenSettings={onOpenSettings}
            onOpenMembersModal={onOpenMembersModal}
          />
        </div>

        {/* Right Actions: Strictly 2 flat minimalist controls ([📞] or [↻]) + [⋯ More] */}
        <div className="shrink-0 flex items-center gap-1 relative">
          {isAiCopilot ? (
            <button
              type="button"
              onClick={onOpenResetAiConfirm}
              className={`w-8 h-8 rounded-full hover:bg-[var(--mos-surface-muted)] flex items-center justify-center transition-colors active:scale-95 cursor-pointer ${
                isDark ? 'text-purple-300 hover:text-white' : 'text-purple-700'
              }`}
              aria-label="Làm mới cuộc trò chuyện với MAI"
              title="Làm mới cuộc trò chuyện với MAI"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onCallRoom}
              className="w-8 h-8 rounded-full text-emerald-500 hover:bg-emerald-500/10 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
              aria-label="Gọi thoại nội bộ mOS"
              title="Gọi thoại nội bộ mOS"
            >
              <Phone className="w-4 h-4" />
            </button>
          )}

          {/* More Menu Button [⋯] */}
          <button
            type="button"
            data-testid="mos-chat-room-more-btn"
            onClick={onToggleMoreMenu}
            className={`w-8 h-8 relative rounded-full flex items-center justify-center transition-colors active:scale-95 cursor-pointer ${
              moreMenuOpen || activeSubtab === 'pinned' || activeSubtab === 'tasks' || activeSubtab === 'files'
                ? isDark
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-amber-50 text-amber-700'
                : 'text-[var(--mos-text)] hover:bg-[var(--mos-surface-muted)]'
            }`}
            aria-label="Mở menu tùy chọn phòng chat"
            aria-expanded={moreMenuOpen}
            title="Tùy chọn phòng chat"
          >
            <MoreHorizontal className="w-4 h-4" />
            {(openTaskCount > 0 || pinnedCount > 0 || !isPushSubscribed) && !moreMenuOpen && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" aria-hidden="true" />
            )}
          </button>

          <MobileRoomOverflowMenu
            isDark={isDark}
            moreMenuOpen={moreMenuOpen}
            activeSubtab={activeSubtab}
            activeConversation={activeConversation}
            isSpace={isSpace}
            isRoomPinned={isRoomPinned}
            openTaskCount={openTaskCount}
            pinnedCount={pinnedCount}
            filesCount={filesCount}
            isPushSubscribed={isPushSubscribed}
            canOmiCall={canAccessOmiCall}
            omiCallTarget={omiCallTarget}
            onCallOmiCallPhone={
              canAccessOmiCall
                ? (phone, label, avatar) =>
                    void makeCall(phone, label, undefined, avatar || undefined, undefined, { autoEnableAdmin: true })
                : undefined
            }
            onCloseMenu={onCloseMoreMenu}
            onSetActiveSubtab={onSetActiveSubtab}
            onTogglePinConversation={onTogglePinConversation}
            onOpenSearch={onOpenSearch}
            onOpenMembersModal={onOpenMembersModal}
            onOpenThemeSheet={onOpenThemeSheet}
            onOpenPushSettings={onOpenPushSettings}
            onClose={onClose}
          />
        </div>
      </div>

      <MobileRoomSubtabReturnBar
        isDark={isDark}
        activeSubtab={activeSubtab}
        hasActiveConversation={Boolean(activeConversation)}
        pinnedCount={pinnedCount}
        filesCount={filesCount}
        onBackToChat={() => onSetActiveSubtab('chat')}
      />

      {isAiCopilot && (
        <AdaptiveModal
          intent="confirm"
          open={resetAiConfirmOpen}
          title="Làm mới cuộc trò chuyện với MAI?"
          okText="Làm mới"
          cancelText="Huỷ"
          okButtonProps={{ danger: true }}
          centered
          destroyOnHidden
          wrapClassName={isDark ? 'dark-theme' : 'light-theme'}
          onOk={async () => {
            try {
              await onConfirmResetAiChat?.();
            } finally {
              onCloseResetAiConfirm();
            }
          }}
          onCancel={onCloseResetAiConfirm}
        >
          <p className="text-sm text-[var(--mos-text-muted)] mb-0">
            Toàn bộ tin nhắn cũ trong phiên làm việc này sẽ được dọn dẹp để bắt đầu câu hỏi mới.
          </p>
        </AdaptiveModal>
      )}
    </header>
  );
};
