import type { MosNotificationItem } from '@mos-lab/shared';
import type { CategoryTab, CategoryTabCounts, HeaderNotificationCenterProps } from './notificationTypes';

export function formatRelativeTimeVi(dateIso: string): string {
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

export function cleanSummaryText(summary: string): string {
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

export function cleanNotificationTitle(title: string): string {
  if (!title) return '';
  return title.replace(/-{2,}/g, ' - ').replace(/-/g, ' ');
}

export function computeFeedCounts(items: MosNotificationItem[]): { unreadCount: number; urgentCount: number } {
  const unreadCount = items.filter((i) => !i.readAt).length;
  const urgentCount = items.filter((i) => !i.readAt && (i.priority === 'urgent' || i.priority === 'high')).length;
  return { unreadCount, urgentCount };
}

export function filterNotificationsByCategory(
  items: MosNotificationItem[],
  activeTab: CategoryTab
): MosNotificationItem[] {
  return items.filter((item) => {
    if (activeTab === 'inbox') return item.category === 'inbox_approval';
    if (activeTab === 'mention') return item.category === 'chat_mention';
    if (activeTab === 'task') return item.category === 'task_reminder';
    return true;
  });
}

export function computeCategoryTabCounts(items: MosNotificationItem[]): CategoryTabCounts {
  return {
    all: items.length,
    inbox: items.filter((i) => i.category === 'inbox_approval').length,
    mention: items.filter((i) => i.category === 'chat_mention').length,
    task: items.filter((i) => i.category === 'task_reminder').length,
  };
}

export function navigateForNotificationAction(
  item: MosNotificationItem,
  deps: {
    push: (url: string) => void;
    onOpenChat?: HeaderNotificationCenterProps['onOpenChat'];
  }
): void {
  const action = item.action;
  if (action.type === 'navigate_bug_report') {
    const reportId = action.payload?.reportId;
    if (reportId) {
      window.dispatchEvent(new CustomEvent('mos:open_bug_report', { detail: action.payload }));
      deps.push(`/dashboard/bug-reports?reportId=${reportId}`);
    } else {
      deps.push('/dashboard/bug-reports');
    }
  } else if (action.type === 'open_chat') {
    const convId = action.payload?.conversationId as string | undefined;
    const msgId = action.payload?.messageId as string | undefined;
    if (deps.onOpenChat) {
      deps.onOpenChat(convId, msgId, action.payload);
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
      deps.push(`/dashboard/customers?id=${custId}`);
    } else {
      deps.push('/dashboard/customers');
    }
  } else if (action.type === 'navigate_url' && action.payload?.url) {
    deps.push(action.payload.url as string);
  }
}
