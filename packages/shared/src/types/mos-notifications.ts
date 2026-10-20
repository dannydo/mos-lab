export type NotificationCategory = 'inbox_approval' | 'chat_mention' | 'task_reminder' | 'system_alert';

export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low';

export type NotificationActionType =
  'navigate_bug_report' | 'open_chat' | 'navigate_customer' | 'navigate_url' | 'open_modal';

export interface MosNotificationAction {
  type: NotificationActionType;
  payload: {
    reportId?: number;
    conversationId?: string;
    messageId?: string;
    customerId?: number;
    url?: string;
    [key: string]: unknown;
  };
}

export interface MosNotificationActor {
  id?: number;
  name?: string;
  avatarUrl?: string;
  role?: string;
}

export interface MosNotificationItem {
  id: string;
  title: string;
  summary: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  action: MosNotificationAction;
  createdAt: string;
  readAt?: string | null;
  actor?: MosNotificationActor;
  badgeText?: string;
  isActionable?: boolean;
}

export interface MosNotificationFeedResponse {
  items: MosNotificationItem[];
  unreadCount: number;
  urgentCount: number;
  updatedAt: string;
}

export interface MarkNotificationReadRequest {
  notificationId?: string;
  all?: boolean;
}
