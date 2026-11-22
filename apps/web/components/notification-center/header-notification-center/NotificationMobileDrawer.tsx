'use client';

import React from 'react';
import { ArrowUpRight, CheckCheck } from 'lucide-react';
import type { MosNotificationItem } from '@mos-lab/shared';
import { AdaptiveDrawer } from '~/components/ui';
import type { CategoryTab, CategoryTabCounts, StatusFilter } from './notificationTypes';
import { NotificationCategoryChips } from './NotificationCategoryChips';
import { NotificationFeedList } from './NotificationFeedList';
import { NotificationStatusSegmentedFilter } from './NotificationStatusSegmentedFilter';

export interface NotificationMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  statusFilter: StatusFilter;
  onStatusFilterChange: (nextFilter: StatusFilter) => void;
  activeTab: CategoryTab;
  onActiveTabChange: (nextTab: CategoryTab) => void;
  totalItemsCount: number;
  totalUnreadCount: number;
  totalReadCount: number;
  tabCounts: CategoryTabCounts;
  unreadItems: MosNotificationItem[];
  readItems: MosNotificationItem[];
  categoryFilteredCount: number;
  loading: boolean;
  hasFeed: boolean;
  markingAll: boolean;
  onMarkAllRead: () => void;
  onItemClick: (item: MosNotificationItem) => void;
  onToggleRead: (item: MosNotificationItem, e: React.MouseEvent) => void;
  onNavigateMission: () => void;
}

export const NotificationMobileDrawer: React.FC<NotificationMobileDrawerProps> = ({
  isOpen,
  onClose,
  isDark,
  statusFilter,
  onStatusFilterChange,
  activeTab,
  onActiveTabChange,
  totalItemsCount,
  totalUnreadCount,
  totalReadCount,
  tabCounts,
  unreadItems,
  readItems,
  categoryFilteredCount,
  loading,
  hasFeed,
  markingAll,
  onMarkAllRead,
  onItemClick,
  onToggleRead,
  onNavigateMission,
}) => {
  return (
    <AdaptiveDrawer
      open={isOpen}
      onClose={onClose}
      placement="bottom"
      height="88dvh"
      title={
        <div className="flex items-center gap-2">
          <span className="font-bold text-base tracking-tight">Thông báo</span>
          {totalUnreadCount > 0 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums bg-amber-500/15 text-amber-500 border border-amber-500/30">
              {totalUnreadCount} mới
            </span>
          )}
        </div>
      }
      extra={
        unreadItems.length > 0 ? (
          <button
            type="button"
            onClick={onMarkAllRead}
            disabled={markingAll}
            className="text-xs font-semibold text-neutral-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors flex items-center gap-1 mr-2"
          >
            <CheckCheck size={14} />
            <span>Đã xem tất cả</span>
          </button>
        ) : null
      }
      closable={{ placement: 'end' }}
      classNames={{
        header: isDark
          ? 'px-4 py-3 bg-neutral-900 border-b border-neutral-800'
          : 'px-4 py-3 bg-white border-b border-neutral-100',
        body: 'p-0 flex flex-col overflow-hidden',
        content: isDark
          ? 'rounded-t-[20px] overflow-hidden bg-neutral-900'
          : 'rounded-t-[20px] overflow-hidden bg-white',
        mask: 'backdrop-blur-[4px]',
      }}
      className={`mos-notification-mobile-drawer ${isDark ? 'dark-theme' : 'light-theme'}`}
    >
      <div
        className={`flex flex-col h-full overflow-hidden ${
          isDark ? 'bg-neutral-900 text-neutral-100' : 'bg-white text-neutral-900'
        }`}
      >
        {/* Mobile Full-width Segmented Filter Pill */}
        <div className="px-3 pt-3 pb-2 shrink-0">
          <NotificationStatusSegmentedFilter
            statusFilter={statusFilter}
            onChange={onStatusFilterChange}
            totalUnreadCount={totalUnreadCount}
            totalReadCount={totalReadCount}
            isDark={isDark}
            variant="fullWidth"
          />
        </div>

        {/* Category Filter Chips */}
        <NotificationCategoryChips
          activeTab={activeTab}
          onChange={onActiveTabChange}
          counts={tabCounts}
          isDark={isDark}
        />

        {/* Notification feed items */}
        <NotificationFeedList
          isMobileView={true}
          isDark={isDark}
          loading={loading}
          hasFeed={hasFeed}
          statusFilter={statusFilter}
          categoryFilteredCount={categoryFilteredCount}
          unreadItems={unreadItems}
          readItems={readItems}
          markingAll={markingAll}
          onMarkAllRead={onMarkAllRead}
          onItemClick={onItemClick}
          onToggleRead={onToggleRead}
        />

        {/* Mobile Footer */}
        <div
          className={`px-4 py-3 pb-[max(16px,env(safe-area-inset-bottom,0px))] border-t text-xs flex items-center justify-between shrink-0 ${
            isDark ? 'border-neutral-800 bg-neutral-900/60' : 'border-neutral-200 bg-neutral-50/90'
          }`}
        >
          <span className="text-[11px] text-neutral-400 tabular-nums">{totalItemsCount} thông báo</span>

          <button
            type="button"
            onClick={onNavigateMission}
            className="hover:text-amber-500 dark:hover:text-amber-400 text-amber-600 dark:text-amber-400 font-semibold transition-colors flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
          >
            <span>Mở mOS Mission</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </AdaptiveDrawer>
  );
};
