'use client';

import React from 'react';
import { Bell, BellRing, CheckSquare, FolderOpen, Palette, PhoneCall, Pin, Search, UserPlus, X } from 'lucide-react';
import type { MosChatConversation } from '@mos-lab/shared';
import { useOmiCall } from '~/context/OmiCallContext';
import { AI_COPILOT_CONV_ID } from '../../constants/chat-constants';
import type { MosChatActiveSubtab } from '../../types/mos-chat-types';
import { dispatchOpenMosChatOmiCallDialer } from '../../utils/omicall-dial-helpers';
import { getHeaderCountBadgeClass, getPushStatusBadgeClass } from './mobileHeaderTypes';

export interface MobileRoomOverflowMenuProps {
  isDark: boolean;
  moreMenuOpen: boolean;
  activeSubtab: MosChatActiveSubtab;
  activeConversation: MosChatConversation | null;
  isSpace: boolean;
  isRoomPinned: boolean;
  openTaskCount: number;
  pinnedCount: number;
  filesCount: number;
  isPushSubscribed: boolean;
  onCloseMenu: () => void;
  onSetActiveSubtab: (tab: MosChatActiveSubtab) => void;
  onTogglePinConversation: (convId: string) => void;
  onOpenSearch?: () => void;
  onOpenMembersModal?: () => void;
  onOpenThemeSheet?: () => void;
  onOpenPushSettings?: () => void;
  onClose?: () => void;
}

export const MobileRoomOverflowMenu: React.FC<MobileRoomOverflowMenuProps> = ({
  isDark,
  moreMenuOpen,
  activeSubtab,
  activeConversation,
  isSpace,
  isRoomPinned,
  openTaskCount,
  pinnedCount,
  filesCount,
  isPushSubscribed,
  onCloseMenu,
  onSetActiveSubtab,
  onTogglePinConversation,
  onOpenSearch,
  onOpenMembersModal,
  onOpenThemeSheet,
  onOpenPushSettings,
  onClose,
}) => {
  const { canAccessOmiCall } = useOmiCall();

  return (
    <>
      {/* Backdrop to close More Menu on outside tap */}
      {moreMenuOpen && <div className="fixed inset-0 z-40" onClick={onCloseMenu} aria-hidden="true" />}

      {/* Overflow Menu Panel (kept mounted with hidden class when closed so accessibility & unit tests work seamlessly) */}
      <div
        data-testid="mos-chat-room-more-menu"
        className={
          moreMenuOpen
            ? 'absolute right-0 top-full mt-2 z-50 w-64 rounded-2xl bg-[var(--mos-surface)]/98 backdrop-blur-2xl border border-[var(--mos-surface-border)] shadow-2xl py-1.5 text-[var(--mos-text)]'
            : 'hidden'
        }
      >
        <button
          type="button"
          onClick={() => {
            onCloseMenu();
            onSetActiveSubtab(activeSubtab === 'tasks' ? 'chat' : 'tasks');
          }}
          className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer"
          aria-label="Xem danh sách công việc"
        >
          <CheckSquare className={`w-4 h-4 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
          <span className="flex-1">Công việc & Nhắc hẹn</span>
          {openTaskCount > 0 && (
            <span
              className={`inline-flex items-center justify-center leading-none py-0.5 px-2 rounded-full text-[11px] font-bold tabular-nums ${getHeaderCountBadgeClass(
                'amber',
                isDark
              )}`}
            >
              {openTaskCount}
            </span>
          )}
        </button>

        {onOpenSearch && (
          <button
            type="button"
            onClick={() => {
              onCloseMenu();
              onOpenSearch();
            }}
            className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer"
            aria-label="Tìm kiếm tin nhắn"
          >
            <Search className={`w-4 h-4 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            <span className="flex-1">Tìm kiếm tin nhắn</span>
          </button>
        )}

        {canAccessOmiCall && (
          <button
            type="button"
            data-testid="mos-chat-mobile-room-menu-omicall"
            onClick={() => {
              onCloseMenu();
              dispatchOpenMosChatOmiCallDialer();
            }}
            className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer"
            aria-label="Gọi số điện thoại qua OmiCall"
          >
            <PhoneCall className={`w-4 h-4 shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <span className="flex-1">Gọi SĐT qua OmiCall</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            onCloseMenu();
            onSetActiveSubtab(activeSubtab === 'pinned' ? 'chat' : 'pinned');
          }}
          className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer"
          aria-label="Xem tin nhắn đã ghim"
        >
          <Pin className={`w-4 h-4 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
          <span className="flex-1">Xem tin nhắn đã ghim</span>
          {pinnedCount > 0 && (
            <span
              className={`inline-flex items-center justify-center leading-none py-0.5 px-2 rounded-full text-[11px] font-bold tabular-nums ${getHeaderCountBadgeClass(
                'amber',
                isDark
              )}`}
            >
              {pinnedCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            onCloseMenu();
            onSetActiveSubtab(activeSubtab === 'files' ? 'chat' : 'files');
          }}
          className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer"
          aria-label="Xem tài liệu và Google Sheet"
        >
          <FolderOpen className={`w-4 h-4 shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <span className="flex-1">Tài liệu & Google Sheet</span>
          {filesCount > 0 && (
            <span
              className={`inline-flex items-center justify-center leading-none py-0.5 px-2 rounded-full text-[11px] font-bold tabular-nums ${getHeaderCountBadgeClass(
                'emerald',
                isDark
              )}`}
            >
              {filesCount}
            </span>
          )}
        </button>

        {activeConversation && activeConversation.id !== AI_COPILOT_CONV_ID && (
          <button
            type="button"
            onClick={() => {
              onCloseMenu();
              onTogglePinConversation(activeConversation.id);
            }}
            className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer"
            aria-label={
              isRoomPinned
                ? isSpace
                  ? 'Bỏ ghim Không gian này'
                  : 'Bỏ ghim cuộc trò chuyện này'
                : isSpace
                  ? 'Ghim Không gian này lên đầu'
                  : 'Ghim cuộc trò chuyện này lên đầu'
            }
          >
            <Pin
              className={`w-4 h-4 shrink-0 ${
                isRoomPinned ? 'fill-amber-400 text-amber-400' : 'text-[var(--mos-text-muted)]'
              }`}
            />
            <span className="flex-1">{isRoomPinned ? 'Bỏ ghim khỏi đầu danh sách' : 'Ghim hội thoại lên đầu'}</span>
          </button>
        )}

        {isSpace && (
          <button
            type="button"
            onClick={() => {
              onCloseMenu();
              onOpenMembersModal?.();
            }}
            className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer"
            aria-label="Thành viên Không gian"
          >
            <UserPlus className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="flex-1">Thành viên Không gian</span>
          </button>
        )}

        {onOpenThemeSheet && (
          <button
            type="button"
            onClick={() => {
              onCloseMenu();
              onOpenThemeSheet();
            }}
            className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer"
            aria-label="Giao diện & Chủ đề"
          >
            <Palette className="w-4 h-4 text-[var(--mos-accent)] shrink-0" />
            <span className="flex-1">Giao diện & Cỡ chữ</span>
          </button>
        )}

        {onOpenPushSettings && (
          <button
            type="button"
            onClick={() => {
              onCloseMenu();
              onOpenPushSettings();
            }}
            className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer border-t border-[var(--mos-surface-border)] mt-1 pt-2.5"
            aria-label="Chuông báo cuộc gọi khi khóa máy"
          >
            {isPushSubscribed ? (
              <BellRing className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <Bell className="w-4 h-4 text-amber-500 shrink-0" />
            )}
            <span className="flex-1">Chuông cuộc gọi khi khóa máy</span>
            <span
              className={`inline-flex items-center justify-center leading-none py-0.5 px-2 rounded-full text-[10px] font-bold ${getPushStatusBadgeClass(
                isPushSubscribed,
                isDark
              )}`}
            >
              {isPushSubscribed ? 'Đã bật' : 'Bật ngay'}
            </span>
          </button>
        )}

        {onClose && (
          <button
            type="button"
            onClick={() => {
              onCloseMenu();
              onClose();
            }}
            className={`w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer border-t border-[var(--mos-surface-border)] mt-1 pt-2.5 ${
              isDark ? 'text-rose-300' : 'text-rose-600'
            }`}
            aria-label="Đóng Chat"
          >
            <X className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="flex-1">Đóng mOS Chat</span>
          </button>
        )}
      </div>
    </>
  );
};
