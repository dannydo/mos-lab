import type { MosNotificationFeedResponse, MarkNotificationReadRequest } from '@mos-lab/shared';
import { api, dedupeApiGet, invalidateApiGetCache, ApiRequestOptions } from './base';

export const notificationsApi = {
  notifications: {
    getFeed: async (options?: ApiRequestOptions): Promise<MosNotificationFeedResponse> => {
      return dedupeApiGet<MosNotificationFeedResponse>('/notifications', undefined, 5_000, options);
    },
    markAsRead: async (
      notificationId: string,
      options?: ApiRequestOptions
    ): Promise<{ success: boolean; message: string }> => {
      const res = await api.post<{ success: boolean; message: string }>(
        '/notifications/read',
        { notificationId } satisfies MarkNotificationReadRequest,
        options
      );
      invalidateApiGetCache(['/notifications']);
      return res.data;
    },
    markAllAsRead: async (options?: ApiRequestOptions): Promise<{ success: boolean; message: string }> => {
      const res = await api.post<{ success: boolean; message: string }>(
        '/notifications/read',
        { all: true } satisfies MarkNotificationReadRequest,
        options
      );
      invalidateApiGetCache(['/notifications']);
      return res.data;
    },
    markAsUnread: async (
      notificationId: string,
      options?: ApiRequestOptions
    ): Promise<{ success: boolean; message: string }> => {
      const res = await api.post<{ success: boolean; message: string }>(
        '/notifications/read',
        { notificationId, unread: true } satisfies MarkNotificationReadRequest,
        options
      );
      invalidateApiGetCache(['/notifications']);
      return res.data;
    },
  },
};
