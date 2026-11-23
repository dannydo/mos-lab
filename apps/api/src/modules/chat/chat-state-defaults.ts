import type {
  MosChatAccessConfig,
  MosChatConversation,
  MosChatCustomSection,
  MosChatTaskItem,
  MosChatUserSidebarPrefs,
  SafeAny,
} from '@mos-lab/shared';
import { deduplicateMovedMessagesInConversation } from './chat-repository.service.js';

export const CHAT_CONVERSATIONS_CONFIG_KEY = 'mos_chat:conversations_v1';
export const CHAT_TASKS_CONFIG_KEY = 'mos_chat:tasks_v1';
export const CHAT_ACCESS_CONFIG_KEY = 'mos_chat:access_config_v1';
export const CHAT_USER_PREFS_CONFIG_KEY = 'mos_chat:user_prefs_v1';

export const MAX_MESSAGES_PER_CONVERSATION = 150;
export const MAX_TASKS_RETENTION = 200;
export const STAFF_DIRECTORY_CACHE_TTL_MS = 60_000;
export const STATE_DB_SYNC_TTL_MS = 300_000;
export const MAX_UNREAD_SUMMARY_CACHE_ENTRIES = 300;

export function buildDefaultConversations(): MosChatConversation[] {
  const nowIso = new Date().toISOString();
  return [
    {
      id: 'space-cc',
      type: 'space',
      name: 'tư-vấn-cc-ca-hôm-nay',
      subtitle: 'Phối hợp đón khách giữa Telesales Booker · Tư Vấn CC · Chuyên Viên Mi',
      roleTag: '12',
      color: '#10b981',
      memberCount: 12,
      unreadCount: 2,
      updatedAt: nowIso,
      messages: [
        {
          id: 'msg-seed-1',
          conversationId: 'space-cc',
          senderId: 'staff-tn',
          senderName: 'Tuyết Nhi',
          senderRole: 'Telesales',
          senderAvatar: 'TN',
          roleColor: '#0ea5e9',
          text: 'Chị Nguyễn Bích Ngọc (VIP Diamond) vừa báo sẽ tới sớm lúc 15:15 hôm nay để nối mi Anime Thiết Kế.',
          timeLabel: '14:42',
          createdAt: nowIso,
          pinned: true,
          reactions: { '❤️': 3, '🔥': 2 },
          customerCard: {
            name: 'Chị Nguyễn Bích Ngọc',
            meta: 'VIP Diamond · Hẹn 15:15 hôm nay',
            cvName: 'Chuyên Viên Minh Thư (CV🪶)',
          },
          thread: [
            {
              id: 'th-seed-2',
              senderId: 'staff-mt',
              senderName: 'Chuyên Viên Minh Thư',
              senderRole: 'Chuyên Viên Tự Chủ (CV🪶)',
              senderAvatar: 'MT',
              text: 'Giường VIP 02 đã khử khuẩn sẵn sàng đón khách.',
              timeLabel: '14:44',
              createdAt: nowIso,
            },
          ],
        },
        {
          id: 'msg-seed-3',
          conversationId: 'space-cc',
          senderId: 'staff-mt',
          senderName: 'Chuyên Viên Minh Thư',
          senderRole: 'Chuyên Viên Tự Chủ (CV🪶)',
          senderAvatar: 'MT',
          roleColor: '#14b8a6',
          text: 'Em vừa hoàn tất ca trước, khay dụng cụ mi thiết kế đã sẵn sàng.',
          timeLabel: '14:46',
          createdAt: nowIso,
          reactions: { '🎉': 4 },
          thread: [],
        },
      ],
    },
    {
      id: 'space-telesales',
      type: 'space',
      name: 'telesales-booker',
      subtitle: 'Chiến dịch gọi chăm sóc khách Combo Live & Khách cũ quay lại',
      roleTag: '8',
      color: '#f59e0b',
      memberCount: 8,
      unreadCount: 0,
      updatedAt: nowIso,
      messages: [
        {
          id: 'msg-seed-tele-1',
          conversationId: 'space-telesales',
          senderId: 'staff-tn',
          senderName: 'Tuyết Nhi',
          senderRole: 'Telesales',
          senderAvatar: 'TN',
          roleColor: '#0ea5e9',
          text: 'Ca chiều còn 3 khung 16:30 của Chuyên Viên Kỹ Thuật, ưu tiên gọi tệp khách gần hạn dặm mi.',
          timeLabel: '14:15',
          createdAt: nowIso,
          reactions: { '🔥': 5 },
          thread: [],
        },
      ],
    },
    {
      id: 'space-cv',
      type: 'space',
      name: 'chuyên-viên-mi-tầng-1',
      subtitle: 'Kênh điều phối tua và chuẩn bị dụng cụ của đội ngũ Chuyên Viên Mi',
      roleTag: '15',
      color: '#14b8a6',
      memberCount: 15,
      unreadCount: 0,
      updatedAt: nowIso,
      messages: [
        {
          id: 'msg-seed-cv-1',
          conversationId: 'space-cv',
          senderId: 'staff-mt',
          senderName: 'Chuyên Viên Minh Thư',
          senderRole: 'Chuyên Viên Tự Chủ (CV🪶)',
          senderAvatar: 'MT',
          roleColor: '#14b8a6',
          text: 'Nhờ kho bổ sung thêm 5 khay mi cong C 0.07 dài 11mm lên tủ Chuyên Viên tầng 1 trước 16:00.',
          timeLabel: '13:50',
          createdAt: nowIso,
          reactions: { '👍': 3 },
          thread: [],
        },
      ],
    },
  ];
}

export function buildDefaultTasks(): MosChatTaskItem[] {
  return [];
}

export function buildDefaultAccessConfig(): MosChatAccessConfig {
  return {
    allowAllStaff: false,
    allowedGroupKeys: ['TEAM_ADMIN_MANAGER', 'TEAM_CC', 'TEAM_CV', 'TEAM_TELESALES', 'DEPT_SHOP'],
    allowedStaffIds: [],
    aiCopilotAllowedGroupKeys: ['TEAM_ADMIN_MANAGER', 'TEAM_TELESALES'],
    aiCopilotAllowedStaffIds: [],
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeAccessConfig(raw: SafeAny): MosChatAccessConfig {
  const def = buildDefaultAccessConfig();
  if (!raw || typeof raw !== 'object') return def;
  return {
    allowAllStaff: Boolean(raw.allowAllStaff),
    allowedGroupKeys: Array.isArray(raw.allowedGroupKeys)
      ? Array.from(
          new Set(
            raw.allowedGroupKeys.filter((g: unknown): g is string => typeof g === 'string' && g.trim().length > 0)
          )
        )
      : def.allowedGroupKeys,
    allowedStaffIds: Array.isArray(raw.allowedStaffIds)
      ? Array.from(
          new Set(
            raw.allowedStaffIds.map((id: unknown) => Number(id)).filter((id: number) => Number.isFinite(id) && id > 0)
          )
        )
      : [],
    aiCopilotAllowedGroupKeys: Array.isArray(raw.aiCopilotAllowedGroupKeys)
      ? Array.from(
          new Set(
            raw.aiCopilotAllowedGroupKeys.filter(
              (g: unknown): g is string => typeof g === 'string' && g.trim().length > 0
            )
          )
        )
      : [],
    aiCopilotAllowedStaffIds: Array.isArray(raw.aiCopilotAllowedStaffIds)
      ? Array.from(
          new Set(
            raw.aiCopilotAllowedStaffIds
              .map((id: unknown) => Number(id))
              .filter((id: number) => Number.isFinite(id) && id > 0)
          )
        )
      : [],
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : def.updatedAt,
    updatedBy: typeof raw.updatedBy === 'string' ? raw.updatedBy : undefined,
  };
}

export function buildDefaultUserSidebarPrefs(): MosChatUserSidebarPrefs {
  return {
    pinnedIds: [],
    mutedIds: [],
    hiddenIds: [],
    manualUnreadIds: [],
    readMessageCountByConv: {},
    readAtByConv: {},
    lastReadMessageIdByConv: {},
    readThreadReplyCountByMsg: {},
    readThreadAtByMsg: {},
    lastReadThreadReplyIdByMsg: {},
    collapsedSections: {},
    unreadOnlySections: {},
    sectionOrder: ['dm', 'spaces'],
    customSections: [],
    conversationOrder: {},
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeUserSidebarPrefs(raw: SafeAny): MosChatUserSidebarPrefs {
  const def = buildDefaultUserSidebarPrefs();
  if (!raw || typeof raw !== 'object') return def;
  const cleanStrList = (arr: unknown): string[] =>
    Array.isArray(arr)
      ? Array.from(new Set(arr.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)))
      : [];
  const cleanBoolMap = (obj: unknown): Record<string, boolean> => {
    if (!obj || typeof obj !== 'object') return {};
    const out: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (typeof v === 'boolean') out[k] = v;
    }
    return out;
  };
  const cleanNumMap = (obj: unknown): Record<string, number> => {
    if (!obj || typeof obj !== 'object') return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) out[k] = n;
    }
    return out;
  };
  const cleanStrMap = (obj: unknown): Record<string, string> => {
    if (!obj || typeof obj !== 'object') return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (typeof v === 'string' && v.trim().length > 0) out[k] = v.trim();
    }
    return out;
  };
  const rawCustomSections: MosChatCustomSection[] = Array.isArray(raw.customSections)
    ? raw.customSections
        .filter((s: SafeAny) => s && typeof s.id === 'string' && typeof s.name === 'string' && s.name.trim().length > 0)
        .slice(0, 20)
        .map((s: SafeAny) => ({
          id: String(s.id).trim(),
          name: String(s.name).trim().slice(0, 48),
          conversationIds: cleanStrList(s.conversationIds),
          collapsed: Boolean(s.collapsed),
          unreadOnly: Boolean(s.unreadOnly),
        }))
    : [];

  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const customSections: MosChatCustomSection[] = [];
  for (const s of rawCustomSections) {
    const normName = s.name.toLowerCase();
    if (seenIds.has(s.id) || seenNames.has(normName)) {
      continue;
    }
    seenIds.add(s.id);
    seenNames.add(normName);
    customSections.push(s);
  }
  const conversationOrder: Record<string, string[]> = {};
  if (raw.conversationOrder && typeof raw.conversationOrder === 'object') {
    for (const [k, v] of Object.entries(raw.conversationOrder as Record<string, unknown>)) {
      conversationOrder[k] = cleanStrList(v);
    }
  }
  const sectionOrderRaw = cleanStrList(raw.sectionOrder);
  const customIds = customSections.map((s) => s.id);
  const baseOrder = sectionOrderRaw.length > 0 ? sectionOrderRaw : ['dm', 'spaces'];
  const mergedSectionOrder = Array.from(new Set([...customIds, ...baseOrder, 'dm', 'spaces'])).filter(
    (id) => id === 'dm' || id === 'spaces' || customIds.includes(id)
  );

  // Notification mode (tiered notification filtering)
  const validNotifModes = ['ALL', 'MENTIONS_ONLY', 'NOTHING'] as const;
  const notificationMode =
    typeof raw.notificationMode === 'string' && (validNotifModes as readonly string[]).includes(raw.notificationMode)
      ? (raw.notificationMode as (typeof validNotifModes)[number])
      : undefined;

  const validChannelOverrides = ['INHERIT', 'ALL', 'MENTIONS_ONLY', 'MUTED'] as const;
  type ChannelOverrideValue = (typeof validChannelOverrides)[number];
  const channelNotificationOverrides: Record<string, ChannelOverrideValue> = {};
  if (raw.channelNotificationOverrides && typeof raw.channelNotificationOverrides === 'object') {
    for (const [k, v] of Object.entries(raw.channelNotificationOverrides as Record<string, unknown>)) {
      if (typeof v === 'string' && (validChannelOverrides as readonly string[]).includes(v)) {
        channelNotificationOverrides[k] = v as ChannelOverrideValue;
      }
    }
  }

  return {
    pinnedIds: cleanStrList(raw.pinnedIds),
    mutedIds: cleanStrList(raw.mutedIds),
    hiddenIds: cleanStrList(raw.hiddenIds),
    manualUnreadIds: cleanStrList(raw.manualUnreadIds),
    readMessageCountByConv: cleanNumMap(raw.readMessageCountByConv),
    readAtByConv: cleanStrMap(raw.readAtByConv),
    lastReadMessageIdByConv: cleanStrMap(raw.lastReadMessageIdByConv),
    readThreadReplyCountByMsg: cleanNumMap(raw.readThreadReplyCountByMsg),
    readThreadAtByMsg: cleanStrMap(raw.readThreadAtByMsg),
    lastReadThreadReplyIdByMsg: cleanStrMap(raw.lastReadThreadReplyIdByMsg),
    collapsedSections: cleanBoolMap(raw.collapsedSections),
    unreadOnlySections: cleanBoolMap(raw.unreadOnlySections),
    sectionOrder: mergedSectionOrder,
    customSections,
    conversationOrder,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : def.updatedAt,
    ...(notificationMode ? { notificationMode } : {}),
    ...(Object.keys(channelNotificationOverrides).length > 0 ? { channelNotificationOverrides } : {}),
  };
}

export function trimConversationsRetention(conversations: MosChatConversation[]): MosChatConversation[] {
  return conversations.map((c) => {
    const nextConv: MosChatConversation = {
      ...c,
      messages: Array.isArray(c.messages) ? c.messages.slice(-MAX_MESSAGES_PER_CONVERSATION) : [],
    };
    deduplicateMovedMessagesInConversation(nextConv);
    return nextConv;
  });
}
