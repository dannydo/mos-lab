'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Popover, Tabs, Button, Tag, Spin, Empty, notification, theme } from 'antd';
import {
  Bell,
  CheckCheck,
  GitPullRequest,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Clock,
  ArrowUpRight,
  Sparkles,
  AtSign,
  CalendarCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { MosNotificationFeedResponse, MosNotificationItem, NotificationCategory } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { HeaderActionIndicator } from '../ui/HeaderActionIndicator';
import { HeaderIconButton } from '../ui/HeaderIconButton';

export interface HeaderNotificationCenterProps {
  onOpenChat?: (conversationId?: string, messageId?: string) => void;
  themeMode?: 'light' | 'dark';
}

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
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateIso));
}

export const HeaderNotificationCenter: React.FC<HeaderNotificationCenterProps> = ({
  onOpenChat,
  themeMode = 'dark',
}) => {
  const router = useRouter();
  const { token } = theme.useToken();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'inbox' | 'mention' | 'task'>('all');
  const [feed, setFeed] = useState<MosNotificationFeedResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  // Track seen IDs to alert on new urgent items
  const seenUrgentIdsRef = useRef<Set<string>>(new Set());

  const fetchFeed = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await apiClient.notifications.getFeed();
      setFeed(data);

      // Check for newly arrived urgent items to display a notification toast
      const urgentUnread = (data.items || []).filter(
        (item: MosNotificationItem) => !item.readAt && (item.priority === 'urgent' || item.priority === 'high')
      );

      for (const item of urgentUnread) {
        if (!seenUrgentIdsRef.current.has(item.id)) {
          seenUrgentIdsRef.current.add(item.id);
          // Show toast alert
          notification.open({
            message: (
              <span className="font-semibold text-amber-500 flex items-center gap-1.5">
                <Sparkles size={16} /> {item.title}
              </span>
            ),
            description: <div className="text-xs text-neutral-300 mt-1 line-clamp-2">{item.summary}</div>,
            placement: 'topRight',
            duration: 6,
            btn: (
              <Button
                type="primary"
                size="small"
                className="bg-amber-600 hover:bg-amber-500 border-none text-xs rounded-md"
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
    } catch (err) {
      console.warn('Failed to fetch notifications feed:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed(false);
    const interval = setInterval(() => {
      fetchFeed(true);
    }, 15_000);
    return () => clearInterval(interval);
  }, [fetchFeed]);

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
              items: prev.items.map((i) => ({ ...i, readAt: new Date().toISOString() })),
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

  const handleItemClick = async (item: MosNotificationItem) => {
    // Optimistic read status update
    setFeed((prev) => {
      if (!prev) return prev;
      const updated = prev.items.map((i) => (i.id === item.id ? { ...i, readAt: new Date().toISOString() } : i));
      const unreadCount = updated.filter((i) => !i.readAt).length;
      const urgentCount = updated.filter((i) => !i.readAt && (i.priority === 'urgent' || i.priority === 'high')).length;
      return { ...prev, items: updated, unreadCount, urgentCount };
    });

    apiClient.notifications.markAsRead(item.id).catch(() => {});
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
        onOpenChat(convId, msgId);
      }
      window.dispatchEvent(new CustomEvent('mos-chat:open', { detail: { conversationId: convId, messageId: msgId } }));
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

  const filteredItems = (feed?.items || []).filter((item) => {
    if (activeTab === 'inbox') return item.category === 'inbox_approval';
    if (activeTab === 'mention') return item.category === 'chat_mention';
    if (activeTab === 'task') return item.category === 'task_reminder';
    return true;
  });

  const unreadCount = feed?.unreadCount || 0;
  const urgentCount = feed?.urgentCount || 0;

  const renderCategoryIcon = (category: NotificationCategory, priority: string) => {
    if (category === 'inbox_approval') {
      return (
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/15 text-amber-500 shrink-0">
          <GitPullRequest size={16} />
        </div>
      );
    }
    if (category === 'chat_mention') {
      return (
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-sky-500/15 text-sky-400 shrink-0">
          <AtSign size={16} />
        </div>
      );
    }
    if (category === 'task_reminder') {
      return (
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/15 text-emerald-400 shrink-0">
          <Clock size={16} />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-neutral-500/15 text-neutral-400 shrink-0">
        <Bell size={16} />
      </div>
    );
  };

  const popoverContent = (
    <div
      className="w-[420px] max-w-[92vw] text-slate-100 flex flex-col"
      style={{
        maxHeight: '560px',
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/60 dark:border-neutral-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-neutral-100">
            Thông báo & Việc cần làm
          </span>
          {unreadCount > 0 && (
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums bg-amber-500/15 text-amber-500 dark:bg-amber-400/20 dark:text-amber-300"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {unreadCount} việc cần làm
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            type="text"
            size="small"
            icon={<CheckCheck size={14} />}
            loading={markingAll}
            onClick={handleMarkAllRead}
            className="text-xs text-neutral-400 hover:text-emerald-400 flex items-center gap-1 h-7 px-2 rounded-lg"
          >
            Đã xem tất cả
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="px-3 pt-2 shrink-0 border-b border-slate-700/30 dark:border-neutral-800/80">
        <div className="flex items-center gap-1">
          {[
            { key: 'all', label: `Tất cả (${feed?.items.length || 0})` },
            {
              key: 'inbox',
              label: `Cần duyệt ⚡ (${feed?.items.filter((i) => i.category === 'inbox_approval').length || 0})`,
            },
            {
              key: 'mention',
              label: `Nhắc tên @ (${feed?.items.filter((i) => i.category === 'chat_mention').length || 0})`,
            },
            {
              key: 'task',
              label: `Nhắc việc ⏰ (${feed?.items.filter((i) => i.category === 'task_reminder').length || 0})`,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as 'all' | 'inbox' | 'mention' | 'task')}
              className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notification Items List */}
      <div className="overflow-y-auto px-2 py-2 divide-y divide-neutral-800/40 flex-1">
        {loading && !feed ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <Spin size="small" />
            <span className="text-xs text-neutral-400">Đang tải thông báo...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <CheckCircle2 size={32} className="text-emerald-500/60 mb-2" />
            <div className="text-sm font-medium text-neutral-300">Không có việc cần xử lý</div>
            <div className="text-xs text-neutral-400 mt-1 max-w-[240px]">
              Tất cả thông báo và công việc đã được xử lý hoàn tất.
            </div>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isUnread = !item.readAt;
            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`group relative p-2.5 rounded-xl transition-all cursor-pointer flex gap-3 my-0.5 ${
                  isUnread
                    ? 'bg-neutral-800/40 hover:bg-neutral-800/90 border border-neutral-700/50 shadow-sm'
                    : 'hover:bg-neutral-800/40 border border-transparent opacity-80 hover:opacity-100'
                }`}
              >
                {/* Visual Icon / Avatar */}
                {item.actor?.avatarUrl ? (
                  <img
                    src={item.actor.avatarUrl}
                    alt={item.actor.name || ''}
                    className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5 border border-neutral-700"
                  />
                ) : (
                  renderCategoryIcon(item.category, item.priority)
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`text-xs font-semibold truncate ${isUnread ? 'text-neutral-100' : 'text-neutral-300'}`}
                    >
                      {item.title}
                    </span>
                    <span
                      className="text-[11px] text-neutral-400 shrink-0 tabular-nums"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {formatRelativeTimeVi(item.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed mb-1.5 break-words">
                    {item.summary}
                  </p>

                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1.5">
                      {item.badgeText && (
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            item.priority === 'urgent'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : item.priority === 'high'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-neutral-700/60 text-neutral-300'
                          }`}
                        >
                          {item.badgeText}
                        </span>
                      )}
                      {item.actor?.name && (
                        <span className="text-[11px] text-neutral-400 truncate max-w-[120px]">
                          bởi {item.actor.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Mở việc</span>
                      <ArrowUpRight size={13} />
                    </div>
                  </div>
                </div>

                {/* Unread indicator dot */}
                {isUnread && (
                  <div className="w-2 h-2 rounded-full bg-amber-400 absolute top-3 right-3 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-700/60 dark:border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between shrink-0 bg-neutral-900/30">
        <span>Nhấn ⌘I để đóng/mở nhanh</span>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            router.push('/dashboard/bug-reports');
          }}
          className="text-neutral-300 hover:text-amber-400 transition-colors flex items-center gap-1"
        >
          <span>Xem tất cả ticket</span>
          <ArrowUpRight size={12} />
        </button>
      </div>
    </div>
  );

  const indicatorVariant = unreadCount > 0 ? 'count' : 'status';

  return (
    <Popover
      content={popoverContent}
      trigger="click"
      open={isOpen}
      onOpenChange={(v) => setIsOpen(v)}
      placement="bottomRight"
      arrow={false}
      overlayClassName="mos-notification-popover"
      overlayInnerStyle={{
        padding: 0,
        backgroundColor: themeMode === 'dark' ? '#171717' : '#ffffff',
        border: themeMode === 'dark' ? '1px solid #2e2e2e' : '1px solid #e5e7eb',
        borderRadius: 16,
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.45)',
      }}
    >
      <HeaderActionIndicator variant="count" count={unreadCount} color={urgentCount > 0 ? '#ef4444' : '#f59e0b'}>
        <HeaderIconButton
          action="notifications"
          label={
            unreadCount > 0
              ? `Thông báo & Việc cần làm (⌘I) · ${unreadCount} việc cần xử lý`
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
