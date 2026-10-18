import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import {
  ActionMosChatMissionRequest,
  CreateMosChatConversationRequest,
  CreateMosChatMessageRequest,
  CreateMosChatMissionRequest,
  CreateMosChatTaskRequest,
  CreateMosChatThreadReplyRequest,
  DeleteMosChatMessageRequest,
  EditMosChatMessageRequest,
  MosChatAccessConfig,
  MosChatBootstrapResponse,
  MosChatConversation,
  MosChatCustomSection,
  MosChatImageAttachment,
  MosChatImageMimeType,
  MosChatStaffMember,
  MosChatTaskItem,
  MosChatUserSidebarPrefs,
  SafeAny,
  UpdateMosChatAccessConfigRequest,
  UploadMosChatImageRequest,
  UploadMosChatImageResponse,
} from '@mos-lab/shared';
import { requireAuth, JwtUserPayload } from '../../middlewares/auth.js';
import { ChatMissionBridgeService } from './chat-mission-bridge.service.js';

const CHAT_CONVERSATIONS_CONFIG_KEY = 'mos_chat:conversations_v1';
const CHAT_TASKS_CONFIG_KEY = 'mos_chat:tasks_v1';
const CHAT_ACCESS_CONFIG_KEY = 'mos_chat:access_config_v1';
const CHAT_USER_PREFS_CONFIG_KEY = 'mos_chat:user_prefs_v1';
const MAX_CHAT_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB max per image
const CHAT_IMAGE_BODY_LIMIT = 15 * 1024 * 1024; // 15 MB body limit for base64 payload

const CHAT_MIME_EXTENSIONS: Record<MosChatImageMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const EXT_TO_CHAT_MIME: Record<string, MosChatImageMimeType> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

function workspaceRoot(): string {
  const cwd = process.cwd();
  return cwd.endsWith(`${sep}apps${sep}api`) ? resolve(cwd, '..', '..') : cwd;
}

function mosChatMediaRoot(): string {
  const configured = String(process.env.MOS_CHAT_MEDIA_DIR || '').trim();
  if (configured) return resolve(configured);
  if (process.env.NODE_ENV === 'production') return '/home/web/mos-data/mos-chat-media';
  return resolve(workspaceRoot(), 'scratch', 'mos-chat-media');
}

function decodeAndValidateChatImage(input: UploadMosChatImageRequest): Buffer {
  if (!(input.mimeType in CHAT_MIME_EXTENSIONS)) {
    throw new Error('Định dạng ảnh không được hỗ trợ (chỉ hỗ trợ JPG, PNG, WebP, GIF).');
  }
  const encoded = String(input.dataBase64 || '')
    .trim()
    .replace(/^data:image\/(?:jpeg|jpg|png|webp|gif);base64,/i, '');
  if (!encoded || encoded.length > Math.ceil(MAX_CHAT_IMAGE_BYTES * 1.4)) {
    throw new Error('Ảnh quá lớn (tối đa 8MB) hoặc dữ liệu ảnh không hợp lệ.');
  }
  const buffer = Buffer.from(encoded, 'base64');
  if (buffer.length <= 0 || buffer.length > MAX_CHAT_IMAGE_BYTES) {
    throw new Error('Ảnh quá lớn (tối đa 8MB).');
  }

  const isJpeg =
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[buffer.length - 2] === 0xff &&
    buffer[buffer.length - 1] === 0xd9;
  const isPng =
    buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp =
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  const isGif =
    buffer.length >= 6 &&
    (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a');

  if (
    (input.mimeType === 'image/jpeg' && !isJpeg) ||
    (input.mimeType === 'image/png' && !isPng) ||
    (input.mimeType === 'image/webp' && !isWebp) ||
    (input.mimeType === 'image/gif' && !isGif)
  ) {
    throw new Error('Nội dung tệp không khớp định dạng ảnh.');
  }
  return buffer;
}

function sanitizeChatAttachments(raw?: MosChatImageAttachment[]): MosChatImageAttachment[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw
    .slice(0, 8)
    .filter((item) => {
      if (!item || typeof item.url !== 'string') return false;
      const u = item.url.trim();
      // Never allow raw base64 data URLs inside crm_config JSON!
      if (u.startsWith('data:')) return false;
      return (
        u.startsWith('/api/chat/media/') ||
        u.startsWith('https://drive.google.com/') ||
        u.startsWith('https://lh3.googleusercontent.com/')
      );
    })
    .map((item) => ({
      id: String(item.id || `att-${crypto.randomUUID().slice(0, 8)}`),
      url: item.url.trim(),
      name: String(item.name || 'image.png').slice(0, 120),
      mimeType: item.mimeType in CHAT_MIME_EXTENSIONS ? item.mimeType : 'image/png',
      sizeBytes: Math.max(0, Number(item.sizeBytes) || 0),
      width: item.width ? Number(item.width) : undefined,
      height: item.height ? Number(item.height) : undefined,
      source: item.source || 'upload',
    }));
}

function formatTimeLabel(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function getRoleDisplayLabel(role?: string | null): { label: string; color: string } {
  const normalized = String(role || '')
    .toLowerCase()
    .trim();
  if (normalized === 'super_admin') return { label: 'Super Admin', color: '#d4a84b' };
  if (normalized === 'admin') return { label: 'Admin', color: '#a855f7' };
  if (normalized === 'telesales' || normalized === 'booker') return { label: 'Telesales', color: '#0ea5e9' };
  if (normalized === 'cc' || normalized === 'consultant') return { label: 'Tư Vấn (CC)', color: '#10b981' };
  if (normalized === 'technician' || normalized === 'ktv' || normalized === 'cv') {
    return { label: 'Chuyên Viên (CV)', color: '#14b8a6' };
  }
  return { label: role ? role.toUpperCase() : 'STAFF', color: '#3b82f6' };
}

function getInitials(name?: string | null, username?: string | null): string {
  const source = (name || username || 'NV').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function buildDefaultConversations(): MosChatConversation[] {
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
            cvName: 'Chuyên Viên Minh Thư (CV+)',
          },
          thread: [
            {
              id: 'th-seed-2',
              senderId: 'staff-mt',
              senderName: 'Chuyên Viên Minh Thư',
              senderRole: 'Chuyên Viên Tự Chủ (CV+)',
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
          senderRole: 'Chuyên Viên Tự Chủ (CV+)',
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
          senderRole: 'Chuyên Viên Tự Chủ (CV+)',
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

function buildDefaultTasks(): MosChatTaskItem[] {
  return [];
}

const MAX_MESSAGES_PER_CONVERSATION = 150;
const MAX_TASKS_RETENTION = 200;
const STAFF_DIRECTORY_CACHE_TTL_MS = 60_000;
const STATE_DB_SYNC_TTL_MS = 30_000;

function buildDefaultAccessConfig(): MosChatAccessConfig {
  return {
    allowAllStaff: false,
    allowedGroupKeys: ['TEAM_ADMIN_MANAGER'],
    allowedStaffIds: [],
    aiCopilotAllowedGroupKeys: [],
    aiCopilotAllowedStaffIds: [],
    updatedAt: new Date().toISOString(),
  };
}

function normalizeAccessConfig(raw: SafeAny): MosChatAccessConfig {
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

function matchesStaffGroupBackend(member: MosChatStaffMember, groupKey: string): boolean {
  const role = String(member.role || '')
    .toLowerCase()
    .trim();
  const depts = (member.departmentCodes || []).map((d) => d.toUpperCase());
  const teams = (member.teamCodes || []).map((t) => t.toUpperCase());

  switch (groupKey) {
    case 'DEPT_SHOP':
      return (
        depts.includes('SHOP') || ['cc', 'coca', 'consultant', 'cv', 'lt', 'technician', 'ktv', 'qa_qc'].includes(role)
      );
    case 'DEPT_GROWTH':
      return depts.includes('GROWTH') || ['telesales', 'booker', 'oc', 'ls', 'cs', 'control'].includes(role);
    case 'DEPT_ACADEMY':
      return depts.includes('ACADEMY') || ['teacher', 'ht'].includes(role);
    case 'DEPT_BACK_OFFICE':
      return (
        depts.includes('BACK_OFFICE') ||
        [
          'super_admin',
          'admin',
          'boss',
          'manager',
          'fm',
          'cho',
          'staff',
          'office-cleaner',
          'security-guard',
          'rnd',
        ].includes(role)
      );
    case 'TEAM_ADMIN_MANAGER':
      return teams.includes('ADMIN_MANAGER') || ['super_admin', 'admin', 'boss', 'manager', 'fm', 'cho'].includes(role);
    case 'TEAM_CC':
      return teams.includes('CC') || ['cc', 'coca', 'consultant'].includes(role);
    case 'TEAM_CV':
      return teams.includes('CV') || ['cv', 'lt', 'technician', 'ktv'].includes(role);
    case 'TEAM_TELESALES':
      return (
        teams.includes('BK_TELESALES') || teams.includes('BK') || ['telesales', 'booker', 'oc', 'ls'].includes(role)
      );
    case 'TEAM_CS_CONTROL':
      return (
        teams.includes('BK_CS_CONTROL') ||
        teams.includes('BK_CS') ||
        teams.includes('BK_CONTROL') ||
        ['cs', 'control'].includes(role)
      );
    case 'TEAM_ACADEMY':
      return teams.includes('ACADEMY') || teams.includes('MARKETING_SALES') || ['teacher', 'ht'].includes(role);
    case 'TEAM_QA_QC':
      return teams.some((t) => t.startsWith('QA_QC')) || ['qa_qc'].includes(role);
    case 'TEAM_INTERNAL':
      return teams.includes('BACK_OFFICE_STAFF') || ['staff', 'office-cleaner', 'security-guard', 'rnd'].includes(role);
    default:
      return false;
  }
}

function isDannyOrSuperAdminUser(user?: JwtUserPayload): boolean {
  if (!user) return false;
  const uname = String(user.username || '')
    .toLowerCase()
    .trim();
  const role = String(user.role || '')
    .toLowerCase()
    .trim();
  return uname === 'danny' || uname.includes('danny') || role === 'super_admin' || role === 'admin';
}

function resolveUserStaffId(user: JwtUserPayload | undefined, staffDirectory: MosChatStaffMember[]): number {
  if (!user) return 0;
  const directId = Number(user.id);
  if (Number.isFinite(directId) && directId > 0) return directId;
  const uname = String(user.username || '')
    .toLowerCase()
    .trim();
  if (uname) {
    const matched = staffDirectory.find(
      (s) =>
        String(s.username || '')
          .toLowerCase()
          .trim() === uname
    );
    if (matched && matched.id > 0) return matched.id;
  }
  return 0;
}

/**
 * Resolves the exact participant staff IDs for a Direct Message (`type === 'dm'`).
 * - Self-chat (`isSelf: true` or `dm-self-<id>`): returns `[ownerStaffId]` (1 person).
 * - 1-1 Direct Message: returns `[staffIdA, staffIdB]` (strictly 2 people).
 * - Legacy DMs without `memberIds`: infers from `participantStaffId` + numeric message `senderId`s (or Danny's ID for earlier 1-1 DMs).
 */
function resolveDmParticipantIds(conv: MosChatConversation, staffDirectory: MosChatStaffMember[]): number[] {
  if (conv.type !== 'dm') {
    return Array.isArray(conv.memberIds) ? conv.memberIds.map(Number).filter((n) => Number.isFinite(n) && n > 0) : [];
  }
  const convIdStr = String(conv.id || '');
  if (conv.isSelf || convIdStr.startsWith('dm-self-')) {
    const selfId =
      Number(conv.participantStaffId) ||
      Number(convIdStr.replace(/^dm-self-/, '')) ||
      (Array.isArray(conv.memberIds) ? Number(conv.memberIds[0]) : 0) ||
      0;
    return Number.isFinite(selfId) && selfId > 0 ? [selfId] : [];
  }

  // Filter out fake seed DMs ('dm-tuyetnhi', 'dm-hamy') that have no real 2-person participant pair
  if (convIdStr === 'dm-tuyetnhi' || convIdStr === 'dm-hamy') {
    return [];
  }

  const explicitIds = Array.isArray(conv.memberIds)
    ? Array.from(new Set(conv.memberIds.map(Number).filter((n) => Number.isFinite(n) && n > 0)))
    : [];
  if (explicitIds.length === 2) {
    return explicitIds;
  }

  const pairMatch = convIdStr.match(/^dm-pair-(\d+)-(\d+)$/);
  if (pairMatch) {
    const a = Number(pairMatch[1]);
    const b = Number(pairMatch[2]);
    if (a > 0 && b > 0 && a !== b) {
      return [a, b];
    }
  }

  const inferredSet = new Set<number>(explicitIds);
  const partId = Number(conv.participantStaffId);
  if (Number.isFinite(partId) && partId > 0) {
    inferredSet.add(partId);
  }
  for (const m of conv.messages || []) {
    const sid = Number(m.senderId);
    if (Number.isFinite(sid) && sid > 0) {
      inferredSet.add(sid);
    }
  }
  if (inferredSet.size === 1 && Number.isFinite(partId) && partId > 0) {
    const dannyStaff = staffDirectory.find(
      (s) =>
        String(s.username || '')
          .toLowerCase()
          .trim() === 'danny' ||
        String(s.role || '')
          .toLowerCase()
          .trim() === 'super_admin'
    );
    if (dannyStaff && dannyStaff.id > 0 && !inferredSet.has(dannyStaff.id)) {
      inferredSet.add(dannyStaff.id);
    }
  }
  const result = Array.from(inferredSet);
  return result.length === 2 ? result : [];
}

/**
 * Strict Direct Message Privacy Invariant:
 * - A 1-1 Direct Message (`type === 'dm'`) is ONLY visible to the 2 people in that DM (`dmIds.includes(myStaffId)`).
 * - A Self-Chat (`isSelf`) is ONLY visible to that 1 owner.
 * - No other user (not even another Admin) can see someone else's Direct Message.
 */
function canUserAccessConversation(
  conv: MosChatConversation,
  user: JwtUserPayload | undefined,
  staffDirectory: MosChatStaffMember[]
): boolean {
  const myStaffId = resolveUserStaffId(user, staffDirectory);
  if (conv.type === 'dm') {
    const convIdStr = String(conv.id || '');
    if (conv.isSelf || convIdStr.startsWith('dm-self-')) {
      const selfIds = resolveDmParticipantIds(conv, staffDirectory);
      return myStaffId > 0 && selfIds.length === 1 && selfIds[0] === myStaffId;
    }
    const dmIds = resolveDmParticipantIds(conv, staffDirectory);
    return myStaffId > 0 && dmIds.length === 2 && dmIds.includes(myStaffId);
  }
  return true;
}

/**
 * Accurately computes personalized unread count for a conversation and user:
 * - If user explicitly marked conversation as unread (manualUnreadIds), returns >= 1.
 * - Otherwise computes unread count from messages:
 *   - Only messages sent by OTHERS (not self, not current user) are unread.
 *   - Uses userPrefs.readMessageCountByConv[conv.id] if defined.
 *   - For 1-1 DMs with no explicit read count, counts trailing unread messages sent by the peer since the user's last message.
 */
export function computeUnreadCountForUser(
  conv: MosChatConversation,
  user: JwtUserPayload | undefined,
  staffDirectory: MosChatStaffMember[],
  userPrefs?: MosChatUserSidebarPrefs
): number {
  if (userPrefs?.manualUnreadIds?.includes(conv.id)) {
    return Math.max(1, conv.unreadCount || 0);
  }
  const myStaffId = resolveUserStaffId(user, staffDirectory);
  const msgs = conv.messages || [];
  if (msgs.length === 0) return 0;

  const readCount = userPrefs?.readMessageCountByConv?.[conv.id];
  if (typeof readCount === 'number') {
    const unreadMsgs = msgs.slice(readCount).filter((m) => {
      const senderNum = Number(m.senderId);
      return senderNum !== myStaffId;
    });
    return unreadMsgs.length;
  }

  // If readCount is undefined:
  if (conv.type === 'dm') {
    let unreadCount = 0;
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      const senderNum = Number(m.senderId);
      if (senderNum === myStaffId) {
        break;
      }
      unreadCount++;
    }
    return Math.max(conv.unreadCount || 0, unreadCount);
  }

  return conv.unreadCount || 0;
}

/**
 * Personalizes a 1-1 Direct Message for the requesting user so that:
 * - Person A sees Person B's name, role, avatar, and `participantStaffId: B`.
 * - Person B sees Person A's name, role, avatar, and `participantStaffId: A`.
 * - `unreadCount` reflects the requesting user's actual unread status.
 */
export function formatConversationForUser(
  conv: MosChatConversation,
  user: JwtUserPayload | undefined,
  staffDirectory: MosChatStaffMember[],
  userPrefs?: MosChatUserSidebarPrefs
): MosChatConversation {
  const personalizedUnread = computeUnreadCountForUser(conv, user, staffDirectory, userPrefs);
  if (conv.type !== 'dm') {
    return {
      ...conv,
      unreadCount: personalizedUnread,
    };
  }
  const convIdStr = String(conv.id || '');
  if (conv.isSelf || convIdStr.startsWith('dm-self-')) {
    const selfIds = resolveDmParticipantIds(conv, staffDirectory);
    return {
      ...conv,
      isSelf: true,
      memberIds: selfIds,
      memberCount: 1,
      unreadCount: personalizedUnread,
    };
  }
  const myStaffId = resolveUserStaffId(user, staffDirectory);
  const dmIds = resolveDmParticipantIds(conv, staffDirectory);
  const peerId = dmIds.find((id) => id !== myStaffId) ?? dmIds[0] ?? Number(conv.participantStaffId);
  const peerStaff = staffDirectory.find((s) => s.id === Number(peerId));
  const peerRole = peerStaff ? getRoleDisplayLabel(peerStaff.role) : null;

  return {
    ...conv,
    name: peerStaff ? peerStaff.displayName || peerStaff.username : conv.name,
    subtitle: peerRole ? peerRole.label : conv.subtitle,
    roleTag: peerRole ? peerRole.label : conv.roleTag,
    avatar: peerStaff ? peerStaff.avatarUrl || getInitials(peerStaff.displayName, peerStaff.username) : conv.avatar,
    participantStaffId: Number(peerId) || conv.participantStaffId,
    memberIds: dmIds,
    memberCount: 2,
    unreadCount: personalizedUnread,
  };
}

function filterAndFormatConversationsForUser(
  conversations: MosChatConversation[],
  user: JwtUserPayload | undefined,
  staffDirectory: MosChatStaffMember[],
  userPrefs?: MosChatUserSidebarPrefs
): MosChatConversation[] {
  return conversations
    .filter((c) => canUserAccessConversation(c, user, staffDirectory))
    .map((c) => formatConversationForUser(c, user, staffDirectory, userPrefs));
}

function filterTasksForUser(
  tasks: MosChatTaskItem[],
  allConversations: MosChatConversation[],
  user: JwtUserPayload | undefined,
  staffDirectory: MosChatStaffMember[]
): MosChatTaskItem[] {
  const convMap = new Map<string, MosChatConversation>();
  for (const c of allConversations) {
    convMap.set(c.id, c);
  }
  return tasks.filter((t) => {
    if (t.conversationId === 'dm-tuyetnhi' || t.conversationId === 'dm-hamy') return false;
    const conv = convMap.get(t.conversationId);
    if (!conv) return true;
    return canUserAccessConversation(conv, user, staffDirectory);
  });
}

function evaluateCanUserAccessMosChat(
  user: JwtUserPayload | undefined,
  staffDirectory: MosChatStaffMember[],
  accessConfig: MosChatAccessConfig
): boolean {
  if (!user) return false;
  // Danny and Admin/SuperAdmin always have access so they can manage configuration
  if (isDannyOrSuperAdminUser(user)) return true;
  if (accessConfig.allowAllStaff) return true;

  const myStaffId = Number(user.id);
  if (Number.isFinite(myStaffId) && myStaffId > 0 && accessConfig.allowedStaffIds.includes(myStaffId)) {
    return true;
  }

  const unameClean = String(user.username || '')
    .toLowerCase()
    .trim();
  const matchedMember: MosChatStaffMember = staffDirectory.find(
    (s) =>
      (Number.isFinite(myStaffId) && myStaffId > 0 && s.id === myStaffId) ||
      (unameClean &&
        String(s.username || '')
          .toLowerCase()
          .trim() === unameClean)
  ) || {
    id: myStaffId || 0,
    username: user.username || '',
    displayName: user.displayName || user.username || '',
    role: user.role || '',
    departmentCodes: [],
    teamCodes: [],
  };

  for (const grpKey of accessConfig.allowedGroupKeys) {
    if (matchesStaffGroupBackend(matchedMember, grpKey)) {
      return true;
    }
  }

  return false;
}

function buildDefaultUserSidebarPrefs(): MosChatUserSidebarPrefs {
  return {
    pinnedIds: [],
    mutedIds: [],
    hiddenIds: [],
    manualUnreadIds: [],
    readMessageCountByConv: {},
    collapsedSections: {},
    unreadOnlySections: {},
    sectionOrder: ['dm', 'spaces'],
    customSections: [],
    conversationOrder: {},
    updatedAt: new Date().toISOString(),
  };
}

function normalizeUserSidebarPrefs(raw: SafeAny): MosChatUserSidebarPrefs {
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

  return {
    pinnedIds: cleanStrList(raw.pinnedIds),
    mutedIds: cleanStrList(raw.mutedIds),
    hiddenIds: cleanStrList(raw.hiddenIds),
    manualUnreadIds: cleanStrList(raw.manualUnreadIds),
    readMessageCountByConv: cleanNumMap(raw.readMessageCountByConv),
    collapsedSections: cleanBoolMap(raw.collapsedSections),
    unreadOnlySections: cleanBoolMap(raw.unreadOnlySections),
    sectionOrder: mergedSectionOrder,
    customSections,
    conversationOrder,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : def.updatedAt,
  };
}

function resolveUserPrefKey(user: JwtUserPayload | undefined, staffDirectory: MosChatStaffMember[]): string {
  const sid = resolveUserStaffId(user, staffDirectory);
  if (sid > 0) return `staff_${sid}`;
  const uname = String(user?.username || '')
    .toLowerCase()
    .trim();
  return uname ? `user_${uname}` : 'default';
}

let memoryChatCache: {
  conversations: MosChatConversation[];
  tasks: MosChatTaskItem[];
  accessConfig: MosChatAccessConfig;
  userPrefsByUserKey: Record<string, MosChatUserSidebarPrefs>;
  version: number;
  lastSyncedFromDbAt: number;
} | null = null;

let memoryStaffCache: {
  staffDirectory: MosChatStaffMember[];
  fetchedAt: number;
} | null = null;

let writeChain: Promise<void> = Promise.resolve();

function trimConversationsRetention(conversations: MosChatConversation[]): MosChatConversation[] {
  return conversations.map((c) => ({
    ...c,
    messages: Array.isArray(c.messages) ? c.messages.slice(-MAX_MESSAGES_PER_CONVERSATION) : [],
  }));
}

function normalizeTaskTitleKey(rawTitle: string | undefined | null): string {
  return String(rawTitle || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function deduplicateTasks(
  tasks: MosChatTaskItem[],
  conversations?: MosChatConversation[]
): {
  tasks: MosChatTaskItem[];
  changed: boolean;
  convChanged: boolean;
} {
  const deduped: MosChatTaskItem[] = [];
  const byId = new Map<string, MosChatTaskItem>();
  const byMsgKey = new Map<string, MosChatTaskItem>();
  const byTitleKey = new Map<string, MosChatTaskItem>();
  const byMissionKey = new Map<string, MosChatTaskItem>();
  let changed = false;

  for (const raw of tasks) {
    if (!raw || !raw.id || !String(raw.title || '').trim()) {
      changed = true;
      continue;
    }
    const rawId = String(raw.id).trim();
    const rawAssignee = String(raw.assigneeName || '').trim();
    const rawAuthor = String(raw.sourceAuthorName || '').trim();
    const missionIdNum = raw.missionId && Number(raw.missionId) > 0 ? Number(raw.missionId) : 0;

    // Remove legacy seed tasks and any standalone tasks referencing resigned/mock staff Hà My
    if (
      rawId.startsWith('task-seed-') ||
      raw.sourceMessageId === 'msg-seed-2' ||
      raw.sourceMessageId === 'msg-seed-cv-1' ||
      ((rawAssignee.includes('Hà My') || rawAuthor.includes('Hà My')) && missionIdNum <= 0)
    ) {
      changed = true;
      continue;
    }

    const convId = String(raw.conversationId || '').trim();
    const msgId = raw.sourceMessageId ? String(raw.sourceMessageId).trim() : '';
    const normTitle = normalizeTaskTitleKey(raw.title);

    const msgKey = convId && msgId ? `${convId}::msg::${msgId}` : '';
    const titleKey = convId && normTitle ? `${convId}::title::${normTitle}` : '';
    const mKey = missionIdNum > 0 ? `mission::${missionIdNum}` : '';

    const existing =
      byId.get(rawId) ||
      (msgKey ? byMsgKey.get(msgKey) : undefined) ||
      (mKey ? byMissionKey.get(mKey) : undefined) ||
      (titleKey ? byTitleKey.get(titleKey) : undefined);

    if (existing) {
      changed = true;
      if (!existing.missionId && missionIdNum > 0) {
        existing.missionId = missionIdNum;
        existing.missionKey = raw.missionKey || existing.missionKey;
        existing.mission = raw.mission || existing.mission;
        if (mKey) byMissionKey.set(mKey, existing);
      } else if (!existing.mission && raw.mission) {
        existing.mission = raw.mission;
      }
      if (!existing.sourceMessageId && msgId) {
        existing.sourceMessageId = msgId;
        if (msgKey) byMsgKey.set(msgKey, existing);
      }
      if (existing.assigneeName.includes('Hà My') && rawAssignee && !rawAssignee.includes('Hà My')) {
        existing.assigneeName = rawAssignee;
        existing.assigneeId = raw.assigneeId ?? existing.assigneeId;
      }
      continue;
    }

    const sanitizedAssignee = rawAssignee.includes('Hà My')
      ? raw.creatorName && !raw.creatorName.includes('Hà My')
        ? raw.creatorName
        : 'Danny Do'
      : rawAssignee;
    if (sanitizedAssignee !== raw.assigneeName) {
      changed = true;
    }

    const cloned: MosChatTaskItem = {
      ...raw,
      assigneeName: sanitizedAssignee,
    };
    deduped.push(cloned);
    byId.set(cloned.id, cloned);
    if (msgKey) byMsgKey.set(msgKey, cloned);
    if (titleKey) byTitleKey.set(titleKey, cloned);
    if (mKey) byMissionKey.set(mKey, cloned);
  }

  let convChanged = false;
  if (Array.isArray(conversations) && conversations.length > 0) {
    for (const c of conversations) {
      if (!Array.isArray(c.messages)) continue;
      const beforeLen = c.messages.length;
      c.messages = c.messages.filter((m) => {
        if (!m) return false;
        const text = String(m.text || '').trim();
        // Strip automated mOS Reminder spam messages and mock Hà My messages
        if (
          m.senderId === 'system-reminder' ||
          m.senderName === 'mOS Reminder' ||
          text.startsWith('Đến giờ nhắc việc:') ||
          m.id === 'msg-seed-2' ||
          m.senderId === 'staff-hm' ||
          m.senderName === 'Hà My' ||
          text.includes('Giao việc cho Hà My')
        ) {
          return false;
        }
        if (Array.isArray(m.thread) && m.thread.length > 0) {
          const origThreadLen = m.thread.length;
          m.thread = m.thread.filter(
            (th) => th.id !== 'th-seed-1' && th.senderId !== 'staff-hm' && th.senderName !== 'Hà My'
          );
          if (m.thread.length !== origThreadLen) {
            convChanged = true;
          }
        }
        return true;
      });
      if (c.messages.length !== beforeLen) {
        convChanged = true;
      }

      for (const m of c.messages) {
        const msgKey = `${c.id}::msg::${m.id}`;
        const canonicalTask = byMsgKey.get(msgKey);
        if (canonicalTask && m.taskId !== canonicalTask.id) {
          m.taskId = canonicalTask.id;
          convChanged = true;
        } else if (!canonicalTask && m.taskId && !byId.has(m.taskId)) {
          delete m.taskId;
          convChanged = true;
        }
      }
    }
  }

  return {
    tasks: deduped.slice(0, MAX_TASKS_RETENTION),
    changed,
    convChanged,
  };
}

function trimTasksRetention(tasks: MosChatTaskItem[], conversations?: MosChatConversation[]): MosChatTaskItem[] {
  return deduplicateTasks(tasks, conversations).tasks;
}

async function loadChatState(fastify: FastifyInstance): Promise<{
  conversations: MosChatConversation[];
  tasks: MosChatTaskItem[];
  accessConfig: MosChatAccessConfig;
  userPrefsByUserKey: Record<string, MosChatUserSidebarPrefs>;
  version: number;
}> {
  const now = Date.now();
  if (memoryChatCache && now - memoryChatCache.lastSyncedFromDbAt < STATE_DB_SYNC_TTL_MS) {
    return memoryChatCache;
  }

  const [convRecord, taskRecord, accessRecord, prefsRecord] = await Promise.all([
    fastify.prisma.crm.crmConfig.findUnique({ where: { key: CHAT_CONVERSATIONS_CONFIG_KEY } }),
    fastify.prisma.crm.crmConfig.findUnique({ where: { key: CHAT_TASKS_CONFIG_KEY } }),
    fastify.prisma.crm.crmConfig.findUnique({ where: { key: CHAT_ACCESS_CONFIG_KEY } }),
    fastify.prisma.crm.crmConfig.findUnique({ where: { key: CHAT_USER_PREFS_CONFIG_KEY } }),
  ]);

  let conversations: MosChatConversation[] | null = null;
  let tasks: MosChatTaskItem[] | null = null;
  let accessConfig: MosChatAccessConfig | null = null;
  const userPrefsByUserKey: Record<string, MosChatUserSidebarPrefs> = {};

  if (convRecord?.value) {
    try {
      const parsed = JSON.parse(convRecord.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        conversations = trimConversationsRetention(parsed);
      }
    } catch (_) {}
  }

  if (taskRecord?.value) {
    try {
      const parsed = JSON.parse(taskRecord.value);
      if (Array.isArray(parsed)) {
        tasks = parsed;
      }
    } catch (_) {}
  }

  if (accessRecord?.value) {
    try {
      const parsed = JSON.parse(accessRecord.value);
      accessConfig = normalizeAccessConfig(parsed);
    } catch (_) {}
  }

  if (prefsRecord?.value) {
    try {
      const parsed = JSON.parse(prefsRecord.value);
      if (parsed && typeof parsed === 'object') {
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
          userPrefsByUserKey[k] = normalizeUserSidebarPrefs(v);
        }
      }
    } catch (_) {}
  }

  if (!conversations) {
    conversations = buildDefaultConversations();
    await fastify.prisma.crm.crmConfig.upsert({
      where: { key: CHAT_CONVERSATIONS_CONFIG_KEY },
      update: { value: JSON.stringify(conversations) },
      create: { key: CHAT_CONVERSATIONS_CONFIG_KEY, value: JSON.stringify(conversations) },
    });
  }

  if (!tasks) {
    tasks = buildDefaultTasks();
    await fastify.prisma.crm.crmConfig.upsert({
      where: { key: CHAT_TASKS_CONFIG_KEY },
      update: { value: JSON.stringify(tasks) },
      create: { key: CHAT_TASKS_CONFIG_KEY, value: JSON.stringify(tasks) },
    });
  } else {
    const dedup = deduplicateTasks(tasks, conversations);
    tasks = dedup.tasks;
    if (dedup.changed) {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: CHAT_TASKS_CONFIG_KEY },
        update: { value: JSON.stringify(tasks) },
        create: { key: CHAT_TASKS_CONFIG_KEY, value: JSON.stringify(tasks) },
      });
    }
    if (dedup.convChanged) {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: CHAT_CONVERSATIONS_CONFIG_KEY },
        update: { value: JSON.stringify(conversations) },
        create: { key: CHAT_CONVERSATIONS_CONFIG_KEY, value: JSON.stringify(conversations) },
      });
    }
  }

  if (!accessConfig) {
    accessConfig = buildDefaultAccessConfig();
  }

  const latestVersion = Math.max(
    convRecord?.updatedAt ? new Date(convRecord.updatedAt).getTime() : 0,
    taskRecord?.updatedAt ? new Date(taskRecord.updatedAt).getTime() : 0,
    accessRecord?.updatedAt ? new Date(accessRecord.updatedAt).getTime() : 0,
    prefsRecord?.updatedAt ? new Date(prefsRecord.updatedAt).getTime() : 0,
    memoryChatCache?.version || 1
  );

  memoryChatCache = {
    conversations,
    tasks,
    accessConfig,
    userPrefsByUserKey,
    version: latestVersion,
    lastSyncedFromDbAt: now,
  };

  return memoryChatCache;
}

async function saveUserSidebarPrefs(
  fastify: FastifyInstance,
  userPrefKey: string,
  prefs: MosChatUserSidebarPrefs
): Promise<MosChatUserSidebarPrefs> {
  const state = await loadChatState(fastify);
  const normalized = normalizeUserSidebarPrefs({
    ...prefs,
    updatedAt: new Date().toISOString(),
  });
  state.userPrefsByUserKey[userPrefKey] = normalized;
  const nextVersion = Date.now();
  if (memoryChatCache) {
    memoryChatCache.userPrefsByUserKey[userPrefKey] = normalized;
    memoryChatCache.version = nextVersion;
    memoryChatCache.lastSyncedFromDbAt = nextVersion;
  }
  const snapshot = { ...state.userPrefsByUserKey };
  writeChain = writeChain
    .then(async () => {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: CHAT_USER_PREFS_CONFIG_KEY },
        update: { value: JSON.stringify(snapshot) },
        create: { key: CHAT_USER_PREFS_CONFIG_KEY, value: JSON.stringify(snapshot) },
      });
    })
    .catch((err) => {
      fastify.log.error('saveUserSidebarPrefs error:', err);
    });
  await writeChain;
  return normalized;
}

async function saveAccessConfig(fastify: FastifyInstance, accessConfig: MosChatAccessConfig) {
  const normalized = normalizeAccessConfig(accessConfig);
  const nextVersion = Date.now();
  if (memoryChatCache) {
    memoryChatCache.accessConfig = normalized;
    memoryChatCache.version = nextVersion;
    memoryChatCache.lastSyncedFromDbAt = nextVersion;
  }
  writeChain = writeChain
    .then(async () => {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: CHAT_ACCESS_CONFIG_KEY },
        update: { value: JSON.stringify(normalized) },
        create: { key: CHAT_ACCESS_CONFIG_KEY, value: JSON.stringify(normalized) },
      });
    })
    .catch((err) => {
      fastify.log.error('saveAccessConfig error:', err);
    });
  await writeChain;
  return normalized;
}

async function saveConversations(fastify: FastifyInstance, conversations: MosChatConversation[]) {
  const trimmed = trimConversationsRetention(conversations);
  const nextVersion = Date.now();
  if (memoryChatCache) {
    memoryChatCache.conversations = trimmed;
    memoryChatCache.version = nextVersion;
    memoryChatCache.lastSyncedFromDbAt = nextVersion;
  }
  writeChain = writeChain
    .then(async () => {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: CHAT_CONVERSATIONS_CONFIG_KEY },
        update: { value: JSON.stringify(trimmed) },
        create: { key: CHAT_CONVERSATIONS_CONFIG_KEY, value: JSON.stringify(trimmed) },
      });
    })
    .catch((err) => {
      fastify.log.error('saveConversations error:', err);
    });
  await writeChain;
}

async function saveTasks(fastify: FastifyInstance, tasks: MosChatTaskItem[]) {
  const trimmed = trimTasksRetention(tasks, memoryChatCache?.conversations);
  const nextVersion = Date.now();
  if (memoryChatCache) {
    memoryChatCache.tasks = trimmed;
    memoryChatCache.version = nextVersion;
    memoryChatCache.lastSyncedFromDbAt = nextVersion;
  }
  writeChain = writeChain
    .then(async () => {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: CHAT_TASKS_CONFIG_KEY },
        update: { value: JSON.stringify(trimmed) },
        create: { key: CHAT_TASKS_CONFIG_KEY, value: JSON.stringify(trimmed) },
      });
    })
    .catch((err) => {
      fastify.log.error('saveTasks error:', err);
    });
  await writeChain;
}

async function loadStaffDirectoryCached(fastify: FastifyInstance): Promise<MosChatStaffMember[]> {
  const nowMs = Date.now();
  if (memoryStaffCache && nowMs - memoryStaffCache.fetchedAt < STAFF_DIRECTORY_CACHE_TTL_MS) {
    return memoryStaffCache.staffDirectory;
  }
  const [rawStaff, activeTeamMembers] = await Promise.all([
    fastify.prisma.crm.crmStaff.findMany({
      where: { isActive: true },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        avatarUrl: true,
        lastActiveAt: true,
        legacyStaffId: true,
      },
      orderBy: { displayName: 'asc' },
      take: 250,
    }),
    fastify.prisma.crm.crmTeamMember
      .findMany({
        where: { isActive: true },
        select: {
          crmStaffId: true,
          legacyStaffId: true,
          team: {
            select: {
              code: true,
              department: { select: { code: true } },
            },
          },
        },
      })
      .catch(() => []),
  ]);

  // Fallback to legacy user_profile avatar for staff who haven't uploaded a custom CRM avatar yet
  const legacyAvatarMap = new Map<number, string>();
  const candidateLegacyIds = rawStaff
    .filter((s) => !s.avatarUrl && s.legacyStaffId && Number(s.legacyStaffId) > 0)
    .map((s) => Number(s.legacyStaffId));

  if (candidateLegacyIds.length > 0 && fastify.prisma?.legacy?.$queryRawUnsafe) {
    try {
      const legacyProfiles = await fastify.prisma.legacy.$queryRawUnsafe<
        Array<{ user_id: number | string; avatarUrl: string | null }>
      >(
        `SELECT user_id, COALESCE(NULLIF(avatar, ''), NULLIF(avatar_internal, '')) as avatarUrl
         FROM \`user_profile\`
         WHERE user_id IN (${candidateLegacyIds.join(',')})`
      );
      for (const p of legacyProfiles || []) {
        const uid = Number(p.user_id);
        const rawUrl = String(p.avatarUrl || '').trim();
        if (uid > 0 && rawUrl) {
          const normalizedUrl =
            rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('/api/')
              ? rawUrl.replace(/^https?:\/\/(s|api|www)?\.?wingslashes\.com/, 'https://cdn.wingslashes.com')
              : `https://cdn.wingslashes.com/${rawUrl.replace(/^\/+/, '')}`;
          legacyAvatarMap.set(uid, normalizedUrl);
        }
      }
    } catch {
      // ignore legacy avatar lookup failure in test/offline mode
    }
  }

  const staffDirectory: MosChatStaffMember[] = rawStaff.map((s) => {
    const deptSet = new Set<string>();
    const teamSet = new Set<string>();
    const normalizedRole = String(s.role || '')
      .toLowerCase()
      .trim();

    if (['super_admin', 'admin', 'boss', 'manager', 'fm', 'cho'].includes(normalizedRole)) {
      deptSet.add('BACK_OFFICE');
      teamSet.add('ADMIN_MANAGER');
    } else if (['cc', 'coca', 'consultant'].includes(normalizedRole)) {
      deptSet.add('SHOP');
      teamSet.add('CC');
    } else if (['cv', 'lt', 'technician', 'ktv'].includes(normalizedRole)) {
      deptSet.add('SHOP');
      teamSet.add('CV');
    } else if (['telesales', 'booker', 'oc', 'ls'].includes(normalizedRole)) {
      deptSet.add('GROWTH');
      teamSet.add('BK_TELESALES');
    } else if (['teacher', 'ht'].includes(normalizedRole)) {
      deptSet.add('ACADEMY');
      teamSet.add('ACADEMY');
    } else if (['qa_qc'].includes(normalizedRole)) {
      deptSet.add('SHOP');
      teamSet.add('QA_QC');
    } else {
      deptSet.add('BACK_OFFICE');
      teamSet.add('BACK_OFFICE_STAFF');
    }

    for (const tm of activeTeamMembers) {
      const matched =
        tm.crmStaffId === s.id ||
        (s.legacyStaffId && tm.legacyStaffId && Number(tm.legacyStaffId) === Number(s.legacyStaffId));
      if (!matched) continue;
      const tCode = String(tm.team?.code || '')
        .toUpperCase()
        .trim();
      const dCode = String(tm.team?.department?.code || '')
        .toUpperCase()
        .trim();
      if (dCode) deptSet.add(dCode);
      if (tCode) {
        teamSet.add(tCode);
        if (tCode.startsWith('QA_QC')) teamSet.add('QA_QC');
        if (tCode === 'BK' || tCode === 'BK_TELESALES') teamSet.add('BK_TELESALES');
        if (tCode === 'BK_CS' || tCode === 'BK_CONTROL') teamSet.add('BK_CS_CONTROL');
        if (tCode === 'ACADEMY' || tCode === 'MARKETING_SALES') teamSet.add('ACADEMY');
      }
    }

    const fallbackLegacyAvatar = s.legacyStaffId ? legacyAvatarMap.get(Number(s.legacyStaffId)) || null : null;

    return {
      id: s.id,
      username: s.username,
      displayName: s.displayName || s.username,
      role: s.role,
      avatarUrl: s.avatarUrl || fallbackLegacyAvatar,
      isOnline: Boolean(s.lastActiveAt && nowMs - new Date(s.lastActiveAt).getTime() < 10 * 60 * 1000),
      departmentCodes: Array.from(deptSet),
      teamCodes: Array.from(teamSet),
    };
  });
  memoryStaffCache = {
    staffDirectory,
    fetchedAt: nowMs,
  };
  return staffDirectory;
}

export async function mosChatRoutes(fastify: FastifyInstance) {
  // GET /api/chat/bootstrap
  fastify.get(
    '/chat/bootstrap',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const query = (request.query || {}) as { sinceVersion?: string };
        const clientVersion = Number(query.sinceVersion) || 0;

        const state = await loadChatState(fastify);
        const { conversations, tasks, accessConfig, userPrefsByUserKey } = state;
        const missionMutated = await ChatMissionBridgeService.syncLinkedMissionsIntoChatState(
          fastify,
          conversations,
          tasks
        );
        if (missionMutated) {
          await Promise.all([saveConversations(fastify, conversations), saveTasks(fastify, tasks)]);
        }
        const version = memoryChatCache?.version || state.version;

        const staffDirectory = await loadStaffDirectoryCached(fastify);
        const canAccessChat = evaluateCanUserAccessMosChat(user, staffDirectory, accessConfig);
        const userPrefKey = resolveUserPrefKey(user, staffDirectory);
        const userPrefs = userPrefsByUserKey[userPrefKey] || buildDefaultUserSidebarPrefs();

        // Zero-DB, Zero-Payload Short-Circuit when nothing changed!
        if (!missionMutated && clientVersion > 0 && clientVersion === version) {
          return {
            version,
            unchanged: true,
            conversations: [],
            tasks: [],
            staffDirectory: [],
            accessConfig,
            canAccessChat,
            userPrefs,
          } satisfies MosChatBootstrapResponse;
        }

        const userConversations = filterAndFormatConversationsForUser(conversations, user, staffDirectory, userPrefs);
        const userTasks = filterTasksForUser(tasks, conversations, user, staffDirectory);

        const payload: MosChatBootstrapResponse = {
          version,
          unchanged: false,
          conversations: userConversations,
          tasks: userTasks,
          staffDirectory,
          accessConfig,
          canAccessChat,
          userPrefs,
        };
        return payload;
      } catch (err: SafeAny) {
        fastify.log.error('Chat bootstrap error:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể tải dữ liệu mOS Chat' });
      }
    }
  );

  // PUT /api/chat/user-prefs (Personal Sidebar Customization for any authenticated user)
  fastify.put(
    '/chat/user-prefs',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const staffDirectory = await loadStaffDirectoryCached(fastify);
        const userPrefKey = resolveUserPrefKey(user, staffDirectory);
        const body = (request.body || {}) as Partial<MosChatUserSidebarPrefs>;
        const { userPrefsByUserKey } = await loadChatState(fastify);
        const current = userPrefsByUserKey[userPrefKey] || buildDefaultUserSidebarPrefs();
        const saved = await saveUserSidebarPrefs(fastify, userPrefKey, {
          ...current,
          ...body,
          updatedAt: new Date().toISOString(),
        });
        return {
          success: true,
          userPrefs: saved,
        };
      } catch (err: SafeAny) {
        fastify.log.error('Update chat user prefs error:', err);
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', message: 'Không thể lưu tuỳ chỉnh cá nhân mOS Chat' });
      }
    }
  );

  // GET /api/chat/access-config
  fastify.get(
    '/chat/access-config',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const { accessConfig } = await loadChatState(fastify);
        const staffDirectory = await loadStaffDirectoryCached(fastify);
        const canAccessChat = evaluateCanUserAccessMosChat(user, staffDirectory, accessConfig);
        return {
          success: true,
          accessConfig,
          canAccessChat,
        };
      } catch (err: SafeAny) {
        fastify.log.error('Get chat access config error:', err);
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', message: 'Không thể tải cấu hình truy cập mOS Chat' });
      }
    }
  );

  // PUT /api/chat/access-config
  fastify.put(
    '/chat/access-config',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        if (!isDannyOrSuperAdminUser(user)) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Chỉ quản trị viên cấp cao (Danny / Admin) mới được phép thay đổi phân quyền truy cập mOS Chat.',
          });
        }
        const body = (request.body || {}) as UpdateMosChatAccessConfigRequest;
        const { accessConfig: current } = await loadChatState(fastify);

        const nextConfig: MosChatAccessConfig = normalizeAccessConfig({
          ...current,
          allowAllStaff: body.allowAllStaff !== undefined ? Boolean(body.allowAllStaff) : current.allowAllStaff,
          allowedGroupKeys: body.allowedGroupKeys !== undefined ? body.allowedGroupKeys : current.allowedGroupKeys,
          allowedStaffIds: body.allowedStaffIds !== undefined ? body.allowedStaffIds : current.allowedStaffIds,
          aiCopilotAllowedGroupKeys:
            body.aiCopilotAllowedGroupKeys !== undefined
              ? body.aiCopilotAllowedGroupKeys
              : current.aiCopilotAllowedGroupKeys,
          aiCopilotAllowedStaffIds:
            body.aiCopilotAllowedStaffIds !== undefined
              ? body.aiCopilotAllowedStaffIds
              : current.aiCopilotAllowedStaffIds,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.displayName || user?.username || 'Danny',
        });

        const saved = await saveAccessConfig(fastify, nextConfig);
        return {
          success: true,
          accessConfig: saved,
        };
      } catch (err: SafeAny) {
        fastify.log.error('Update chat access config error:', err);
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', message: 'Không thể lưu cấu hình phân quyền mOS Chat' });
      }
    }
  );

  // POST /api/chat/upload-image
  fastify.post(
    '/chat/upload-image',
    {
      preHandler: [requireAuth],
      bodyLimit: CHAT_IMAGE_BODY_LIMIT,
    },
    async (request, reply) => {
      try {
        const body = request.body as UploadMosChatImageRequest;
        const buffer = decodeAndValidateChatImage(body);
        const ext = CHAT_MIME_EXTENSIONS[body.mimeType];
        const fileUuid = crypto.randomUUID();
        const fileName = `${fileUuid}.${ext}`;
        const rootDir = mosChatMediaRoot();
        await mkdir(rootDir, { recursive: true, mode: 0o700 });
        const targetPath = resolve(rootDir, fileName);
        if (!targetPath.startsWith(`${rootDir}${sep}`)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'Đường dẫn tệp không hợp lệ.' });
        }
        await writeFile(targetPath, buffer, { flag: 'wx', mode: 0o600 });

        const attachment: MosChatImageAttachment = {
          id: `att-${fileUuid.slice(0, 8)}`,
          url: `/api/chat/media/${fileName}`,
          name: String(body.fileName || `chat-image.${ext}`).slice(0, 120),
          mimeType: body.mimeType,
          sizeBytes: buffer.length,
          width: body.width ? Number(body.width) : undefined,
          height: body.height ? Number(body.height) : undefined,
          source: body.source || 'upload',
        };
        const response: UploadMosChatImageResponse = {
          success: true,
          attachment,
        };
        return response;
      } catch (err: SafeAny) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: err?.message || 'Không thể tải ảnh lên.',
        });
      }
    }
  );

  // GET /api/chat/media/:fileName
  fastify.get('/chat/media/:fileName', async (request, reply) => {
    try {
      const { fileName } = request.params as { fileName: string };
      const normalized = String(fileName || '').trim();
      const match = normalized.match(/^([a-f0-9-]{36})\.(jpg|png|webp|gif)$/);
      if (!match) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy ảnh.' });
      }
      const ext = match[2];
      const mimeType = EXT_TO_CHAT_MIME[ext] || 'image/png';
      const rootDir = mosChatMediaRoot();
      const targetPath = resolve(rootDir, normalized);
      if (!targetPath.startsWith(`${rootDir}${sep}`)) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy ảnh.' });
      }
      const buffer = await readFile(targetPath);
      reply.header('Content-Type', mimeType);
      reply.header('Cache-Control', 'public, max-age=31536000, immutable');
      return reply.send(buffer);
    } catch (_) {
      return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy ảnh.' });
    }
  });

  // POST /api/chat/messages
  fastify.post(
    '/chat/messages',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const body = request.body as CreateMosChatMessageRequest;
      const text = String(body?.text || '').trim();
      const attachments = sanitizeChatAttachments(body?.attachments);
      if (!body?.conversationId || (!text && !body?.customerCard && attachments.length === 0)) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu nội dung tin nhắn hoặc hình ảnh' });
      }

      const [{ conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      const conv = conversations.find((c) => c.id === body.conversationId);
      if (!conv) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy cuộc hội thoại' });
      }
      if (!canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Tin nhắn trực tiếp (Direct Message) chỉ hiển thị cho 2 người tham gia.',
        });
      }

      const staffRecord = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: Number(user.id) || 0 },
        select: { displayName: true, username: true, role: true, avatarUrl: true },
      });

      const senderName = staffRecord?.displayName || user.username || 'mOS User';
      const roleInfo = getRoleDisplayLabel(staffRecord?.role || user.role);
      const now = new Date();

      const fallbackText =
        text ||
        (body.customerCard?.name ? `Đính kèm hồ sơ ${body.customerCard.name}` : attachments.length > 0 ? '' : '');

      const isAiBot = Boolean(body.isAiBot);
      const newMessage = {
        id: `msg-${crypto.randomUUID().slice(0, 8)}`,
        conversationId: conv.id,
        senderId: isAiBot ? 'wings-ai-copilot' : user.id,
        senderName: isAiBot ? '🤖 Wings AI Copilot' : senderName,
        senderRole: isAiBot ? 'AI Copilot' : roleInfo.label,
        senderAvatar: isAiBot ? 'AI' : staffRecord?.avatarUrl || getInitials(senderName, user.username),
        roleColor: isAiBot ? '#8b5cf6' : roleInfo.color,
        text: fallbackText,
        timeLabel: formatTimeLabel(now),
        createdAt: now.toISOString(),
        reactions: {},
        customerCard: body.customerCard || null,
        attachments: attachments.length > 0 ? attachments : undefined,
        thread: [],
        isAiBot: isAiBot || undefined,
        aiThinking: body.aiThinking ? String(body.aiThinking).slice(0, 4000) : null,
        aiAction: body.aiAction || null,
      };

      conv.messages.push(newMessage);
      conv.updatedAt = now.toISOString();
      await saveConversations(fastify, conversations);

      // Advance sender's read count for this conversation in userPrefs
      const userPrefKey = resolveUserPrefKey(user, staffDirectory);
      const { userPrefsByUserKey } = await loadChatState(fastify);
      const currentSenderPrefs = userPrefsByUserKey[userPrefKey] || buildDefaultUserSidebarPrefs();
      const updatedSenderPrefs = {
        ...currentSenderPrefs,
        manualUnreadIds: (currentSenderPrefs.manualUnreadIds || []).filter((id) => id !== conv.id),
        readMessageCountByConv: {
          ...(currentSenderPrefs.readMessageCountByConv || {}),
          [conv.id]: conv.messages.length,
        },
      };
      await saveUserSidebarPrefs(fastify, userPrefKey, updatedSenderPrefs);

      return {
        success: true,
        message: newMessage,
        conversation: formatConversationForUser(conv, user, staffDirectory, updatedSenderPrefs),
      };
    }
  );

  // POST /api/chat/threads
  fastify.post(
    '/chat/threads',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const body = request.body as CreateMosChatThreadReplyRequest;
      const text = String(body?.text || '').trim();
      const attachments = sanitizeChatAttachments(body?.attachments);
      if (!body?.conversationId || !body?.messageId || (!text && attachments.length === 0)) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu nội dung phản hồi luồng' });
      }

      const [{ conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      const conv = conversations.find((c) => c.id === body.conversationId);
      const msg = conv?.messages.find((m) => m.id === body.messageId);
      if (!conv || !msg) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy tin nhắn gốc' });
      }
      if (!canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Tin nhắn trực tiếp (Direct Message) chỉ hiển thị cho 2 người tham gia.',
        });
      }

      const staffRecord = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: Number(user.id) || 0 },
        select: { displayName: true, username: true, role: true, avatarUrl: true },
      });
      const senderName = staffRecord?.displayName || user.username || 'mOS User';
      const roleInfo = getRoleDisplayLabel(staffRecord?.role || user.role);
      const now = new Date();

      msg.thread = msg.thread || [];
      const replyItem = {
        id: `th-${crypto.randomUUID().slice(0, 8)}`,
        senderId: user.id,
        senderName,
        senderRole: roleInfo.label,
        senderAvatar: staffRecord?.avatarUrl || getInitials(senderName, user.username),
        text,
        attachments: attachments.length > 0 ? attachments : undefined,
        timeLabel: formatTimeLabel(now),
        createdAt: now.toISOString(),
      };
      msg.thread.push(replyItem);
      conv.updatedAt = now.toISOString();

      if (msg.missionId) {
        await ChatMissionBridgeService.syncChatReplyToMission(fastify, user, msg, replyItem, mosChatMediaRoot());
      }

      await saveConversations(fastify, conversations);
      return { success: true, reply: replyItem, message: msg };
    }
  );

  // POST /api/chat/messages/:messageId/reaction
  fastify.post(
    '/chat/messages/:messageId/reaction',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = (request as SafeAny).user as JwtUserPayload | undefined;
      const userKey = String(user?.id ?? 'me');
      const { messageId } = request.params as { messageId: string };
      const { conversationId, emoji } = request.body as { conversationId: string; emoji: string };
      const [{ conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      const conv = conversations.find((c) => c.id === conversationId);
      const msg = conv?.messages.find((m) => m.id === messageId);
      if (!conv || !msg) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy tin nhắn' });
      }
      if (!canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Tin nhắn trực tiếp (Direct Message) chỉ hiển thị cho 2 người tham gia.',
        });
      }
      msg.reactions = msg.reactions || {};
      msg.reactionUsers = msg.reactionUsers || {};

      const existingUsers = msg.reactionUsers[emoji];
      const currentCount = msg.reactions[emoji] || 0;

      if (Array.isArray(existingUsers)) {
        const normalized = existingUsers.map(String);
        if (normalized.includes(userKey)) {
          const remaining = normalized.filter((u) => u !== userKey);
          if (remaining.length === 0) {
            delete msg.reactions[emoji];
            delete msg.reactionUsers[emoji];
          } else {
            msg.reactionUsers[emoji] = remaining;
            msg.reactions[emoji] = remaining.length;
          }
        } else {
          const updated = [...normalized, userKey];
          msg.reactionUsers[emoji] = updated;
          msg.reactions[emoji] = updated.length;
        }
      } else if (currentCount > 0) {
        // Legacy reaction without per-user tracking (e.g. inflated count): clicking undoes/clears it
        delete msg.reactions[emoji];
        delete msg.reactionUsers[emoji];
      } else {
        msg.reactionUsers[emoji] = [userKey];
        msg.reactions[emoji] = 1;
      }

      await saveConversations(fastify, conversations);
      return { success: true, reactions: msg.reactions, reactionUsers: msg.reactionUsers };
    }
  );

  // POST /api/chat/messages/:messageId/pin
  fastify.post(
    '/chat/messages/:messageId/pin',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = (request as SafeAny).user as JwtUserPayload | undefined;
      const { messageId } = request.params as { messageId: string };
      const { conversationId } = request.body as { conversationId: string };
      const [{ conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      const conv = conversations.find((c) => c.id === conversationId);
      const msg = conv?.messages.find((m) => m.id === messageId);
      if (!conv || !msg) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy tin nhắn' });
      }
      if (!canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Tin nhắn trực tiếp (Direct Message) chỉ hiển thị cho 2 người tham gia.',
        });
      }
      msg.pinned = !msg.pinned;
      await saveConversations(fastify, conversations);
      return { success: true, pinned: msg.pinned };
    }
  );

  // PUT /api/chat/messages/:messageId (Edit message with audit history)
  fastify.put(
    '/chat/messages/:messageId',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const { messageId } = request.params as { messageId: string };
      const body = request.body as EditMosChatMessageRequest;
      const conversationId = String(body?.conversationId || '').trim();
      const newText = String(body?.text || '').trim();
      const replyId = body?.replyId ? String(body.replyId).trim() : undefined;

      if (!conversationId) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu conversationId' });
      }

      const [{ conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      const conv = conversations.find((c) => c.id === conversationId);
      const msg = conv?.messages.find((m) => m.id === messageId);
      if (!conv || !msg) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy tin nhắn' });
      }
      if (!canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Tin nhắn trực tiếp (Direct Message) chỉ hiển thị cho 2 người tham gia.',
        });
      }

      // Check if target is thread reply or root message
      const targetItem = replyId ? msg.thread?.find((r) => r.id === replyId) : msg;
      if (!targetItem) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy câu trả lời trong luồng' });
      }

      if (targetItem.isDeleted) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Không thể chỉnh sửa tin nhắn đã bị xoá' });
      }

      const staffRecord = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: Number(user.id) || 0 },
        select: { displayName: true, username: true, role: true },
      });
      const editorName = staffRecord?.displayName || user.username || 'mOS User';

      const isOwner =
        String(targetItem.senderId) === String(user.id) ||
        (user.id && String(targetItem.senderId) === 'me') ||
        (staffRecord?.displayName && targetItem.senderName === staffRecord.displayName);
      const isAdmin = isDannyOrSuperAdminUser(user);

      if (!isOwner && !isAdmin) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Bạn chỉ có thể chỉnh sửa tin nhắn của chính mình.',
        });
      }

      if (!newText && (!targetItem.attachments || targetItem.attachments.length === 0)) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Nội dung tin nhắn không được để trống' });
      }

      const now = new Date();
      targetItem.editHistory = targetItem.editHistory || [];
      targetItem.editHistory.push({
        text: targetItem.text,
        editedAt: now.toISOString(),
        editedBy: user.id,
        editorName,
      });
      targetItem.text = newText;
      targetItem.editedAt = now.toISOString();
      targetItem.editedBy = user.id;

      conv.updatedAt = now.toISOString();
      await saveConversations(fastify, conversations);
      return { success: true, message: msg, target: targetItem };
    }
  );

  // DELETE /api/chat/messages/:messageId (Soft delete with full history preservation)
  fastify.delete(
    '/chat/messages/:messageId',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const { messageId } = request.params as { messageId: string };
      const body = ((request.body as SafeAny) || {}) as DeleteMosChatMessageRequest;
      const query = ((request.query as SafeAny) || {}) as DeleteMosChatMessageRequest;
      const conversationId = String(body.conversationId || query.conversationId || '').trim();
      const replyId = body.replyId || query.replyId ? String(body.replyId || query.replyId).trim() : undefined;

      if (!conversationId) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu conversationId' });
      }

      const [{ conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      const conv = conversations.find((c) => c.id === conversationId);
      const msg = conv?.messages.find((m) => m.id === messageId);
      if (!conv || !msg) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy tin nhắn' });
      }
      if (!canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Tin nhắn trực tiếp (Direct Message) chỉ hiển thị cho 2 người tham gia.',
        });
      }

      const targetItem = replyId ? msg.thread?.find((r) => r.id === replyId) : msg;
      if (!targetItem) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy câu trả lời trong luồng' });
      }

      const staffRecord = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: Number(user.id) || 0 },
        select: { displayName: true, username: true, role: true },
      });
      const deleterName = staffRecord?.displayName || user.username || 'mOS User';

      const isOwner =
        String(targetItem.senderId) === String(user.id) ||
        (user.id && String(targetItem.senderId) === 'me') ||
        (staffRecord?.displayName && targetItem.senderName === staffRecord.displayName);
      const isAdmin = isDannyOrSuperAdminUser(user);

      if (!isOwner && !isAdmin) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Bạn chỉ có thể xoá tin nhắn của chính mình.',
        });
      }

      const now = new Date();
      if (!targetItem.isDeleted) {
        targetItem.originalText = targetItem.originalText || targetItem.text;
        targetItem.editHistory = targetItem.editHistory || [];
        targetItem.isDeleted = true;
        targetItem.deletedAt = now.toISOString();
        targetItem.deletedBy = user.id;
        targetItem.deletedByName = deleterName;
      }

      conv.updatedAt = now.toISOString();
      await saveConversations(fastify, conversations);
      return { success: true, message: msg, target: targetItem };
    }
  );

  // POST /api/chat/tasks (Message to Task -> Reminder)
  fastify.post(
    '/chat/tasks',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const body = request.body as CreateMosChatTaskRequest;
      const title = String(body?.title || '').trim();
      if (!body?.conversationId || !title) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu tiêu đề công việc' });
      }

      const [{ conversations, tasks }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      const conv = conversations.find((c) => c.id === body.conversationId);
      if (!conv) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy cuộc hội thoại' });
      }
      if (!canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Tin nhắn trực tiếp (Direct Message) chỉ hiển thị cho 2 người tham gia.',
        });
      }

      const rawAssigneeName = String(body.assigneeName || '').trim();
      const rawAssigneeId = Number(body.assigneeId) || 0;
      if (!rawAssigneeName && rawAssigneeId <= 0) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Vui lòng chọn Người phụ trách từ danh sách nhân sự đang hoạt động.',
        });
      }

      const normAssignee = rawAssigneeName.toLowerCase();
      const matchedAssignee = staffDirectory.find(
        (s) =>
          (rawAssigneeId > 0 && s.id === rawAssigneeId) ||
          (normAssignee &&
            (String(s.displayName || '')
              .trim()
              .toLowerCase() === normAssignee ||
              String(s.username || '')
                .trim()
                .toLowerCase() === normAssignee))
      );
      if (!matchedAssignee) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Người phụ trách không hợp lệ hoặc đã nghỉ việc. Vui lòng chọn nhân sự đang hoạt động.',
        });
      }

      const canonicalAssigneeId = matchedAssignee.id;
      const canonicalAssigneeName = matchedAssignee.displayName || matchedAssignee.username;

      const staffRecord = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: Number(user.id) || 0 },
        select: { displayName: true, username: true, role: true },
      });
      const creatorName = staffRecord?.displayName || user.username || 'Danny Do';
      const roleInfo = getRoleDisplayLabel(staffRecord?.role || user.role);
      const now = new Date();

      const hasExplicitRemindAt = Boolean(body.remindAt && !isNaN(new Date(body.remindAt).getTime()));
      const remindSecNum = body.remindInSeconds !== undefined ? Number(body.remindInSeconds) : 0;
      const isNoReminder = !hasExplicitRemindAt && remindSecNum <= 0;

      let remindAtDate: Date;
      if (hasExplicitRemindAt) {
        remindAtDate = new Date(body.remindAt!);
      } else if (remindSecNum > 0) {
        remindAtDate = new Date(now.getTime() + Math.max(60, remindSecNum) * 1000);
      } else {
        remindAtDate = now;
      }

      const normTitle = normalizeTaskTitleKey(title);
      const existingTaskIdx = tasks.findIndex(
        (t) =>
          t.conversationId === conv.id &&
          ((body.sourceMessageId && t.sourceMessageId === body.sourceMessageId) ||
            (normTitle && normalizeTaskTitleKey(t.title) === normTitle))
      );

      if (existingTaskIdx >= 0) {
        const existingTask = tasks[existingTaskIdx];
        existingTask.title = title;
        existingTask.assigneeId = canonicalAssigneeId;
        existingTask.assigneeName = canonicalAssigneeName;
        existingTask.priority = body.priority || existingTask.priority || 'HIGH';
        existingTask.remindAt = remindAtDate.toISOString();
        existingTask.done = false;
        existingTask.fired = isNoReminder;

        if (body.sourceMessageId) {
          existingTask.sourceMessageId = body.sourceMessageId;
        }
        if (existingTask.sourceMessageId) {
          const sourceMsg = conv.messages.find((m) => m.id === existingTask.sourceMessageId);
          if (sourceMsg) {
            sourceMsg.taskId = existingTask.id;
            existingTask.sourceAuthorName = sourceMsg.senderName;
          }
        }

        tasks.splice(existingTaskIdx, 1);
        tasks.unshift(existingTask);
        await Promise.all([saveConversations(fastify, conversations), saveTasks(fastify, tasks)]);

        return {
          success: true,
          task: existingTask,
          conversation: formatConversationForUser(conv, user, staffDirectory),
        };
      }

      const taskId = `task-${crypto.randomUUID().slice(0, 8)}`;
      let targetMsgId = body.sourceMessageId || null;
      let sourceAuthorName = creatorName;

      if (targetMsgId) {
        const sourceMsg = conv.messages.find((m) => m.id === targetMsgId);
        if (sourceMsg) {
          sourceMsg.taskId = taskId;
          sourceAuthorName = sourceMsg.senderName;
        }
      } else {
        targetMsgId = `msg-task-${crypto.randomUUID().slice(0, 8)}`;
        conv.messages.push({
          id: targetMsgId,
          conversationId: conv.id,
          senderId: user.id,
          senderName: creatorName,
          senderRole: roleInfo.label,
          senderAvatar: getInitials(creatorName, user.username),
          roleColor: roleInfo.color,
          text: `Giao việc cho ${canonicalAssigneeName}:`,
          timeLabel: formatTimeLabel(now),
          createdAt: now.toISOString(),
          taskId,
          reactions: {},
          thread: [],
        });
      }

      const newTask: MosChatTaskItem = {
        id: taskId,
        conversationId: conv.id,
        conversationName: conv.name,
        sourceMessageId: targetMsgId,
        sourceAuthorName,
        title,
        assigneeId: canonicalAssigneeId,
        assigneeName: canonicalAssigneeName,
        creatorName,
        priority: body.priority || 'HIGH',
        remindAt: remindAtDate.toISOString(),
        done: false,
        fired: isNoReminder,
        createdAt: now.toISOString(),
      };

      tasks.unshift(newTask);
      await Promise.all([saveConversations(fastify, conversations), saveTasks(fastify, tasks)]);

      return {
        success: true,
        task: newTask,
        conversation: formatConversationForUser(conv, user, staffDirectory),
      };
    }
  );

  // PATCH /api/chat/tasks/:taskId
  fastify.patch(
    '/chat/tasks/:taskId',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { taskId } = request.params as { taskId: string };
      const body = request.body as {
        done?: boolean;
        snoozeSeconds?: number;
        triggerReminderNow?: boolean;
      };

      const { tasks } = await loadChatState(fastify);
      const task = tasks.find((t) => t.id === taskId);
      if (!task) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy công việc' });
      }

      const now = new Date();
      if (typeof body.done === 'boolean') {
        task.done = body.done;
      }
      if (typeof body.snoozeSeconds === 'number' && body.snoozeSeconds > 0) {
        task.remindAt = new Date(now.getTime() + body.snoozeSeconds * 1000).toISOString();
        task.fired = false;
        task.done = false;
      }
      if (body.triggerReminderNow && !task.fired) {
        task.fired = true;
        task.remindAt = now.toISOString();
      }

      await saveTasks(fastify, tasks);
      return { success: true, task };
    }
  );

  // POST /api/chat/conversations
  fastify.post(
    '/chat/conversations',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const body = request.body as CreateMosChatConversationRequest;
      const rawName = String(body?.name || '').trim();
      const [{ conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      const myStaffId = resolveUserStaffId(user, staffDirectory);
      const now = new Date();

      // 1. Self Chat ("Chat với chính tôi" / Ghi chú cá nhân)
      if (body.isSelf || (body.type === 'dm' && Number(body.participantStaffId) === myStaffId && myStaffId > 0)) {
        const selfOwnerId = myStaffId || Number(user.id) || 0;
        const selfId = `dm-self-${selfOwnerId}`;
        const existingSelf = conversations.find(
          (c) => c.id === selfId || (c.type === 'dm' && c.isSelf && Number(c.participantStaffId) === selfOwnerId)
        );
        if (existingSelf) {
          return {
            success: true,
            conversation: formatConversationForUser(existingSelf, user, staffDirectory),
          };
        }
        const selfStaff = await fastify.prisma.crm.crmStaff.findUnique({
          where: { id: selfOwnerId },
          select: { id: true, displayName: true, username: true, role: true, avatarUrl: true },
        });
        const displayName = selfStaff?.displayName || user.username || 'Tôi';
        const selfConv: MosChatConversation = {
          id: selfId,
          type: 'dm',
          name: `${displayName} (Ghi chú cho tôi)`,
          subtitle: 'Không gian lưu trữ ghi chú, hình ảnh & task cá nhân',
          roleTag: 'Cá nhân',
          color: '#6366f1',
          avatar: 'ME',
          isSelf: true,
          participantStaffId: selfOwnerId,
          memberIds: selfOwnerId > 0 ? [selfOwnerId] : [],
          memberCount: 1,
          unreadCount: 0,
          updatedAt: now.toISOString(),
          messages: [
            {
              id: `msg-${crypto.randomUUID().slice(0, 8)}`,
              conversationId: selfId,
              senderId: user.id,
              senderName: 'Hệ thống mOS',
              senderRole: 'Trợ lý cá nhân',
              senderAvatar: '📌',
              roleColor: '#6366f1',
              text: 'Chào mừng bạn đến với không gian cá nhân! Bạn có thể lưu trữ ghi chú, dán hình ảnh, gửi tài liệu và tạo task nhắc hẹn cho chính mình tại đây.',
              timeLabel: formatTimeLabel(now),
              createdAt: now.toISOString(),
              reactions: {},
              thread: [],
              isSystemReminder: true,
            },
          ],
        };
        conversations.unshift(selfConv);
        await saveConversations(fastify, conversations);
        return {
          success: true,
          conversation: formatConversationForUser(selfConv, user, staffDirectory),
        };
      }

      if (!rawName) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu tên cuộc trò chuyện' });
      }

      // 2. Direct 1-1 Chat between strictly 2 participants: [myStaffId, peerStaffId]
      if (body.type === 'dm') {
        let peerStaffId = Number(body.participantStaffId) || 0;
        if (peerStaffId <= 0 && rawName) {
          const matchedPeer = staffDirectory.find(
            (s) =>
              String(s.displayName || '')
                .toLowerCase()
                .trim() === rawName.toLowerCase() ||
              String(s.username || '')
                .toLowerCase()
                .trim() === rawName.toLowerCase()
          );
          if (matchedPeer) peerStaffId = matchedPeer.id;
        }
        if (myStaffId <= 0 || peerStaffId <= 0) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Cần xác định rõ 2 thành viên tham gia cuộc trò chuyện trực tiếp 1-1.',
          });
        }
        const pairIds = [Math.min(myStaffId, peerStaffId), Math.max(myStaffId, peerStaffId)];
        const existingDm = conversations.find((c) => {
          if (c.type !== 'dm' || c.isSelf) return false;
          const cIds = resolveDmParticipantIds(c, staffDirectory);
          return cIds.length === 2 && cIds.includes(myStaffId) && cIds.includes(peerStaffId);
        });
        if (existingDm) {
          existingDm.memberIds = pairIds;
          existingDm.memberCount = 2;
          await saveConversations(fastify, conversations);
          return {
            success: true,
            conversation: formatConversationForUser(existingDm, user, staffDirectory),
          };
        }

        const peerStaff = staffDirectory.find((s) => s.id === peerStaffId);
        const peerRole = peerStaff ? getRoleDisplayLabel(peerStaff.role) : { label: '1-1', color: '#10b981' };
        const dmConv: MosChatConversation = {
          id: `dm-pair-${pairIds[0]}-${pairIds[1]}`,
          type: 'dm',
          name: peerStaff?.displayName || rawName,
          subtitle: body.subtitle || peerRole.label || 'Trò chuyện trực tiếp 1-1',
          roleTag: peerRole.label || '1-1',
          color: peerRole.color || '#10b981',
          avatar: peerStaff?.avatarUrl || getInitials(peerStaff?.displayName || rawName, peerStaff?.username),
          memberCount: 2,
          participantStaffId: peerStaffId,
          memberIds: pairIds,
          unreadCount: 0,
          updatedAt: now.toISOString(),
          messages: [],
        };

        conversations.unshift(dmConv);
        await saveConversations(fastify, conversations);
        return {
          success: true,
          conversation: formatConversationForUser(dmConv, user, staffDirectory),
        };
      }

      const id = `space-${crypto.randomUUID().slice(0, 8)}`;
      const normalizedName = rawName.toLowerCase().replace(/\s+/g, '-');

      // Collect initial member IDs for Space
      let initialMemberIds: number[] = [];
      let initialMembers: MosChatStaffMember[] = [];
      const set = new Set<number>();
      if (myStaffId > 0) set.add(myStaffId);
      if (Array.isArray(body.memberIds)) {
        body.memberIds.forEach((mId) => {
          const num = Number(mId);
          if (num > 0) set.add(num);
        });
      }
      initialMemberIds = Array.from(set);
      if (initialMemberIds.length > 0) {
        const staffRows = await fastify.prisma.crm.crmStaff.findMany({
          where: { id: { in: initialMemberIds } },
          select: { id: true, username: true, displayName: true, role: true, avatarUrl: true },
        });
        initialMembers = staffRows.map((s) => ({
          id: s.id,
          username: s.username,
          displayName: s.displayName || s.username,
          role: s.role,
          avatarUrl: s.avatarUrl,
          isOnline: true,
        }));
      }

      const newConv: MosChatConversation = {
        id,
        type: 'space',
        name: normalizedName,
        subtitle: body.subtitle || 'Không gian phối hợp trên mOS',
        roleTag: String(initialMemberIds.length || 1),
        color: '#3b82f6',
        avatar: getInitials(rawName, user.username),
        memberCount: Math.max(1, initialMemberIds.length),
        memberIds: initialMemberIds,
        members: initialMembers,
        unreadCount: 0,
        updatedAt: now.toISOString(),
        messages: [],
      };

      conversations.unshift(newConv);
      await saveConversations(fastify, conversations);
      return { success: true, conversation: newConv };
    }
  );

  // POST /api/chat/conversations/:id/read (Explicitly mark conversation as read)
  fastify.post(
    '/chat/conversations/:id/read',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const convId = (request.params as { id: string }).id;
        const state = await loadChatState(fastify);
        const { conversations, userPrefsByUserKey } = state;
        const staffDirectory = await loadStaffDirectoryCached(fastify);
        const targetConv = conversations.find((c) => c.id === convId);
        if (!targetConv) {
          return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy cuộc trò chuyện' });
        }
        const userPrefKey = resolveUserPrefKey(user, staffDirectory);
        const currentPrefs = userPrefsByUserKey[userPrefKey] || buildDefaultUserSidebarPrefs();
        const updatedPrefs = {
          ...currentPrefs,
          manualUnreadIds: (currentPrefs.manualUnreadIds || []).filter((id) => id !== convId),
          readMessageCountByConv: {
            ...(currentPrefs.readMessageCountByConv || {}),
            [convId]: targetConv.messages?.length || 0,
          },
        };
        const saved = await saveUserSidebarPrefs(fastify, userPrefKey, updatedPrefs);
        return {
          success: true,
          unreadCount: 0,
          userPrefs: saved,
        };
      } catch (err: SafeAny) {
        fastify.log.error('Mark conversation as read error:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể đánh dấu đã đọc' });
      }
    }
  );

  // POST /api/chat/conversations/:id/members (Add member or bulk department/team members to space)
  fastify.post(
    '/chat/conversations/:id/members',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const { id } = request.params as { id: string };
      const body = request.body as { staffId?: number; staffIds?: number[] };
      const candidateIds = Array.isArray(body?.staffIds)
        ? body.staffIds.map((n) => Number(n)).filter((n) => n > 0)
        : body?.staffId
          ? [Number(body.staffId)]
          : [];

      if (candidateIds.length === 0) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu ID nhân sự' });
      }

      const { conversations } = await loadChatState(fastify);
      const conv = conversations.find((c) => c.id === id);
      if (!conv) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy cuộc hội thoại' });
      }

      if (conv.type !== 'space') {
        return reply
          .status(400)
          .send({ error: 'Bad Request', message: 'Chỉ có thể thêm thành viên vào Không gian (Space)' });
      }

      conv.memberIds = conv.memberIds || [];
      conv.members = conv.members || [];
      const newIds = candidateIds.filter((sid) => !conv.memberIds!.includes(sid));
      if (newIds.length === 0) {
        return { success: true, conversation: conv, message: 'Các nhân sự này đã có trong nhóm' };
      }

      const staffList = await fastify.prisma.crm.crmStaff.findMany({
        where: { id: { in: newIds } },
        select: { id: true, username: true, displayName: true, role: true, avatarUrl: true },
      });

      if (staffList.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy nhân sự' });
      }

      for (const staff of staffList) {
        if (!conv.memberIds.includes(staff.id)) {
          conv.memberIds.push(staff.id);
        }
        if (!conv.members.some((m) => m.id === staff.id)) {
          conv.members.push({
            id: staff.id,
            username: staff.username,
            displayName: staff.displayName || staff.username,
            role: staff.role,
            avatarUrl: staff.avatarUrl,
            isOnline: true,
          });
        }
      }
      conv.memberCount = conv.memberIds.length;
      conv.roleTag = String(conv.memberCount);

      const now = new Date();
      const inviterName = user.username || 'Quản trị viên';
      const addedLabel =
        staffList.length === 1
          ? staffList[0].displayName || staffList[0].username
          : `${staffList.length} thành viên (${staffList
              .slice(0, 3)
              .map((s) => s.displayName || s.username)
              .join(', ')}${staffList.length > 3 ? '...' : ''})`;

      conv.messages.push({
        id: `msg-${crypto.randomUUID().slice(0, 8)}`,
        conversationId: conv.id,
        senderId: 'system',
        senderName: 'Hệ thống mOS',
        senderRole: 'Hệ thống',
        senderAvatar: '👥',
        roleColor: '#3b82f6',
        text: `${inviterName} đã thêm ${addedLabel} vào không gian.`,
        timeLabel: formatTimeLabel(now),
        createdAt: now.toISOString(),
        reactions: {},
        thread: [],
        isSystemReminder: true,
      });
      conv.updatedAt = now.toISOString();

      await saveConversations(fastify, conversations);
      return { success: true, conversation: conv };
    }
  );

  // DELETE /api/chat/conversations/:id/members/:staffId (Remove member from space)
  fastify.delete(
    '/chat/conversations/:id/members/:staffId',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const { id, staffId: rawStaffId } = request.params as { id: string; staffId: string };
      const staffId = Number(rawStaffId);

      if (!staffId) {
        return reply.status(400).send({ error: 'Bad Request', message: 'ID nhân sự không hợp lệ' });
      }

      const { conversations } = await loadChatState(fastify);
      const conv = conversations.find((c) => c.id === id);
      if (!conv) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy cuộc hội thoại' });
      }

      if (conv.type !== 'space') {
        return reply
          .status(400)
          .send({ error: 'Bad Request', message: 'Chỉ có thể xóa thành viên khỏi Không gian (Space)' });
      }

      conv.memberIds = conv.memberIds || [];
      const staff = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: staffId },
        select: { id: true, username: true, displayName: true, role: true },
      });

      conv.memberIds = conv.memberIds.filter((mid) => mid !== staffId);
      if (Array.isArray(conv.members)) {
        conv.members = conv.members.filter((m) => m.id !== staffId);
      }
      conv.memberCount = conv.memberIds.length;
      conv.roleTag = String(conv.memberCount);

      const now = new Date();
      const operatorName = user.username || 'Quản trị viên';
      const removedName = staff?.displayName || staff?.username || `ID ${staffId}`;

      conv.messages.push({
        id: `msg-${crypto.randomUUID().slice(0, 8)}`,
        conversationId: conv.id,
        senderId: 'system',
        senderName: 'Hệ thống mOS',
        senderRole: 'Hệ thống',
        senderAvatar: '🚪',
        roleColor: '#ef4444',
        text: `${operatorName} đã xóa ${removedName} khỏi không gian.`,
        timeLabel: formatTimeLabel(now),
        createdAt: now.toISOString(),
        reactions: {},
        thread: [],
        isSystemReminder: true,
      });
      conv.updatedAt = now.toISOString();

      await saveConversations(fastify, conversations);
      return { success: true, conversation: conv };
    }
  );

  // POST /api/chat/missions (1-Click Dispatch from mOS Chat Message/Thread/Task to mOS Mission for AG)
  // Exclusively restricted to Super Admin Danny
  fastify.post(
    '/chat/missions',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = request.user as JwtUserPayload;
        const body = (request.body || {}) as CreateMosChatMissionRequest;
        if (!body.conversationId || (!body.messageId && !body.taskId)) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Thiếu thông tin cuộc trò chuyện hoặc tin nhắn gốc để tạo mOS Mission.',
          });
        }

        const [{ conversations, tasks }, staffDirectory] = await Promise.all([
          loadChatState(fastify),
          loadStaffDirectoryCached(fastify),
        ]);
        const conv = conversations.find((c) => c.id === body.conversationId);
        if (!conv) {
          return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy cuộc hội thoại' });
        }
        if (!canUserAccessConversation(conv, user, staffDirectory)) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Bạn không có quyền truy cập cuộc hội thoại này.',
          });
        }

        const result = await ChatMissionBridgeService.createMissionFromChat(
          fastify,
          user,
          body,
          conversations,
          tasks,
          staffDirectory,
          mosChatMediaRoot()
        );

        await Promise.all([saveConversations(fastify, conversations), saveTasks(fastify, tasks)]);

        return {
          success: true,
          mission: result.mission,
          message: result.message,
          task: result.task,
        };
      } catch (err: SafeAny) {
        fastify.log.error('Create mOS Mission from chat error:', err);
        const statusCode = Number(err?.statusCode) || 400;
        return reply.status(statusCode).send({
          error: statusCode === 403 ? 'Forbidden' : 'Bad Request',
          message: err?.message || 'Không thể giao nhiệm vụ sang mOS Mission.',
        });
      }
    }
  );

  // POST /api/chat/missions/:reportId/action (Inline Super Admin & Reporter actions directly inside mOS Chat)
  fastify.post(
    '/chat/missions/:reportId/action',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = request.user as JwtUserPayload;
        const { reportId: rawReportId } = request.params as { reportId: string };
        const reportId = Number(rawReportId);
        if (!reportId || reportId <= 0) {
          return reply.status(400).send({ error: 'Bad Request', message: 'Mã mOS Mission không hợp lệ.' });
        }

        const body = (request.body || {}) as ActionMosChatMissionRequest;
        if (!body.action) {
          return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu hành động thực thi mOS Mission.' });
        }

        const { conversations, tasks } = await loadChatState(fastify);
        const result = await ChatMissionBridgeService.executeMissionActionFromChat(
          fastify,
          user,
          reportId,
          body,
          conversations,
          tasks
        );

        await Promise.all([saveConversations(fastify, conversations), saveTasks(fastify, tasks)]);

        return {
          success: true,
          mission: result.mission,
          message: result.message,
          statusMessage: result.statusMessage,
          task: result.task,
          systemReply: result.systemReply,
        };
      } catch (err: SafeAny) {
        fastify.log.error('Execute mOS Mission action from chat error:', err);
        const statusCode = Number(err?.statusCode) || 400;
        return reply.status(statusCode).send({
          error: statusCode === 403 ? 'Forbidden' : 'Bad Request',
          message: err?.message || 'Không thể thực thi thao tác trên mOS Mission.',
        });
      }
    }
  );
}
