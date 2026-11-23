'use client';

import React from 'react';
import type { StatusFilter } from './notificationTypes';

export interface NotificationStatusSegmentedFilterProps {
  statusFilter: StatusFilter;
  onChange: (nextFilter: StatusFilter) => void;
  totalUnreadCount: number;
  totalReadCount: number;
  isDark: boolean;
  variant?: 'compact' | 'fullWidth';
}

export const NotificationStatusSegmentedFilter: React.FC<NotificationStatusSegmentedFilterProps> = ({
  statusFilter,
  onChange,
  totalUnreadCount,
  totalReadCount,
  isDark,
  variant = 'compact',
}) => {
  const isFullWidth = variant === 'fullWidth';
  const baseButtonClasses = isFullWidth
    ? 'flex-1 py-1.5 rounded-lg font-medium transition-all'
    : 'px-2.5 py-1 rounded-lg font-medium transition-all';

  const inactiveClass = isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-600 hover:text-neutral-900';

  const neutralActiveClass = isDark ? 'bg-neutral-700 text-white shadow-sm' : 'bg-white text-neutral-900 shadow-sm';

  const unreadActiveClass = isDark ? 'bg-neutral-700 text-amber-400 shadow-sm' : 'bg-white text-amber-600 shadow-sm';

  return (
    <div
      className={`${
        isFullWidth ? 'flex items-center p-1 w-full' : 'inline-flex items-center p-0.5'
      } rounded-xl border text-xs ${
        isDark ? 'bg-neutral-800/80 border-neutral-700/60' : 'bg-neutral-200/60 border-neutral-300/60'
      }`}
    >
      <button
        type="button"
        onClick={() => onChange('all')}
        className={`${baseButtonClasses} ${isFullWidth ? 'text-center' : ''} ${
          statusFilter === 'all' ? neutralActiveClass : inactiveClass
        }`}
      >
        {isFullWidth ? <span>Tất cả</span> : 'Tất cả'}
      </button>
      <button
        type="button"
        onClick={() => onChange('unread')}
        className={`${baseButtonClasses} flex items-center ${isFullWidth ? 'justify-center' : ''} gap-1 ${
          statusFilter === 'unread' ? unreadActiveClass : inactiveClass
        }`}
      >
        <span>Chưa đọc</span>
        {totalUnreadCount > 0 && <span className="text-[10px] tabular-nums font-bold">({totalUnreadCount})</span>}
      </button>
      <button
        type="button"
        onClick={() => onChange('read')}
        className={`${baseButtonClasses} flex items-center ${isFullWidth ? 'justify-center' : ''} gap-1 ${
          statusFilter === 'read' ? neutralActiveClass : inactiveClass
        }`}
      >
        <span>Đã đọc</span>
        {totalReadCount > 0 && <span className="text-[10px] tabular-nums">({totalReadCount})</span>}
      </button>
    </div>
  );
};
