import type { FastifyInstance } from 'fastify';
import type { MosNotificationFeedResponse } from '@mos-lab/shared';

export interface CachedUserNotifications {
  data: MosNotificationFeedResponse;
  computedAt: number;
}

export const userNotificationsCache = new Map<number, CachedUserNotifications>();
export const inFlightNotificationPromises = new Map<number, Promise<MosNotificationFeedResponse>>();

export function invalidateNotificationsCache(staffId?: number): void {
  if (typeof staffId === 'number' && Number.isFinite(staffId) && staffId > 0) {
    userNotificationsCache.delete(staffId);
    inFlightNotificationPromises.delete(staffId);
  } else {
    userNotificationsCache.clear();
    inFlightNotificationPromises.clear();
  }
}

export function cleanConversationName(name: string, type?: string): string {
  if (!name) return 'nhóm chat';
  if (type === 'dm') return name;
  const cleaned = name.replace(/-{2,}/g, ' - ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  return `#${cleaned}`;
}

export function formatRemindAtVi(remindAtIso: string): string {
  if (!remindAtIso) return 'Nhiệm vụ cần xử lý';
  const targetDate = new Date(remindAtIso);
  if (isNaN(targetDate.getTime())) return 'Nhiệm vụ cần xử lý';

  const vnFormatter = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
  const parts = vnFormatter.formatToParts(targetDate);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';
  const timeStr = `${getPart('hour')}:${getPart('minute')}`;
  const dateStr = `${getPart('day')}/${getPart('month')}`;

  const now = new Date();
  const diffMinutes = Math.round((targetDate.getTime() - now.getTime()) / (1000 * 60));

  if (diffMinutes < 0) {
    const overdueMins = Math.abs(diffMinutes);
    if (overdueMins < 60) {
      return `Hạn nhắc: ${timeStr} hôm nay (quá hạn ${overdueMins} phút)`;
    }
    return `Hạn nhắc: ${timeStr}, ${dateStr} (quá hạn)`;
  } else if (diffMinutes === 0) {
    return `Hạn nhắc: ngay bây giờ (${timeStr})`;
  } else if (diffMinutes < 60) {
    return `Hạn nhắc: ${timeStr} hôm nay (còn ${diffMinutes} phút)`;
  }

  const vnToday = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
  }).format(now);

  if (vnToday === dateStr) {
    return `Hạn nhắc: ${timeStr} hôm nay`;
  }
  return `Hạn nhắc: ${timeStr}, ${dateStr}`;
}

export interface UserNotificationReadState {
  readIds: string[];
  lastMarkedAllAt?: string;
  updatedAt: string;
}

export function getNotificationReadConfigKey(staffId: number): string {
  return `mos_notifications:read:${staffId}`;
}

export async function loadUserReadState(fastify: FastifyInstance, staffId: number): Promise<UserNotificationReadState> {
  try {
    const row = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: getNotificationReadConfigKey(staffId) },
    });
    if (!row || !row.value) {
      return { readIds: [], updatedAt: new Date().toISOString() };
    }
    const parsed = JSON.parse(row.value);
    return {
      readIds: Array.isArray(parsed.readIds) ? parsed.readIds : [],
      lastMarkedAllAt: typeof parsed.lastMarkedAllAt === 'string' ? parsed.lastMarkedAllAt : undefined,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return { readIds: [], updatedAt: new Date().toISOString() };
  }
}

export async function saveUserReadState(
  fastify: FastifyInstance,
  staffId: number,
  state: UserNotificationReadState
): Promise<void> {
  const serialized = JSON.stringify({
    ...state,
    updatedAt: new Date().toISOString(),
  });
  await fastify.prisma.crm.crmConfig.upsert({
    where: { key: getNotificationReadConfigKey(staffId) },
    create: {
      key: getNotificationReadConfigKey(staffId),
      value: serialized,
    },
    update: {
      value: serialized,
    },
  });
}
