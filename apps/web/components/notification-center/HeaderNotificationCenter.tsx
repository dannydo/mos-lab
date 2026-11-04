'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Popover, Button, Tag, Spin, Tooltip, notification, theme } from 'antd';
import {
  Bell,
  CheckCheck,
  Check,
  CircleDot,
  GitPullRequest,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Sparkles,
  AtSign,
  Filter,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { MosNotificationFeedResponse, MosNotificationItem, NotificationCategory } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { HeaderActionIndicator } from '../ui/HeaderActionIndicator';
import { HeaderIconButton } from '../ui/HeaderIconButton';
import { tabNotificationManager } from '../../lib/tab-notification';

export interface HeaderNotificationCenterProps {
  onOpenChat?: (conversationId?: string, messageId?: string, payload?: Record<string, unknown>) => void;
  themeMode?: 'light' | 'dark';
}

type CategoryTab = 'all' | 'inbox' | 'mention' | 'task';
type StatusFilter = 'all' | 'unread' | 'read';

function formatRelativeTimeVi(dateIso: string): string {
  if (!dateIso) return '';
  const now = Date.now();
  const diffMs = now - new Date(dateIso).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateIso));
}

function cleanSummaryText(summary: string): string {
  if (!summary) return '';
  return summary.replace(/Hạn nhắc:\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/g, (_match, isoStr) => {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return summary;
      return `Hạn nhắc: ${new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      }).format(d)}`;
    } catch {
      return summary;
    }
  });
}

function cleanNotificationTitle(title: string): string {
  if (!title) return '';
  return title.replace(/-{2,}/g, ' - ').replace(/-/g, ' ');
}

export const HeaderNotificationCenter: React.FC<HeaderNotificationCenterProps> = ({
  onOpenChat,
  themeMode = 'dark',
}) => {
  const router = useRouter();
  const { token } = theme.useToken();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CategoryTab>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [feed, setFeed] = useState<MosNotificationFeedResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  // Track seen IDs to alert only on newly arrived urgent approval items
  const seenUrgentIdsRef = useRef<Set<string>>(new Set());
  const isInitialMountRef = useRef<boolean>(true);

  const fetchFeed = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      try {
        const data = await apiClient.notifications.getFeed();
        setFeed((prev) => {
          try {
            return prev && JSON.stringify(prev) === JSON.stringify(data) ? prev : data;
          } catch {
            return data;
          }
        });

        if (isInitialMountRef.current) {
          isInitialMountRef.current = false;
          // Seed all existing item IDs on initial load so we NEVER spam toasts on page load
          (data.items || []).forEach((item: MosNotificationItem) => {
            seenUrgentIdsRef.current.add(item.id);
          });
        } else {
          // LIVE toast alert: ONLY for critical actionable approvals (e.g. Danny approving commit/deploy)
          const urgentLiveItems = (data.items || []).filter(
            (item: MosNotificationItem) =>
              !item.readAt && item.priority === 'urgent' && item.category === 'inbox_approval'
          );

          for (const item of urgentLiveItems) {
            if (!seenUrgentIdsRef.current.has(item.id)) {
              seenUrgentIdsRef.current.add(item.id);
              tabNotificationManager.triggerAlert({
                senderName: 'mOS Inbox',
                snippet: cleanNotificationTitle(item.title),
              });
              const isDark = themeMode === 'dark';
              notification.open({
                className: isDark ? 'mos-dark-toast' : 'mos-light-toast',
                style: {
                  backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                  border: isDark ? '1px solid #333333' : '1px solid #e5e7eb',
                  borderRadius: '12px',
                  color: isDark ? '#f3f4f6' : '#111827',
                  boxShadow: isDark ? '0 20px 25px -5px rgba(0, 0, 0, 0.6)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                },
                message: (
                  <span className="font-semibold text-amber-500 flex items-center gap-1.5 text-sm">
                    <Sparkles size={16} /> {cleanNotificationTitle(item.title)}
                  </span>
                ),
                description: (
                  <div className={`text-xs mt-1 line-clamp-2 ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
                    {cleanSummaryText(item.summary)}
                  </div>
                ),
                placement: 'topRight',
                duration: 6,
                onClick: () => {
                  notification.destroy();
                  handleItemClick(item);
                },
                btn: (
                  <Button
                    type="primary"
                    size="small"
                    className="bg-amber-600 hover:bg-amber-500 border-none text-xs rounded-md text-white font-medium"
                    onClick={() => {
                      notification.destroy();
                      handleItemClick(item);
                    }}
                  >
                    Mở việc ngay
                  </Button>
                ),
              });
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch notifications feed:', err);
      } finally {
        if (!isSilent) setLoading(false);
      }
    },
    [themeMode]
  );

  useEffect(() => {
    fetchFeed(false);
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      fetchFeed(true);
    }, 20_000);
    const handleRefresh = () => {
      void fetchFeed(true);
    };
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void fetchFeed(true);
      }
    };
    window.addEventListener('mos-notifications:refresh', handleRefresh);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      window.removeEventListener('mos-notifications:refresh', handleRefresh);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchFeed]);

  useEffect(() => {
    tabNotificationManager.setUnreadCount('inbox', feed?.unreadCount || 0);
  }, [feed?.unreadCount]);

  // Global hotkey: Command+I or Ctrl+I toggles notifications
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await apiClient.notifications.markAllAsRead();
      setFeed((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((i) => ({ ...i, readAt: i.readAt || new Date().toISOString() })),
              unreadCount: 0,
              urgentCount: 0,
            }
          : null
      );
    } catch (err) {
      console.error('Failed to mark all read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleToggleRead = async (item: MosNotificationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const isCurrentlyRead = Boolean(item.readAt);
    const nowIso = new Date().toISOString();

    setFeed((prev) => {
      if (!prev) return prev;
      const updated = prev.items.map((i) =>
        i.id === item.id ? { ...i, readAt: isCurrentlyRead ? null : nowIso } : i
      );
      const unreadCount = updated.filter((i) => !i.readAt).length;
      const urgentCount = updated.filter((i) => !i.readAt && (i.priority === 'urgent' || i.priority === 'high')).length;
      return { ...prev, items: updated, unreadCount, urgentCount };
    });

    try {
      if (isCurrentlyRead) {
        await apiClient.notifications.markAsUnread(item.id);
      } else {
        await apiClient.notifications.markAsRead(item.id);
      }
    } catch (err) {
      console.warn('Failed to toggle notification read state:', err);
    }
  };

  const handleItemClick = async (item: MosNotificationItem) => {
    // Optimistic read status update if unread
    if (!item.readAt) {
      setFeed((prev) => {
        if (!prev) return prev;
        const updated = prev.items.map((i) => (i.id === item.id ? { ...i, readAt: new Date().toISOString() } : i));
        const unreadCount = updated.filter((i) => !i.readAt).length;
        const urgentCount = updated.filter((i) => !i.readAt && (i.priority === 'urgent' || i.priority === 'high')).length;
        return { ...prev, items: updated, unreadCount, urgentCount };
      });
      apiClient.notifications.markAsRead(item.id).catch(() => {});
    }

    setIsOpen(false);

    // Deep-link routing based on action
    const action = item.action;
    if (action.type === 'navigate_bug_report') {
      const reportId = action.payload?.reportId;
      if (reportId) {
        window.dispatchEvent(new CustomEvent('mos:open_bug_report', { detail: action.payload }));
        router.push(`/dashboard/bug-reports?reportId=${reportId}`);
      } else {
        router.push('/dashboard/bug-reports');
      }
    } else if (action.type === 'open_chat') {
      const convId = action.payload?.conversationId as string | undefined;
      const msgId = action.payload?.messageId as string | undefined;
      if (onOpenChat) {
        onOpenChat(convId, msgId, action.payload);
      }
      window.dispatchEvent(
        new CustomEvent('mos-chat:open', {
          detail: {
            conversationId: convId,
            messageId: msgId,
            ...action.payload,
          },
        })
      );
      window.dispatchEvent(new CustomEvent('mos:open_chat', { detail: action.payload }));
    } else if (action.type === 'navigate_customer') {
      const custId = action.payload?.customerId;
      if (custId) {
        router.push(`/dashboard/customers?id=${custId}`);
      } else {
        router.push('/dashboard/customers');
      }
    } else if (action.type === 'navigate_url' && action.payload?.url) {
      router.push(action.payload.url as string);
    }
  };

  const categoryFiltered = useMemo(() => {
    return (feed?.items || []).filter((item) => {
      if (activeTab === 'inbox') return item.category === 'inbox_approval';
      if (activeTab === 'mention') return item.category === 'chat_mention';
      if (activeTab === 'task') return item.category === 'task_reminder';
      return true;
    });
  }, [feed?.items, activeTab]);

  const unreadItems = useMemo(() => {
    return categoryFiltered.filter((item) => !item.readAt);
  }, [categoryFiltered]);

  const readItems = useMemo(() => {
    return categoryFiltered.filter((item) => Boolean(item.readAt));
  }, [categoryFiltered]);

  const totalUnreadCount = feed?.unreadCount || 0;
  const totalReadCount = (feed?.items || []).filter((i) => Boolean(i.readAt)).length;
  const urgentCount = feed?.urgentCount || 0;

  const renderCategoryIcon = (category: NotificationCategory) => {
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

  const renderNotificationRow = (item: MosNotificationItem) => {
    const isUnread = !item.readAt;
    const isDark = themeMode === 'dark';

    return (
      <div
        key={item.id}
        onClick={() => handleItemClick(item)}
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
        {/* Instagram-style Avatar with story ring / status badge */}
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
            <div
              className={`rounded-full p-0.5 ${
                isUnread ? 'ring-2 ring-amber-500 bg-amber-500/10' : ''
              }`}
            >
              {renderCategoryIcon(item.category)}
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
          {/* Headline: Actor + Title + Time */}
          <div className="text-xs leading-snug">
            {item.actor?.name && (
              <span className={`font-bold mr-1 ${isDark ? 'text-neutral-100' : 'text-neutral-900'}`}>
                {item.actor.name}
              </span>
            )}
            <span className={`${isUnread ? (isDark ? 'text-neutral-200 font-semibold' : 'text-neutral-900 font-semibold') : (isDark ? 'text-neutral-400 font-normal' : 'text-neutral-600 font-normal')}`}>
              {cleanNotificationTitle(item.title)}
            </span>
            <span
              className="text-[11px] text-neutral-400 dark:text-neutral-500 shrink-0 tabular-nums ml-1.5 whitespace-nowrap"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              · {formatRelativeTimeVi(item.createdAt)}
            </span>
          </div>

          {/* Detailed summary */}
          {item.summary && (
            <p className={`text-xs line-clamp-2 mt-1 leading-relaxed ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
              {cleanSummaryText(item.summary)}
            </p>
          )}

          {/* Metadata pills */}
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
            {isUnread && (
              <span className="text-[10px] font-medium text-amber-500 dark:text-amber-400">
                Mới
              </span>
            )}
          </div>
        </div>

        {/* Right Action Column (Instagram Style) */}
        <div className="flex flex-col items-end justify-between self-stretch gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            {/* Quick toggle read / unread */}
            <Tooltip title={isUnread ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc'}>
              <button
                type="button"
                aria-label={isUnread ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc'}
                title={isUnread ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc'}
                onClick={(e) => handleToggleRead(item, e)}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  isDark
                    ? 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-700/60'
                    : 'text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/80'
                }`}
              >
                {isUnread ? <Check size={13} /> : <CircleDot size={13} />}
              </button>
            </Tooltip>

            {/* Instagram-style blue/amber unread dot */}
            {isUnread && (
              <div
                className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]"
                title="Thông báo mới"
              />
            )}
          </div>

          {/* Action button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleItemClick(item);
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

  const isDark = themeMode === 'dark';

  const popoverContent = (
    <div
      className={`w-[460px] max-w-[95vw] flex flex-col ${
        isDark ? 'text-neutral-100' : 'text-neutral-900'
      }`}
      style={{ maxHeight: '600px' }}
    >
      {/* Top Header: Instagram-style Title & Scope Switcher */}
      <div className={`px-4 py-3.5 border-b flex items-center justify-between shrink-0 ${
        isDark ? 'border-neutral-800 bg-neutral-900/60' : 'border-neutral-200/80 bg-neutral-50/60'
      }`}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-base tracking-tight">
            Thông báo
          </span>
          {totalUnreadCount > 0 && (
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums bg-amber-500/15 text-amber-500 border border-amber-500/30"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {totalUnreadCount} mới
            </span>
          )}
        </div>

        {/* Instagram-style segmented filter pill: Tất cả | Chưa đọc | Đã đọc */}
        <div className={`inline-flex items-center p-0.5 rounded-xl border text-xs ${
          isDark ? 'bg-neutral-800/80 border-neutral-700/60' : 'bg-neutral-200/60 border-neutral-300/60'
        }`}>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              statusFilter === 'all'
                ? isDark
                  ? 'bg-neutral-700 text-white shadow-sm'
                  : 'bg-white text-neutral-900 shadow-sm'
                : isDark
                  ? 'text-neutral-400 hover:text-neutral-200'
                  : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('unread')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
              statusFilter === 'unread'
                ? isDark
                  ? 'bg-neutral-700 text-amber-400 shadow-sm'
                  : 'bg-white text-amber-600 shadow-sm'
                : isDark
                  ? 'text-neutral-400 hover:text-neutral-200'
                  : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <span>Chưa đọc</span>
            {totalUnreadCount > 0 && (
              <span className="text-[10px] tabular-nums font-bold">({totalUnreadCount})</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('read')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
              statusFilter === 'read'
                ? isDark
                  ? 'bg-neutral-700 text-white shadow-sm'
                  : 'bg-white text-neutral-900 shadow-sm'
                : isDark
                  ? 'text-neutral-400 hover:text-neutral-200'
                  : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <span>Đã đọc</span>
            {totalReadCount > 0 && (
              <span className="text-[10px] tabular-nums">({totalReadCount})</span>
            )}
          </button>
        </div>
      </div>

      {/* Category Filter Chips (Instagram Story / Chip Bar) */}
      <div className={`px-3 py-2 shrink-0 border-b flex items-center gap-1 overflow-x-auto mos-thin-scrollbar ${
        isDark ? 'border-neutral-800/80 bg-neutral-900/30' : 'border-neutral-200/60 bg-white'
      }`}>
        {[
          { key: 'all', label: `Tất cả (${feed?.items.length || 0})` },
          {
            key: 'inbox',
            label: `Cần duyệt ⚡ (${feed?.items.filter((i) => i.category === 'inbox_approval').length || 0})`,
          },
          {
            key: 'mention',
            label: `Tin nhắn & @ (${feed?.items.filter((i) => i.category === 'chat_mention').length || 0})`,
          },
          {
            key: 'task',
            label: `Nhắc việc ⏰ (${feed?.items.filter((i) => i.category === 'task_reminder').length || 0})`,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as CategoryTab)}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
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

      {/* Main Notifications Scrollable List */}
      <div className="overflow-y-auto px-2 py-2 flex-1 mos-thin-scrollbar" style={{ minHeight: '260px' }}>
        {loading && !feed ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <Spin size="small" />
            <span className="text-xs text-neutral-400">Đang tải thông báo...</span>
          </div>
        ) : categoryFiltered.length === 0 ? (
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
            {/* SECTION 1: MỚI / CHƯA ĐỌC (New / Unread) */}
            {(statusFilter === 'all' || statusFilter === 'unread') && (
              <div className="mb-3">
                {statusFilter === 'all' && unreadItems.length > 0 && (
                  <div className="flex items-center justify-between px-2 pt-1 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
                        Mới
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-500">
                        {unreadItems.length}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      disabled={markingAll}
                      className="text-[11px] font-semibold text-neutral-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors flex items-center gap-1"
                    >
                      <CheckCheck size={13} />
                      <span>Đã xem tất cả</span>
                    </button>
                  </div>
                )}

                {unreadItems.length > 0 ? (
                  unreadItems.map((item) => renderNotificationRow(item))
                ) : statusFilter === 'unread' ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <CheckCircle2 size={32} className="text-emerald-500/70 mb-2" />
                    <div className="text-xs font-medium text-neutral-400">
                      Bạn đã đọc tất cả thông báo mới 🎉
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* SECTION 2: TRƯỚC ĐÓ / ĐÃ ĐỌC (Earlier / Read) */}
            {(statusFilter === 'all' || statusFilter === 'read') && (
              <div>
                {statusFilter === 'all' && readItems.length > 0 && (
                  <div className={`flex items-center justify-between px-2 pt-2.5 pb-1.5 ${
                    unreadItems.length > 0 ? (isDark ? 'border-t border-neutral-800/80 mt-1' : 'border-t border-neutral-200 mt-1') : ''
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                        Trước đó
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        ({readItems.length})
                      </span>
                    </div>
                  </div>
                )}

                {readItems.length > 0 ? (
                  readItems.map((item) => renderNotificationRow(item))
                ) : statusFilter === 'read' ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="text-xs text-neutral-400">
                      Chưa có thông báo đã đọc
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className={`px-4 py-2.5 border-t text-[11px] text-neutral-400 flex items-center justify-between shrink-0 ${
        isDark ? 'border-neutral-800 bg-neutral-900/40' : 'border-neutral-200 bg-neutral-50/80'
      }`}>
        <span className="flex items-center gap-1.5">
          <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
            isDark ? 'bg-neutral-800 border-neutral-700 text-neutral-300' : 'bg-neutral-200 border-neutral-300 text-neutral-700'
          }`}>
            ⌘I
          </kbd>
          <span>đóng / mở nhanh</span>
        </span>

        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            router.push('/dashboard/bug-reports');
          }}
          className="hover:text-amber-500 dark:hover:text-amber-400 transition-colors flex items-center gap-1 font-medium"
        >
          <span>Xem mOS Inbox</span>
          <ArrowUpRight size={12} />
        </button>
      </div>
    </div>
  );

  return (
    <Popover
      content={popoverContent}
      trigger="click"
      open={isOpen}
      onOpenChange={(v) => {
        setIsOpen(v);
        if (v) {
          void fetchFeed(true);
        }
      }}
      placement="bottomRight"
      arrow={false}
      overlayClassName="mos-notification-popover"
      overlayInnerStyle={{
        padding: 0,
        backgroundColor: isDark ? '#171717' : '#ffffff',
        border: isDark ? '1px solid #2e2e2e' : '1px solid #e5e7eb',
        borderRadius: 20,
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.45)',
      }}
    >
      <HeaderActionIndicator variant="count" count={totalUnreadCount} color={urgentCount > 0 ? '#ef4444' : '#f59e0b'}>
        <HeaderIconButton
          action="notifications"
          label={
            totalUnreadCount > 0
              ? `Thông báo & Việc cần làm (⌘I) · ${totalUnreadCount} việc cần xử lý`
              : 'Thông báo & Việc cần làm (⌘I)'
          }
          icon={Bell}
          tone={isOpen ? 'accent' : 'quiet'}
          aria-pressed={isOpen}
          showTooltip={!isOpen}
        />
      </HeaderActionIndicator>
    </Popover>
  );
};
