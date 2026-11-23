import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MosNotificationFeedResponse, MosNotificationItem } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { tabNotificationManager } from '../../../lib/tab-notification';
import {
  cleanNotificationTitle,
  computeCategoryTabCounts,
  computeFeedCounts,
  filterNotificationsByCategory,
  navigateForNotificationAction,
} from './notificationHelpers';
import type { CategoryTab, HeaderNotificationCenterProps, StatusFilter } from './notificationTypes';
import { showUrgentApprovalToast } from './urgentNotificationToast';

export function useHeaderNotifications({ onOpenChat, themeMode = 'dark' }: HeaderNotificationCenterProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CategoryTab>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [feed, setFeed] = useState<MosNotificationFeedResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const seenUrgentIdsRef = useRef<Set<string>>(new Set());
  const isInitialMountRef = useRef<boolean>(true);
  const onOpenChatRef = useRef(onOpenChat);
  onOpenChatRef.current = onOpenChat;

  const handleItemClick = useCallback(
    async (item: MosNotificationItem) => {
      if (!item.readAt) {
        setFeed((prev) => {
          if (!prev) return prev;
          const updated = prev.items.map((i) => (i.id === item.id ? { ...i, readAt: new Date().toISOString() } : i));
          const counts = computeFeedCounts(updated);
          return { ...prev, items: updated, ...counts };
        });
        apiClient.notifications.markAsRead(item.id).catch(() => {});
      }

      setIsOpen(false);
      navigateForNotificationAction(item, {
        push: (url) => router.push(url),
        onOpenChat: onOpenChatRef.current,
      });
    },
    [router]
  );

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
          (data.items || []).forEach((item: MosNotificationItem) => {
            seenUrgentIdsRef.current.add(item.id);
          });
        } else {
          const urgentLiveItems = (data.items || []).filter(
            (item: MosNotificationItem) =>
              !item.readAt && item.priority === 'urgent' && item.category === 'inbox_approval'
          );

          for (const item of urgentLiveItems) {
            if (!seenUrgentIdsRef.current.has(item.id)) {
              seenUrgentIdsRef.current.add(item.id);
              tabNotificationManager.triggerAlert({
                senderName: 'mOS Mission',
                snippet: cleanNotificationTitle(item.title),
              });
              showUrgentApprovalToast(item, themeMode === 'dark', handleItemClick);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch notifications feed:', err);
      } finally {
        if (!isSilent) setLoading(false);
      }
    },
    [handleItemClick, themeMode]
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

  const handleMarkAllRead = useCallback(async () => {
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
  }, []);

  const handleToggleRead = useCallback(async (item: MosNotificationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const isCurrentlyRead = Boolean(item.readAt);
    const nowIso = new Date().toISOString();

    setFeed((prev) => {
      if (!prev) return prev;
      const updated = prev.items.map((i) => (i.id === item.id ? { ...i, readAt: isCurrentlyRead ? null : nowIso } : i));
      const counts = computeFeedCounts(updated);
      return { ...prev, items: updated, ...counts };
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
  }, []);

  const navigateToMission = useCallback(() => {
    setIsOpen(false);
    router.push('/dashboard/bug-reports');
  }, [router]);

  const categoryFiltered = useMemo(
    () => filterNotificationsByCategory(feed?.items || [], activeTab),
    [feed?.items, activeTab]
  );

  const unreadItems = useMemo(() => categoryFiltered.filter((item) => !item.readAt), [categoryFiltered]);
  const readItems = useMemo(() => categoryFiltered.filter((item) => Boolean(item.readAt)), [categoryFiltered]);
  const tabCounts = useMemo(() => computeCategoryTabCounts(feed?.items || []), [feed?.items]);

  const totalUnreadCount = feed?.unreadCount || 0;
  const totalReadCount = useMemo(() => (feed?.items || []).filter((i) => Boolean(i.readAt)).length, [feed?.items]);
  const urgentCount = feed?.urgentCount || 0;

  return {
    isOpen,
    setIsOpen,
    activeTab,
    setActiveTab,
    statusFilter,
    setStatusFilter,
    feed,
    loading,
    markingAll,
    fetchFeed,
    handleMarkAllRead,
    handleToggleRead,
    handleItemClick,
    navigateToMission,
    categoryFiltered,
    unreadItems,
    readItems,
    tabCounts,
    totalUnreadCount,
    totalReadCount,
    urgentCount,
  };
}
