import type { MosNotificationFeedResponse, MarkNotificationReadRequest } from '@mos-lab/shared';
import { api, ApiRequestOptions } from './base';

export const notificationsApi = {
  notifications: {
    getFeed: async (options?: ApiRequestOptions): Promise<MosNotificationFeedResponse> => {
      const res = await api.get<MosNotificationFeedResponse>('/notifications', options);
      return res.data;
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
      return res.data;
    },
    markAllAsRead: async (options?: ApiRequestOptions): Promise<{ success: boolean; message: string }> => {
      const res = await api.post<{ success: boolean; message: string }>(
        '/notifications/read',
        { all: true } satisfies MarkNotificationReadRequest,
        options
      );
      return res.data;
    },
  },
};
