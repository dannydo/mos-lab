'use client';

import React from 'react';
import type {
  BugReportCommentCreateResult,
  BugReportNotification,
  CreateBugReportCommentRequest,
  MyBugReportItem,
  ReviewBugReportRequest,
} from '@mos-lab/shared';
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
  const [actionRequiredCount, setActionRequiredCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const requestVersionRef = React.useRef(0);

  const refresh = React.useCallback(
    async (options?: { force?: boolean }): Promise<void> => {
      if (!enabled) return;
      const requestVersion = ++requestVersionRef.current;
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.bugReports.mine(options);
        if (requestVersion !== requestVersionRef.current) return;
        setData(response.data);
        setNotifications(response.notifications);
        setUnreadCount(response.unreadCount);
        setActionRequiredCount(response.actionRequiredCount);
      } catch (caught) {
        if (requestVersion !== requestVersionRef.current) return;
        setError(errorMessage(caught));
      } finally {
        if (requestVersion === requestVersionRef.current) setLoading(false);
      }
    },
    [enabled]
  );

  React.useEffect(() => {
    if (!enabled) return;
    void refresh();
    const interval = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      void refresh();
    }, 60_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, refresh]);

  const review = React.useCallback(
    async (id: number, request: ReviewBugReportRequest) => {
      // Optimistic instant UI update to prevent duplicate clicks and ensure immediate feedback
      setData((current) =>
        current.map((item) => {
          if (item.id !== id) return item;
          if (request.decision === 'APPROVE') {
            return {
              ...item,
              status: 'CLOSED',
              canReview: false,
              canReopenUnchanged: false,
              reporterExperience: {
                ...item.reporterExperience,
                state: 'COMPLETED',
                summary: 'Bạn đã xác nhận bản sửa hoạt động đúng.',
              },
            };
          } else {
            return {
              ...item,
              status: 'NEW',
              canReview: false,
              canReopenUnchanged: false,
              reporterExperience: {
                ...item.reporterExperience,
                state: 'IN_PROGRESS',
                summary: 'Đã nhận phản hồi của bạn; mOS đang kiểm tra và sửa lại.',
              },
            };
          }
        })
      );
      if (request.decision === 'APPROVE') {
        setActionRequiredCount((prev) => Math.max(0, prev - 1));
      }

      try {
        const response = await apiClient.bugReports.review(id, request);
        if (!response.data) throw new Error('Máy chủ không trả ticket sau khi duyệt.');
        await refresh({ force: true });
        return response.data;
      } catch (error) {
        // Rollback state by re-fetching
        await refresh({ force: true });
        throw error;
      }
    },
    [refresh]
  );

  const comment = React.useCallback(
    async (id: number, request: CreateBugReportCommentRequest): Promise<BugReportCommentCreateResult> => {
      const response = await apiClient.bugReports.comment(id, request);
      if (!response.data) throw new Error('Máy chủ không trả về hội thoại sau khi bình luận.');
      await refresh({ force: true });
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

  return {
    data,
    notifications,
    unreadCount,
    actionRequiredCount,
    loading,
    error,
    refresh,
    review,
    comment,
    markNotificationsRead,
  };
}
