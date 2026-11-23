'use client';

import React from 'react';
import type { CategoryTab, CategoryTabCounts } from './notificationTypes';

export interface NotificationCategoryChipsProps {
  activeTab: CategoryTab;
  onChange: (nextTab: CategoryTab) => void;
  counts: CategoryTabCounts;
  isDark: boolean;
}

export const NotificationCategoryChips: React.FC<NotificationCategoryChipsProps> = ({
  activeTab,
  onChange,
  counts,
  isDark,
}) => {
  const tabs: Array<{ key: CategoryTab; label: string }> = [
    { key: 'all', label: `Tất cả (${counts.all})` },
    { key: 'inbox', label: `Cần duyệt ⚡ (${counts.inbox})` },
    { key: 'mention', label: `Tin nhắn & @ (${counts.mention})` },
    { key: 'task', label: `Nhắc việc ⏰ (${counts.task})` },
  ];

  return (
    <div
      className={`px-3 py-2 shrink-0 border-b flex items-center gap-1.5 overflow-x-auto mos-thin-scrollbar ${
        isDark ? 'border-neutral-800/80 bg-neutral-900/30' : 'border-neutral-200/60 bg-white'
      }`}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`text-xs px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all tabular-nums ${
            activeTab === tab.key
              ? isDark
                ? 'bg-neutral-800 text-neutral-100 shadow-sm border border-neutral-700'
                : 'bg-neutral-900 text-white shadow-sm'
              : isDark
                ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
