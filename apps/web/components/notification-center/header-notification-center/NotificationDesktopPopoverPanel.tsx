'use client';

import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { MosNotificationItem } from '@mos-lab/shared';
import type { CategoryTab, CategoryTabCounts, StatusFilter } from './notificationTypes';
import { NotificationCategoryChips } from './NotificationCategoryChips';
import { NotificationFeedList } from './NotificationFeedList';
import { NotificationStatusSegmentedFilter } from './NotificationStatusSegmentedFilter';

export interface NotificationDesktopPopoverPanelProps {
  isDark: boolean;
  statusFilter: StatusFilter;
  onStatusFilterChange: (nextFilter: StatusFilter) => void;
  activeTab: CategoryTab;
  onActiveTabChange: (nextTab: CategoryTab) => void;
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

export const NotificationDesktopPopoverPanel: React.FC<NotificationDesktopPopoverPanelProps> = ({
  isDark,
  statusFilter,
  onStatusFilterChange,
  activeTab,
  onActiveTabChange,
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
    <div
      className={`w-[420px] max-w-[calc(100vw-24px)] max-h-[600px] flex flex-col rounded-[20px] overflow-hidden border shadow-2xl ${
        isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900'
      }`}
    >
      {/* Top Header: Title & Segmented Filter */}
      <div
        className={`px-4 py-3.5 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'border-neutral-800 bg-neutral-900/60' : 'border-neutral-200/80 bg-neutral-50/60'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold text-base tracking-tight">Thông báo</span>
          {totalUnreadCount > 0 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums bg-amber-500/15 text-amber-500 border border-amber-500/30">
              {totalUnreadCount} mới
            </span>
          )}
        </div>

        <NotificationStatusSegmentedFilter
          statusFilter={statusFilter}
          onChange={onStatusFilterChange}
          totalUnreadCount={totalUnreadCount}
          totalReadCount={totalReadCount}
          isDark={isDark}
          variant="compact"
        />
      </div>

      {/* Category Filter Chips */}
      <NotificationCategoryChips
        activeTab={activeTab}
        onChange={onActiveTabChange}
        counts={tabCounts}
        isDark={isDark}
      />

      {/* Main Notifications Scrollable List */}
      <NotificationFeedList
        isMobileView={false}
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

      {/* Desktop Footer */}
      <div
        className={`px-4 py-2.5 border-t text-[11px] text-neutral-400 flex items-center justify-between shrink-0 ${
          isDark ? 'border-neutral-800 bg-neutral-900/40' : 'border-neutral-200 bg-neutral-50/80'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <kbd
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
              isDark
                ? 'bg-neutral-800 border-neutral-700 text-neutral-300'
                : 'bg-neutral-200 border-neutral-300 text-neutral-700'
            }`}
          >
            ⌘I
          </kbd>
          <span>đóng / mở nhanh</span>
        </span>

        <button
          type="button"
          onClick={onNavigateMission}
          className="hover:text-amber-500 dark:hover:text-amber-400 transition-colors flex items-center gap-1 font-medium"
        >
          <span>Xem mOS Mission</span>
          <ArrowUpRight size={12} />
        </button>
      </div>
    </div>
  );
};
