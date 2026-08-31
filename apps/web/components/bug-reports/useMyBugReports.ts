'use client';

import React from 'react';
import type { BugReportNotification, MyBugReportItem, ReviewBugReportRequest } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return error instanceof Error ? error.message : 'Không thể tải trạng thái báo lỗi.';
}

export function useMyBugReports(enabled: boolean) {
  const [data, setData] = React.useState<MyBugReportItem[]>([]);
  const [notifications, setNotifications] = React.useState<BugReportNotification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const requestVersionRef = React.useRef(0);

  const refresh = React.useCallback(async () => {
    if (!enabled) return;
    const requestVersion = ++requestVersionRef.current;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.bugReports.mine();
      if (requestVersion !== requestVersionRef.current) return;
      setData(response.data);
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
    } catch (caught) {
      if (requestVersion !== requestVersionRef.current) return;
      setError(errorMessage(caught));
    } finally {
      if (requestVersion === requestVersionRef.current) setLoading(false);
    }
  }, [enabled]);

  React.useEffect(() => {
    if (!enabled) return;
    void refresh();
    const interval = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(interval);
  }, [enabled, refresh]);

  const review = React.useCallback(
    async (id: number, request: ReviewBugReportRequest) => {
      const response = await apiClient.bugReports.review(id, request);
      if (!response.data) throw new Error('Máy chủ không trả ticket sau khi duyệt.');
      await refresh();
      return response.data;
    },
    [refresh]
  );

  const markNotificationsRead = React.useCallback(
    async (notificationIds?: number[]) => {
      if (!unreadCount) return;
      await apiClient.bugReports.markNotificationsRead({ notificationIds });
      const marked = notificationIds?.length ? new Set(notificationIds) : null;
      const now = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => (!item.readAt && (!marked || marked.has(item.id)) ? { ...item, readAt: now } : item))
      );
      setUnreadCount((current) => (marked ? Math.max(0, current - marked.size) : 0));
    },
    [unreadCount]
  );

  return { data, notifications, unreadCount, loading, error, refresh, review, markNotificationsRead };
}
