'use client';

import React from 'react';
import { CheckCheck, CheckCircle2, Loader2 } from 'lucide-react';
import type { MosNotificationItem } from '@mos-lab/shared';
import type { StatusFilter } from './notificationTypes';
import { NotificationRowItem } from './NotificationRowItem';

export interface NotificationFeedListProps {
  isMobileView?: boolean;
  isDark: boolean;
  loading: boolean;
  hasFeed: boolean;
  statusFilter: StatusFilter;
  categoryFilteredCount: number;
  unreadItems: MosNotificationItem[];
  readItems: MosNotificationItem[];
  markingAll: boolean;
  onMarkAllRead: () => void;
  onItemClick: (item: MosNotificationItem) => void;
  onToggleRead: (item: MosNotificationItem, e: React.MouseEvent) => void;
}

export const NotificationFeedList: React.FC<NotificationFeedListProps> = ({
  isMobileView = false,
  isDark,
  loading,
  hasFeed,
  statusFilter,
  categoryFilteredCount,
  unreadItems,
  readItems,
  markingAll,
  onMarkAllRead,
  onItemClick,
  onToggleRead,
}) => {
  return (
    <div
      className={`overflow-y-auto px-2 py-2 flex-1 mos-thin-scrollbar ${
        isMobileView ? 'min-h-[280px]' : 'max-h-[420px] min-h-[260px]'
      }`}
    >
      {loading && !hasFeed ? (
        <div className="py-16 flex flex-col items-center justify-center gap-2">
          <Loader2 size={18} className="animate-spin text-amber-500" aria-hidden="true" />
          <span className="text-xs text-neutral-400">Đang tải thông báo...</span>
        </div>
      ) : categoryFilteredCount === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <CheckCircle2 size={36} className="text-emerald-500/70 mb-2" />
          <div className={`text-sm font-semibold ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>
            Không có thông báo nào
          </div>
          <div className="text-xs text-neutral-400 mt-1 max-w-[240px]">
            Tất cả thông báo và công việc đã được xử lý hoàn tất.
          </div>
        </div>
      ) : (
        <>
          {(statusFilter === 'all' || statusFilter === 'unread') && (
            <div className="mb-3">
              {statusFilter === 'all' && unreadItems.length > 0 && (
                <div className="flex items-center justify-between px-2 pt-1 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Mới</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 tabular-nums">
                      {unreadItems.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    disabled={markingAll}
                    className="text-[11px] font-semibold text-neutral-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors flex items-center gap-1"
                  >
                    <CheckCheck size={13} />
                    <span>Đã xem tất cả</span>
                  </button>
                </div>
              )}

              {unreadItems.length > 0 ? (
                unreadItems.map((item) => (
                  <NotificationRowItem
                    key={item.id}
                    item={item}
                    isDark={isDark}
                    onItemClick={onItemClick}
                    onToggleRead={onToggleRead}
                  />
                ))
              ) : statusFilter === 'unread' ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <CheckCircle2 size={32} className="text-emerald-500/70 mb-2" />
                  <div className="text-xs font-medium text-neutral-400">Bạn đã đọc tất cả thông báo mới 🎉</div>
                </div>
              ) : null}
            </div>
          )}

          {(statusFilter === 'all' || statusFilter === 'read') && (
            <div>
              {statusFilter === 'all' && readItems.length > 0 && (
                <div
                  className={`flex items-center justify-between px-2 pt-2.5 pb-1.5 ${
                    unreadItems.length > 0
                      ? isDark
                        ? 'border-t border-neutral-800/80 mt-1'
                        : 'border-t border-neutral-200 mt-1'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                      Trước đó
                    </span>
                    <span className="text-[10px] text-neutral-400 tabular-nums">({readItems.length})</span>
                  </div>
                </div>
              )}

              {readItems.length > 0 ? (
                readItems.map((item) => (
                  <NotificationRowItem
                    key={item.id}
                    item={item}
                    isDark={isDark}
                    onItemClick={onItemClick}
                    onToggleRead={onToggleRead}
                  />
                ))
              ) : statusFilter === 'read' ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="text-xs text-neutral-400">Chưa có thông báo đã đọc</div>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
};
