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

export function useMyBugReports(enabled: boolean, isSurfaceOpen = true) {
  const [data, setData] = React.useState<MyBugReportItem[]>([]);
  const [notifications, setNotifications] = React.useState<BugReportNotification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [actionRequiredCount, setActionRequiredCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const requestVersionRef = React.useRef(0);
  const inFlightReviewsRef = React.useRef(new Set<number>());

  const addOptimisticReport = React.useCallback((item: MyBugReportItem) => {
    setData((current) => [item, ...current.filter((r) => r.id !== item.id && r.key !== item.key)]);
  }, []);

  const refreshBadge = React.useCallback(async (): Promise<void> => {
    if (!enabled) return;
    try {
      const badge = await apiClient.bugReports.badgeSummary({ isPolling: true });
      setNotifications((current) => {
        if (badge.unreadNotifications.length > 0) return badge.unreadNotifications;
        return current.filter((item) => Boolean(item.readAt));
      });
      setUnreadCount(Math.max(0, Number(badge.unreadCount) || 0));
      setActionRequiredCount(Math.max(0, Number(badge.actionRequiredCount) || 0));
    } catch {
      // Keep existing badge state on transient background poll error
    }
  }, [enabled]);

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
    let initialTimer: number | undefined;
    if (isSurfaceOpen) {
      void refresh({ force: true });
    } else {
      initialTimer = window.setTimeout(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        void refreshBadge();
      }, 1_400);
    }
    const interval = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      if (isSurfaceOpen) void refresh();
      else void refreshBadge();
    }, 60_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (isSurfaceOpen) void refresh();
        else void refreshBadge();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (initialTimer !== undefined) window.clearTimeout(initialTimer);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, isSurfaceOpen, refresh, refreshBadge]);

  const review = React.useCallback(
    async (id: number, request: ReviewBugReportRequest) => {
      if (inFlightReviewsRef.current.has(id)) return;
      inFlightReviewsRef.current.add(id);

      const nowIso = new Date().toISOString();
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
                label: 'Đã hoàn tất',
                summary: 'Bạn đã xác nhận bản sửa hoạt động đúng.',
                nextAction: {
                  label: 'Bạn đã xác nhận hoàn tất',
                  detail: 'Cảm ơn bạn đã kiểm tra kết quả.',
                },
                updates: [
                  ...item.reporterExperience.updates,
                  { label: 'Bạn đã xác nhận hoàn tất', occurredAt: nowIso },
                ],
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
                label: 'Đang xử lý',
                summary: 'Đã nhận phản hồi của bạn; mOS đang kiểm tra và sửa lại.',
                nextAction: {
                  label: 'mOS đang sửa lại',
                  detail: 'Agent đang tiếp nhận phản hồi để điều chỉnh bản sửa.',
                },
                updates: [
                  ...item.reporterExperience.updates,
                  { label: 'Đã gửi yêu cầu sửa lại cho Agent', occurredAt: nowIso },
                ],
              },
            };
          }
        })
      );
      setActionRequiredCount((prev) => Math.max(0, prev - 1));

      try {
        const response = await apiClient.bugReports.review(id, request);
        if (!response.data) throw new Error('Máy chủ không trả ticket sau khi duyệt.');
        await refresh({ force: true });
        return response.data;
      } catch (error) {
        // Rollback state by re-fetching
        await refresh({ force: true });
        throw error;
      } finally {
        inFlightReviewsRef.current.delete(id);
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
      if (!unreadCount && !notificationIds?.length) return;
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

  const cancel = React.useCallback(
    async (id: number, reason?: string) => {
      const nowIso = new Date().toISOString();
      setData((current) =>
        current.map((item) => {
          if (item.id !== id) return item;
          return {
            ...item,
            status: 'CANCELLED',
            canReview: false,
            canReopenUnchanged: false,
            canCancel: false,
            reporterExperience: {
              ...item.reporterExperience,
              state: 'NOT_PROCEEDING',
              label: 'Đã huỷ',
              summary: reason ? `Bạn đã huỷ yêu cầu: ${reason}` : 'Bạn đã huỷ yêu cầu này.',
              nextAction: {
                label: 'Yêu cầu đã huỷ',
                detail: 'Bạn có thể gửi một yêu cầu mới khi cần.',
              },
              updates: [...item.reporterExperience.updates, { label: 'Đã huỷ yêu cầu', occurredAt: nowIso }],
            },
          };
        })
      );
      try {
        await apiClient.bugReports.cancel(id, { reason });
        await refresh({ force: true });
      } catch (error) {
        await refresh({ force: true });
        throw error;
      }
    },
    [refresh]
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
    cancel,
    comment,
    markNotificationsRead,
    addOptimisticReport,
  };
}
