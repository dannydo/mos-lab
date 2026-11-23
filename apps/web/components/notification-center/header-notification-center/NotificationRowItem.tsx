'use client';

import React from 'react';
import { Tooltip } from 'antd';
import { ArrowUpRight, AtSign, Bell, Check, CircleDot, Clock, GitPullRequest } from 'lucide-react';
import type { MosNotificationItem, NotificationCategory } from '@mos-lab/shared';
import { cleanNotificationTitle, cleanSummaryText, formatRelativeTimeVi } from './notificationHelpers';

interface NotificationCategoryIconProps {
  category: NotificationCategory;
}

const NotificationCategoryIcon: React.FC<NotificationCategoryIconProps> = ({ category }) => {
  if (category === 'inbox_approval') {
    return (
      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/15 text-amber-500 shrink-0">
        <GitPullRequest size={18} />
      </div>
    );
  }
  if (category === 'chat_mention') {
    return (
      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-sky-500/15 text-sky-400 shrink-0">
        <AtSign size={18} />
      </div>
    );
  }
  if (category === 'task_reminder') {
    return (
      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-500/15 text-emerald-400 shrink-0">
        <Clock size={18} />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-neutral-500/15 text-neutral-400 shrink-0">
      <Bell size={18} />
    </div>
  );
};

export interface NotificationRowItemProps {
  item: MosNotificationItem;
  isDark: boolean;
  onItemClick: (item: MosNotificationItem) => void;
  onToggleRead: (item: MosNotificationItem, e: React.MouseEvent) => void;
}

export const NotificationRowItem: React.FC<NotificationRowItemProps> = ({
  item,
  isDark,
  onItemClick,
  onToggleRead,
}) => {
  const isUnread = !item.readAt;

  return (
    <div
      onClick={() => onItemClick(item)}
      className={`group relative px-3.5 py-3 rounded-2xl transition-all cursor-pointer flex items-start gap-3 my-1 ${
        isUnread
          ? isDark
            ? 'bg-neutral-800/60 hover:bg-neutral-800/90 border border-neutral-700/60 shadow-sm'
            : 'bg-amber-50/60 hover:bg-amber-100/60 border border-amber-200/60 shadow-sm'
          : isDark
            ? 'hover:bg-neutral-800/40 border border-transparent opacity-85 hover:opacity-100'
            : 'hover:bg-neutral-100/70 border border-transparent opacity-85 hover:opacity-100'
      }`}
    >
      {/* Avatar with story ring / category badge */}
      <div className="relative shrink-0 mt-0.5">
        {item.actor?.avatarUrl ? (
          <img
            src={item.actor.avatarUrl}
            alt={item.actor.name || ''}
            className={`w-10 h-10 rounded-full object-cover p-0.5 ${
              isUnread
                ? 'ring-2 ring-amber-500 bg-amber-500/20'
                : isDark
                  ? 'ring-1 ring-neutral-700'
                  : 'ring-1 ring-neutral-200'
            }`}
          />
        ) : (
          <div className={`rounded-full p-0.5 ${isUnread ? 'ring-2 ring-amber-500 bg-amber-500/10' : ''}`}>
            <NotificationCategoryIcon category={item.category} />
          </div>
        )}

        {/* Mini category badge at avatar corner */}
        <div
          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] border ${
            isDark ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-neutral-200'
          }`}
        >
          {item.category === 'inbox_approval' ? (
            <GitPullRequest size={10} className="text-amber-500" />
          ) : item.category === 'chat_mention' ? (
            <AtSign size={10} className="text-sky-500" />
          ) : item.category === 'task_reminder' ? (
            <Clock size={10} className="text-emerald-500" />
          ) : (
            <Bell size={10} className="text-neutral-400" />
          )}
        </div>
      </div>

      {/* Content Body */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="text-xs leading-snug">
          {item.actor?.name && (
            <span className={`font-bold mr-1 ${isDark ? 'text-neutral-100' : 'text-neutral-900'}`}>
              {item.actor.name}
            </span>
          )}
          <span
            className={
              isUnread
                ? isDark
                  ? 'text-neutral-200 font-semibold'
                  : 'text-neutral-900 font-semibold'
                : isDark
                  ? 'text-neutral-400 font-normal'
                  : 'text-neutral-600 font-normal'
            }
          >
            {cleanNotificationTitle(item.title)}
          </span>
          <span className="text-[11px] text-neutral-400 dark:text-neutral-500 shrink-0 tabular-nums ml-1.5 whitespace-nowrap">
            · {formatRelativeTimeVi(item.createdAt)}
          </span>
        </div>

        {item.summary && (
          <p
            className={`text-xs line-clamp-2 mt-1 leading-relaxed ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}
          >
            {cleanSummaryText(item.summary)}
          </p>
        )}

        <div className="flex items-center gap-1.5 mt-2">
          {item.badgeText && (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                item.priority === 'urgent'
                  ? 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/30'
                  : item.priority === 'high'
                    ? 'bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30'
                    : isDark
                      ? 'bg-neutral-800 text-neutral-300 border border-neutral-700/60'
                      : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
              }`}
            >
              {item.badgeText}
            </span>
          )}
          {isUnread && <span className="text-[10px] font-medium text-amber-500 dark:text-amber-400">Mới</span>}
        </div>
      </div>

      {/* Right Action Column */}
      <div className="flex flex-col items-end justify-between self-stretch gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <Tooltip title={isUnread ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc'}>
            <button
              type="button"
              aria-label={isUnread ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc'}
              title={isUnread ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc'}
              onClick={(e) => onToggleRead(item, e)}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                isDark
                  ? 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-700/60'
                  : 'text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/80'
              }`}
            >
              {isUnread ? <Check size={13} /> : <CircleDot size={13} />}
            </button>
          </Tooltip>

          {isUnread && (
            <div
              className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]"
              title="Thông báo mới"
            />
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onItemClick(item);
          }}
          className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
            isUnread
              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
              : isDark
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                : 'bg-neutral-200/70 hover:bg-neutral-300 text-neutral-800'
          }`}
        >
          <span>{item.category === 'inbox_approval' ? 'Duyệt' : 'Mở việc'}</span>
          <ArrowUpRight size={12} />
        </button>
      </div>
    </div>
  );
};
