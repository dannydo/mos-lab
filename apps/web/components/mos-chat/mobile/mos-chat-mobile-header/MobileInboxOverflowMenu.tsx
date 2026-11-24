'use client';

import React from 'react';
import { Bell, BellRing, CheckSquare, Palette, PhoneCall, Pin, Search } from 'lucide-react';
import type { MosChatPresenceStatus } from '@mos-lab/shared';
import { useOmiCall } from '~/context/OmiCallContext';
import type { MosChatSidebarFilter } from '../../types/mos-chat-types';
import { dispatchOpenMosChatOmiCallDialer } from '../../utils/omicall-dial-helpers';
import { getHeaderCountBadgeClass, getPushStatusBadgeClass, PRESENCE_OPTIONS } from './mobileHeaderTypes';

export interface MobileInboxOverflowMenuProps {
  isDark: boolean;
  inboxMenuOpen: boolean;
  presence: MosChatPresenceStatus;
  openTaskCount: number;
  pinnedConvCount: number;
  sidebarFilter: MosChatSidebarFilter;
  isPushSubscribed: boolean;
  onCloseMenu: () => void;
  onSelectPresence: (presence: MosChatPresenceStatus) => void;
  onOpenTasks: () => void;
  onTogglePinnedFilter: () => void;
  onOpenSearch?: () => void;
  onOpenThemeSheet?: () => void;
  onOpenPushSettings?: () => void;
}

export const MobileInboxOverflowMenu: React.FC<MobileInboxOverflowMenuProps> = ({
  isDark,
  inboxMenuOpen,
  presence,
  openTaskCount,
  pinnedConvCount,
  sidebarFilter,
  isPushSubscribed,
  onCloseMenu,
  onSelectPresence,
  onOpenTasks,
  onTogglePinnedFilter,
  onOpenSearch,
  onOpenThemeSheet,
  onOpenPushSettings,
}) => {
  const { canAccessOmiCall } = useOmiCall();

  return (
    <>
      {inboxMenuOpen && <div className="fixed inset-0 z-40" onClick={onCloseMenu} aria-hidden="true" />}

      {/* Overflow Menu Panel (kept mounted with hidden class when closed so accessibility & unit tests work seamlessly) */}
      <div
        data-testid="mos-chat-inbox-more-menu"
        className={
          inboxMenuOpen
            ? 'absolute left-0 top-full mt-2 z-50 w-72 rounded-2xl bg-[var(--mos-surface)]/98 backdrop-blur-2xl border border-[var(--mos-surface-border)] shadow-2xl p-2 text-[var(--mos-text)]'
            : 'hidden'
        }
      >
        {/* 3-segment Presence Switcher */}
        <div
          role="group"
          aria-label="Trạng thái hoạt động"
          className="grid grid-cols-3 gap-1 p-1 mb-1.5 rounded-xl bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)]"
        >
          {PRESENCE_OPTIONS.map((opt) => {
            const active = presence === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onSelectPresence(opt.id);
                  onCloseMenu();
                }}
                aria-pressed={active}
                className={`py-1.5 px-2 rounded-lg text-[11px] inline-flex items-center justify-center gap-1.5 leading-none transition-all active:scale-95 cursor-pointer ${
                  active
                    ? 'bg-[var(--mos-surface)] text-[var(--mos-text)] font-bold shadow-xs'
                    : 'text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] font-medium'
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotClass}`} />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Kho Công việc */}
        <button
          type="button"
          aria-label="Kho Công việc & Nhắc hẹn (Tasks)"
          onClick={() => {
            onCloseMenu();
            onOpenTasks();
          }}
          className="w-full px-3 py-2.5 rounded-xl flex items-center gap-2.5 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer"
        >
          <CheckSquare className={`w-4 h-4 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
          <span className="flex-1">Kho Công việc</span>
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

        {/* Hội thoại đã ghim */}
        <button
          type="button"
          aria-label="Lọc hội thoại đã ghim"
          onClick={() => {
            onCloseMenu();
            onTogglePinnedFilter();
          }}
          className="w-full px-3 py-2.5 rounded-xl flex items-center gap-2.5 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer"
        >
          <Pin
            className={`w-4 h-4 shrink-0 ${
              sidebarFilter === 'pinned'
                ? isDark
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-amber-600 fill-amber-600'
                : 'text-[var(--mos-text-muted)]'
            }`}
          />
          <span className="flex-1">Hội thoại đã ghim</span>
          {pinnedConvCount > 0 && (
            <span
              className={`inline-flex items-center justify-center leading-none py-0.5 px-2 rounded-full text-[11px] font-bold tabular-nums ${getHeaderCountBadgeClass(
                'amber',
                isDark
              )}`}
            >
              {pinnedConvCount}
            </span>
          )}
        </button>

        {/* Tìm kiếm tin nhắn */}
        {onOpenSearch && (
          <button
            type="button"
            aria-label="Tìm kiếm tin nhắn"
            onClick={() => {
              onCloseMenu();
              onOpenSearch();
            }}
            className="w-full px-3 py-2.5 rounded-xl flex items-center gap-2.5 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer"
          >
            <Search className={`w-4 h-4 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            <span className="flex-1">Tìm kiếm tin nhắn</span>
          </button>
        )}

        {/* Gọi SĐT qua OmiCall */}
        {canAccessOmiCall && (
          <button
            type="button"
            data-testid="mos-chat-mobile-inbox-menu-omicall"
            aria-label="Gọi số điện thoại qua OmiCall"
            onClick={() => {
              onCloseMenu();
              dispatchOpenMosChatOmiCallDialer();
            }}
            className="w-full px-3 py-2.5 rounded-xl flex items-center gap-2.5 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer"
          >
            <PhoneCall className={`w-4 h-4 shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <span className="flex-1">Gọi SĐT qua OmiCall</span>
          </button>
        )}

        {/* Hồ sơ & Giao diện */}
        {onOpenThemeSheet && (
          <button
            type="button"
            aria-label="Giao diện & Chủ đề"
            onClick={() => {
              onCloseMenu();
              onOpenThemeSheet();
            }}
            className="w-full px-3 py-2.5 rounded-xl flex items-center gap-2.5 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer"
          >
            <Palette className="w-4 h-4 text-[var(--mos-accent)] shrink-0" />
            <span className="flex-1">Hồ sơ & Giao diện</span>
          </button>
        )}

        {/* Chuông khi khóa máy */}
        {onOpenPushSettings && (
          <button
            type="button"
            data-testid="mos-chat-menu-push-item"
            aria-label="Chuông báo cuộc gọi khi khóa máy"
            onClick={() => {
              onCloseMenu();
              onOpenPushSettings();
            }}
            className="w-full px-3 py-2.5 rounded-xl flex items-center gap-2.5 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer"
          >
            {isPushSubscribed ? (
              <BellRing className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <Bell className="w-4 h-4 text-amber-500 shrink-0" />
            )}
            <span className="flex-1">Chuông khi khóa máy</span>
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
      </div>
    </>
  );
};
