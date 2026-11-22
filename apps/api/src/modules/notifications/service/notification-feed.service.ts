import type { FastifyInstance } from 'fastify';
import type { MosNotificationFeedResponse, MosNotificationItem } from '@mos-lab/shared';
import type { JwtUserPayload } from '../../../middlewares/auth.js';
import { collectChatNotifications } from './notification-chat.collector.js';
import { collectInboxNotifications } from './notification-inbox.collector.js';
import { loadUserReadState } from './notification-state.js';

export async function computeNotificationsFeed(
  fastify: FastifyInstance,
  user: JwtUserPayload,
  staffId: number,
  isDanny: boolean
): Promise<MosNotificationFeedResponse> {
  const userStaff = await fastify.prisma.crm.crmStaff.findUnique({
    where: { id: staffId },
    select: { id: true, displayName: true, username: true, email: true, role: true, avatarUrl: true },
  });

  const userDisplayName = userStaff?.displayName || user.username || '';
  const readState = await loadUserReadState(fastify, staffId);
  const readIdsSet = new Set(readState.readIds);
  const lastMarkedAllIso = readState.lastMarkedAllAt || '';

  const items: MosNotificationItem[] = [];

  await collectInboxNotifications(fastify, staffId, isDanny, items, readIdsSet);
  await collectChatNotifications(fastify, user, staffId, userStaff, userDisplayName, items, readIdsSet);

  // Deduplicate items by id
  const seenIds = new Set<string>();
  const uniqueItems: MosNotificationItem[] = [];
  for (const item of items) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      uniqueItems.push(item);
    }
  }

  // Populate readAt based on readState
  for (const item of uniqueItems) {
    if (readIdsSet.has(item.id)) {
      item.readAt = item.readAt || readState.updatedAt || new Date().toISOString();
    } else if (lastMarkedAllIso && item.createdAt <= lastMarkedAllIso) {
      item.readAt = lastMarkedAllIso;
    } else {
      item.readAt = null;
    }
  }

  // Sort items: unread first, then by priority (urgent > high > normal > low), then by createdAt desc
  uniqueItems.sort((a, b) => {
    const aUnread = a.readAt ? 1 : 0;
    const bUnread = b.readAt ? 1 : 0;
    if (aUnread !== bUnread) return aUnread - bUnread;
    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
    const pDiff = (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
    if (pDiff !== 0) return pDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const unreadCount = uniqueItems.filter((i) => !i.readAt).length;
  const urgentCount = uniqueItems.filter((i) => !i.readAt && (i.priority === 'urgent' || i.priority === 'high')).length;

  return {
    items: uniqueItems,
    unreadCount,
    urgentCount,
    updatedAt: new Date().toISOString(),
  };
}
