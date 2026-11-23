export interface HeaderNotificationCenterProps {
  onOpenChat?: (conversationId?: string, messageId?: string, payload?: Record<string, unknown>) => void;
  themeMode?: 'light' | 'dark';
}

export type CategoryTab = 'all' | 'inbox' | 'mention' | 'task';

export type StatusFilter = 'all' | 'unread' | 'read';

export interface CategoryTabCounts {
  all: number;
  inbox: number;
  mention: number;
  task: number;
}
