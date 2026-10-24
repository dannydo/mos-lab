import { FastifyInstance, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve, sep } from 'node:path';
import {
  ActionMosChatMissionRequest,
  ActionMosChatWorkflowInstanceRequest,
  BuzzMosChatMessageRequest,
  BuzzMosChatMessageResponse,
  CreateMosChatConversationRequest,
  CreateMosChatMessageRequest,
  CreateMosChatMissionRequest,
  CreateMosChatTaskRequest,
  CreateMosChatThreadReplyRequest,
  CreateMosChatWorkflowInstanceRequest,
  DeleteMosChatMessageRequest,
  EditMosChatMessageRequest,
  MosChatAccessConfig,
  MosChatBootstrapResponse,
  MosChatBuzzEvent,
  MosChatConversation,
  MosChatCustomSection,
  MosChatImageAttachment,
  MosChatImageMimeType,
  MosChatMessage,
  MosChatReadReceiptEntry,
  MosChatStaffMember,
  MosChatTaskItem,
  MosChatThreadMoveMode,
  MosChatThreadReadReceiptEntry,
  MosChatThreadReply,
  MosChatUserSidebarPrefs,
  MosChatWorkflowInstance,
  MosChatWorkflowStepLog,
  MoveMosChatThreadItemRequest,
  RestoreMosChatMessageRequest,
  SafeAny,
  SaveThreadAsWorkflowTemplateRequest,
  UpdateMosChatAccessConfigRequest,
  UpdateMosChatNicknameRequest,
  UpdateMosChatSpaceConfigRequest,
  UpdateMosChatTaskRequest,
  UploadMosChatImageRequest,
  UploadMosChatImageResponse,
  isCanonicalSuperAdminIdentity,
  removeVietnameseTones,
} from '@mos-lab/shared';
import { requireAuth, JwtUserPayload } from '../../middlewares/auth.js';
import { invalidateNotificationsCache } from '../notifications/routes.js';
import { ChatMissionBridgeService } from './chat-mission-bridge.service.js';
import {
  loadOrMigrateRelationalChatData,
  syncConversationsToRelationalDb,
  syncTasksToRelationalDb,
  syncUserPrefsToRelationalDb,
} from './chat-repository.service.js';
import {
  computeInventoryReconciliation,
  executeWorkflowSystemHook,
  loadWorkflowState,
  saveOrUpgradeWorkflowFromThread,
  saveWorkflowInstances,
} from './chat-workflow.service.js';
import { TelesaleTargetService } from '../kpi/services/telesale-target.service.js';

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
  'image/heic': 'jpg',
  'image/heif': 'jpg',
};

const EXT_TO_CHAT_MIME: Record<string, MosChatImageMimeType> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

const execFileAsync = promisify(execFile);

async function convertHeicToJpegBuffer(heicBuffer: Buffer): Promise<Buffer> {
  const rootDir = mosChatMediaRoot();
  await mkdir(rootDir, { recursive: true, mode: 0o700 });
  const uniqueId = `heic_conv_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const inPath = resolve(rootDir, `${uniqueId}.heic`);
  const outPath = resolve(rootDir, `${uniqueId}.jpg`);

  try {
    await writeFile(inPath, heicBuffer, { mode: 0o600 });

    // 1. Try heif-convert (Linux VPS standard)
    let convertedOk = false;
    try {
      await execFileAsync('heif-convert', ['-q', '90', inPath, outPath], { timeout: 20000 });
      convertedOk = true;
    } catch {
      // 2. Fallback to sips (macOS native)
      try {
        await execFileAsync('sips', ['-s', 'format', 'jpeg', inPath, '--out', outPath], { timeout: 20000 });
        convertedOk = true;
      } catch {
        // 3. Fallback to ffmpeg
        try {
          await execFileAsync('ffmpeg', ['-y', '-i', inPath, '-q:v', '2', outPath], { timeout: 20000 });
          convertedOk = true;
        } catch {
          // All conversion tools failed
        }
      }
    }

    if (!convertedOk) {
      throw new Error('Máy chủ không thể chuyển đổi tệp HEIC sang JPEG (thiếu heif-convert hoặc sips).');
    }

    const convertedBuf = await readFile(outPath);
    if (convertedBuf.length < 50) {
      throw new Error('Dữ liệu chuyển đổi tệp HEIC không hợp lệ.');
    }
    return convertedBuf;
  } finally {
    unlink(inPath).catch(() => {});
    unlink(outPath).catch(() => {});
  }
}

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
    throw new Error('Định dạng ảnh không được hỗ trợ (chỉ hỗ trợ JPG, PNG, WebP, GIF, HEIC).');
  }
  const encoded = String(input.dataBase64 || '')
    .trim()
    .replace(/^data:image\/(?:jpeg|jpg|png|webp|gif|heic|heif);base64,/i, '')
    .replace(/^data:[^;]+;base64,/i, '');
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
  const isHeic = buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp';

  if (
    (input.mimeType === 'image/jpeg' && !isJpeg) ||
    (input.mimeType === 'image/png' && !isPng) ||
    (input.mimeType === 'image/webp' && !isWebp) ||
    (input.mimeType === 'image/gif' && !isGif) ||
    ((input.mimeType === 'image/heic' || input.mimeType === 'image/heif') && !isHeic)
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
const STAFF_DIRECTORY_CACHE_TTL_MS = 30_000;
const STATE_DB_SYNC_TTL_MS = 30_000;

function buildDefaultAccessConfig(): MosChatAccessConfig {
  return {
    allowAllStaff: false,
    allowedGroupKeys: ['TEAM_ADMIN_MANAGER', 'TEAM_CC', 'TEAM_TELESALES'],
    allowedStaffIds: [],
    aiCopilotAllowedGroupKeys: ['TEAM_ADMIN_MANAGER', 'TEAM_TELESALES'],
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
    case 'TEAM_CORE':
      return teams.includes('CORE') || teams.includes('CORE_TEAM') || ['super_admin', 'boss'].includes(role);
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

export function isDannyOrSuperAdminUser(user?: JwtUserPayload): boolean {
  if (!user) return false;
  const uname = String(user.username || '')
    .toLowerCase()
    .trim();
  const role = String(user.role || '')
    .toLowerCase()
    .trim();
  return uname === 'danny' || uname.includes('danny') || role === 'super_admin' || role === 'admin';
}

/**
 * Chỉ cho phép chính tác giả của tin nhắn chỉnh sửa nội dung (Kinh Thánh mOS Điều răn UI-007 / MOS-BUG-126).
 * Tuyệt đối không cho phép quản trị viên hoặc người dùng khác sửa đổi tin nhắn của người khác.
 */
export function canUserEditChatMessage(
  targetItem: { senderId?: number | string | null; senderName?: string | null },
  user: { id?: number | string; username?: string } | undefined,
  staffRecord?: { displayName?: string | null; username?: string | null } | null
): boolean {
  if (!user) return false;
  const isSenderIdMatch = Boolean(user.id && String(targetItem.senderId) === String(user.id));
  const isDisplayNameMatch = Boolean(
    staffRecord?.displayName &&
    String(targetItem.senderName || '')
      .trim()
      .toLowerCase() === staffRecord.displayName.trim().toLowerCase()
  );
  const isUsernameMatch = Boolean(
    user.username &&
    String(targetItem.senderName || '')
      .trim()
      .toLowerCase() === String(user.username).trim().toLowerCase()
  );
  return isSenderIdMatch || isDisplayNameMatch || isUsernameMatch;
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
 * Strict Conversation Privacy Invariant:
 * - A 1-1 Direct Message (`type === 'dm'`) is ONLY visible to the 2 people in that DM (`dmIds.includes(myStaffId)`).
 * - A Self-Chat (`isSelf`) is ONLY visible to that 1 owner.
 * - No other user can see someone else's Direct Message.
 * - A Space with explicit members (`Array.isArray(conv.memberIds) && conv.memberIds.length > 0`) is ONLY
 *   visible and accessible to its members or Danny/SuperAdmin. Non-members cannot see it in the sidebar,
 *   cannot fetch it, cannot read/post messages, and cannot see read receipts.
 * - Public spaces (no memberIds specified) remain open to all active staff.
 */
const COMMON_VI_SURNAMES_NORM = new Set([
  'nguyen',
  'tran',
  'le',
  'pham',
  'hoang',
  'huynh',
  'phan',
  'vu',
  'vo',
  'dang',
  'bui',
  'do',
  'ho',
  'ngo',
  'duong',
  'ly',
]);

/**
 * Checks whether a chat message or thread reply text mentions a given staff member
 * (including 1-character Space nicknames such as `@K`, full display name, short given name,
 * unaccented Vietnamese name, username/email handle) or `@All` / `@channel` / `@mọi người`.
 */
export function isStaffMentionedInChatText(
  text: string | undefined | null,
  staff:
    | {
        id?: number | string | null;
        username?: string | null;
        displayName?: string | null;
        email?: string | null;
      }
    | undefined
    | null,
  options?: {
    nicknames?: Record<string, string>;
    includeAtAll?: boolean;
  }
): { isPersonalMention: boolean; isAtAll: boolean } {
  const rawText = String(text || '');
  if (!rawText.trim()) {
    return { isPersonalMention: false, isAtAll: false };
  }

  const normText = removeVietnameseTones(rawText);
  const isAtAll =
    options?.includeAtAll === false
      ? false
      : /(?:^|[\s([{"'])@\s*(?:all|channel|moi\s+nguoi)(?=$|\b|[\s.,!?;:)\]}"'])/i.test(normText);

  if (!staff) {
    return { isPersonalMention: false, isAtAll };
  }

  const candidates = new Set<string>();
  const addCandidate = (token: string | undefined | null, allowSingleChar = false) => {
    const cleaned = removeVietnameseTones(
      String(token || '')
        .trim()
        .toLowerCase()
    );
    if (!cleaned) return;
    if (allowSingleChar ? cleaned.length >= 1 : cleaned.length >= 2) {
      candidates.add(cleaned);
    }
  };

  // 1. Space nickname (supports 1-char nicknames like 'K' in Core Team)
  if (staff.id != null && options?.nicknames) {
    const nick = options.nicknames[String(staff.id)];
    if (nick && nick.trim()) {
      addCandidate(nick, true);
    }
  }

  // 2. Display name tokens (full name, last 2 words, given name)
  const displayName = String(staff.displayName || '').trim();
  if (displayName) {
    addCandidate(displayName);
    const words = displayName.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      addCandidate(words.slice(-2).join(' '));
      const givenName = words[words.length - 1];
      const givenNorm = removeVietnameseTones(givenName.toLowerCase());
      if (givenNorm.length >= 2 && !COMMON_VI_SURNAMES_NORM.has(givenNorm)) {
        addCandidate(givenName);
      }
      // Support 2-word names where first word is given name (e.g. "Danny Do")
      if (words.length === 2) {
        const firstWord = words[0];
        const firstNorm = removeVietnameseTones(firstWord.toLowerCase());
        if (firstNorm.length >= 2 && !COMMON_VI_SURNAMES_NORM.has(firstNorm)) {
          addCandidate(firstWord);
        }
      }
    }
  }

  // 3. Username & email handles
  for (const rawIdent of [staff.username, staff.email]) {
    const ident = String(rawIdent || '')
      .trim()
      .toLowerCase();
    if (!ident) continue;
    addCandidate(ident);
    const localPart = ident.split('@')[0];
    if (localPart && localPart.length >= 2) {
      addCandidate(localPart);
      const firstSegment = localPart.split(/[._-]/)[0];
      if (firstSegment && firstSegment.length >= 3 && !COMMON_VI_SURNAMES_NORM.has(firstSegment)) {
        addCandidate(firstSegment);
      }
    }
  }

  let isPersonalMention = false;
  for (const cand of candidates) {
    const escaped = cand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[\\s([{"'])@\\s*${escaped}(?=$|\\b|[\\s.,!?;:)\\]}"'])`, 'i');
    if (regex.test(normText)) {
      isPersonalMention = true;
      break;
    }
  }

  return { isPersonalMention, isAtAll };
}

export function canUserAccessConversation(
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
  if (conv.type === 'space') {
    if (isCanonicalSuperAdminIdentity(user || {})) return true;
    if (Array.isArray(conv.memberIds) && conv.memberIds.length > 0) {
      const memberNums = conv.memberIds.map(Number).filter((n) => Number.isFinite(n) && n > 0);
      if (memberNums.length > 0) {
        return myStaffId > 0 && memberNums.includes(myStaffId);
      }
    }
    return true;
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

export function resolveConversationParticipantStaffIds(
  conv: MosChatConversation,
  staffDirectory: MosChatStaffMember[],
  allUserPrefsByUserKey?: Record<string, MosChatUserSidebarPrefs>
): number[] {
  if (conv.type === 'dm') {
    return resolveDmParticipantIds(conv, staffDirectory);
  }

  const explicitMemberNums =
    Array.isArray(conv.memberIds) && conv.memberIds.length > 0
      ? conv.memberIds.map(Number).filter((n) => Number.isFinite(n) && n > 0)
      : [];

  // For a restricted space with specific members (like Core Team):
  // ONLY designated members of that space (plus any sender/author) are valid participants for read receipts.
  // Non-members who might have had residual read counts in userPrefs MUST NOT be counted or shown!
  if (conv.type === 'space' && explicitMemberNums.length > 0) {
    const set = new Set<number>(explicitMemberNums);
    for (const msg of conv.messages || []) {
      const sNum = Number(msg.senderId);
      if (Number.isFinite(sNum) && sNum > 0) set.add(sNum);
    }
    return Array.from(set);
  }

  const set = new Set<number>();
  if (Array.isArray(conv.memberIds)) {
    for (const id of conv.memberIds) {
      const n = Number(id);
      if (Number.isFinite(n) && n > 0) set.add(n);
    }
  }
  if (Array.isArray(conv.members)) {
    for (const m of conv.members) {
      const n = Number(m?.id);
      if (Number.isFinite(n) && n > 0) set.add(n);
    }
  }
  const byName = new Map<string, number>();
  for (const s of staffDirectory) {
    if (s.id > 0 && s.displayName) {
      byName.set(s.displayName.trim().toLowerCase(), s.id);
    }
  }
  for (const msg of conv.messages || []) {
    const sNum = Number(msg.senderId);
    if (Number.isFinite(sNum) && sNum > 0) {
      set.add(sNum);
    } else if (msg.senderName) {
      const matched = byName.get(msg.senderName.trim().toLowerCase());
      if (matched) set.add(matched);
    }
    for (const r of msg.thread || []) {
      const rNum = Number(r.senderId);
      if (Number.isFinite(rNum) && rNum > 0) {
        set.add(rNum);
      } else if (r.senderName) {
        const matched = byName.get(r.senderName.trim().toLowerCase());
        if (matched) set.add(matched);
      }
    }
  }
  if (allUserPrefsByUserKey) {
    for (const [prefKey, p] of Object.entries(allUserPrefsByUserKey)) {
      const sid = prefKey.startsWith('staff_') ? Number(prefKey.slice(6)) : Number(prefKey);
      if (!Number.isFinite(sid) || sid <= 0) continue;
      if (typeof p?.readMessageCountByConv?.[conv.id] === 'number') {
        set.add(sid);
      }
    }
  }
  return Array.from(set);
}

export function computeConversationReadReceipts(
  conv: MosChatConversation,
  staffDirectory: MosChatStaffMember[],
  allUserPrefsByUserKey?: Record<string, MosChatUserSidebarPrefs>
): MosChatReadReceiptEntry[] {
  const msgs = conv.messages || [];
  const participantIds = resolveConversationParticipantStaffIds(conv, staffDirectory, allUserPrefsByUserKey);
  const out: MosChatReadReceiptEntry[] = [];

  for (const staffId of participantIds) {
    if (!Number.isFinite(staffId) || staffId <= 0) continue;
    const staff = staffDirectory.find((s) => s.id === staffId);
    const prefs = allUserPrefsByUserKey?.[`staff_${staffId}`] || allUserPrefsByUserKey?.[String(staffId)];
    const explicitReadCount = prefs?.readMessageCountByConv?.[conv.id];
    const isManualUnread = Boolean(prefs?.manualUnreadIds?.includes(conv.id));

    let lastSeenByActivityIdx = -1;
    let lastActivityIso = '';
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];
      const sNum = Number(m.senderId);
      const isAuthor =
        sNum === staffId ||
        Boolean(staff?.displayName && m.senderName?.trim().toLowerCase() === staff.displayName.trim().toLowerCase());
      if (isAuthor) {
        lastSeenByActivityIdx = i;
        if (m.createdAt) lastActivityIso = m.createdAt;
      }
      for (const r of m.thread || []) {
        const rNum = Number(r.senderId);
        const isReplyAuthor =
          rNum === staffId ||
          Boolean(staff?.displayName && r.senderName?.trim().toLowerCase() === staff.displayName.trim().toLowerCase());
        if (isReplyAuthor) {
          lastSeenByActivityIdx = Math.max(lastSeenByActivityIdx, i);
          if (r.createdAt && (!lastActivityIso || r.createdAt > lastActivityIso)) {
            lastActivityIso = r.createdAt;
          }
        }
      }
    }

    let effectiveReadCount = 0;
    if (isManualUnread) {
      effectiveReadCount =
        typeof explicitReadCount === 'number'
          ? Math.min(msgs.length, Math.max(0, explicitReadCount))
          : Math.max(0, msgs.length - 1);
    } else {
      const inferredFromActivity = lastSeenByActivityIdx >= 0 ? lastSeenByActivityIdx + 1 : 0;
      const rawExplicit = typeof explicitReadCount === 'number' ? explicitReadCount : 0;
      effectiveReadCount = Math.min(msgs.length, Math.max(rawExplicit, inferredFromActivity));
    }

    const lastReadMsg = effectiveReadCount > 0 ? msgs[effectiveReadCount - 1] : null;
    const readAt =
      prefs?.readAtByConv?.[conv.id] || lastActivityIso || lastReadMsg?.createdAt || prefs?.updatedAt || conv.updatedAt;

    out.push({
      staffId,
      displayName: staff?.displayName || staff?.username || `Nhân sự #${staffId}`,
      role: staff ? getRoleDisplayLabel(staff.role).label : 'Member',
      avatarUrl: staff?.avatarUrl || (staff ? getInitials(staff.displayName, staff.username) : null),
      readCount: effectiveReadCount,
      lastReadMessageId: lastReadMsg?.id || null,
      readAt,
    });
  }

  return out;
}

export function computeThreadReadReceiptsForMessage(
  conv: MosChatConversation,
  msg: MosChatMessage,
  staffDirectory: MosChatStaffMember[],
  allUserPrefsByUserKey?: Record<string, MosChatUserSidebarPrefs>,
  baseParticipantIds?: number[]
): MosChatThreadReadReceiptEntry[] {
  const replies = msg.thread || [];
  if (replies.length === 0) return [];

  const threadKey = `${conv.id}::${msg.id}`;
  const participantIds =
    baseParticipantIds || resolveConversationParticipantStaffIds(conv, staffDirectory, allUserPrefsByUserKey);
  const out: MosChatThreadReadReceiptEntry[] = [];

  for (const staffId of participantIds) {
    if (!Number.isFinite(staffId) || staffId <= 0) continue;
    const staff = staffDirectory.find((s) => s.id === staffId);
    const prefs = allUserPrefsByUserKey?.[`staff_${staffId}`] || allUserPrefsByUserKey?.[String(staffId)];
    const explicitReplyRead =
      prefs?.readThreadReplyCountByMsg?.[threadKey] ?? prefs?.readThreadReplyCountByMsg?.[msg.id];

    let lastAuthoredReplyIdx = -1;
    let lastReplyIso = '';
    for (let i = 0; i < replies.length; i++) {
      const r = replies[i];
      const rNum = Number(r.senderId);
      const isReplyAuthor =
        rNum === staffId ||
        Boolean(staff?.displayName && r.senderName?.trim().toLowerCase() === staff.displayName.trim().toLowerCase());
      if (isReplyAuthor) {
        lastAuthoredReplyIdx = i;
        if (r.createdAt) lastReplyIso = r.createdAt;
      }
    }

    const inferredFromReply = lastAuthoredReplyIdx >= 0 ? lastAuthoredReplyIdx + 1 : 0;
    const rawExplicit = typeof explicitReplyRead === 'number' ? explicitReplyRead : 0;
    const effectiveReplyReadCount = Math.min(replies.length, Math.max(rawExplicit, inferredFromReply));
    const lastReadReply = effectiveReplyReadCount > 0 ? replies[effectiveReplyReadCount - 1] : null;
    const readAt =
      prefs?.readThreadAtByMsg?.[threadKey] ||
      prefs?.readThreadAtByMsg?.[msg.id] ||
      lastReplyIso ||
      lastReadReply?.createdAt ||
      prefs?.updatedAt ||
      msg.createdAt;

    out.push({
      staffId,
      displayName: staff?.displayName || staff?.username || `Nhân sự #${staffId}`,
      role: staff ? getRoleDisplayLabel(staff.role).label : 'Member',
      avatarUrl: staff?.avatarUrl || (staff ? getInitials(staff.displayName, staff.username) : null),
      readReplyCount: effectiveReplyReadCount,
      lastReadReplyId: lastReadReply?.id || null,
      readAt,
    });
  }

  return out;
}

export function computeUnreadThreadReplyCountForUser(
  conv: MosChatConversation,
  msg: MosChatMessage,
  myStaffId: number,
  staffDirectory: MosChatStaffMember[],
  userPrefs?: MosChatUserSidebarPrefs
): number {
  const replies = msg.thread || [];
  if (replies.length === 0 || myStaffId <= 0) return 0;

  const myStaff = staffDirectory.find((s) => s.id === myStaffId);
  const isReplyByMe = (r: { senderId: number | string; senderName?: string }) =>
    Number(r.senderId) === myStaffId ||
    Boolean(myStaff?.displayName && r.senderName?.trim().toLowerCase() === myStaff.displayName.trim().toLowerCase());

  const threadKey = `${conv.id}::${msg.id}`;
  const explicitRead =
    userPrefs?.readThreadReplyCountByMsg?.[threadKey] ?? userPrefs?.readThreadReplyCountByMsg?.[msg.id];

  let lastMyReplyIdx = -1;
  for (let i = 0; i < replies.length; i++) {
    if (isReplyByMe(replies[i])) {
      lastMyReplyIdx = i;
    }
  }
  const inferredRead = lastMyReplyIdx >= 0 ? lastMyReplyIdx + 1 : 0;

  if (typeof explicitRead === 'number') {
    const startIdx = Math.max(explicitRead, inferredRead);
    return replies.slice(startIdx).filter((r) => !r.isDeleted && !isReplyByMe(r)).length;
  }

  if (lastMyReplyIdx >= 0) {
    return replies.slice(lastMyReplyIdx + 1).filter((r) => !r.isDeleted && !isReplyByMe(r)).length;
  }

  // If never opened and user never replied in thread:
  const isParentMine =
    Number(msg.senderId) === myStaffId ||
    Boolean(myStaff?.displayName && msg.senderName?.trim().toLowerCase() === myStaff.displayName.trim().toLowerCase());
  const isParentMentioningMe = isStaffMentionedInChatText(msg.text, myStaff, {
    nicknames: conv.memberNicknames,
    includeAtAll: false,
  }).isPersonalMention;
  if (isParentMine || conv.type === 'dm' || isParentMentioningMe) {
    return replies.filter((r) => !r.isDeleted && !isReplyByMe(r) && !r.isMissionMilestone).length;
  }

  return replies.filter((r) => {
    if (r.isDeleted || isReplyByMe(r) || r.isMissionMilestone) return false;
    const mentionRes = isStaffMentionedInChatText(r.text, myStaff, {
      nicknames: conv.memberNicknames,
      includeAtAll: true,
    });
    return mentionRes.isPersonalMention || mentionRes.isAtAll;
  }).length;
}

/**
 * Personalizes a 1-1 Direct Message or Space for the requesting user so that:
 * - Person A sees Person B's name, role, avatar, and `participantStaffId: B`.
 * - Person B sees Person A's name, role, avatar, and `participantStaffId: A`.
 * - `unreadCount` reflects the requesting user's actual unread status.
 * - `readReceipts` and per-message `threadReadReceipts` / `unreadThreadReplyCount` are populated.
 */
export function formatConversationForUser(
  conv: MosChatConversation,
  user: JwtUserPayload | undefined,
  staffDirectory: MosChatStaffMember[],
  userPrefs?: MosChatUserSidebarPrefs,
  allUserPrefsByUserKey?: Record<string, MosChatUserSidebarPrefs>
): MosChatConversation {
  const myStaffId = resolveUserStaffId(user, staffDirectory);
  const myPrefKey = resolveUserPrefKey(user, staffDirectory);
  const mergedPrefsMap: Record<string, MosChatUserSidebarPrefs> = {
    ...(allUserPrefsByUserKey || {}),
    ...(userPrefs ? { [myPrefKey]: userPrefs } : {}),
  };

  const personalizedUnread = computeUnreadCountForUser(conv, user, staffDirectory, userPrefs);
  const participantIds = resolveConversationParticipantStaffIds(conv, staffDirectory, mergedPrefsMap);
  const readReceipts = computeConversationReadReceipts(conv, staffDirectory, mergedPrefsMap);

  let unreadThreadCount = 0;
  const formattedMessages: MosChatMessage[] = (conv.messages || []).map((m) => {
    if (!m.thread || m.thread.length === 0) {
      return m;
    }
    const threadReadReceipts = computeThreadReadReceiptsForMessage(
      conv,
      m,
      staffDirectory,
      mergedPrefsMap,
      participantIds
    );
    const unreadThreadReplyCount = computeUnreadThreadReplyCountForUser(conv, m, myStaffId, staffDirectory, userPrefs);
    unreadThreadCount += unreadThreadReplyCount;
    return {
      ...m,
      threadReadReceipts,
      unreadThreadReplyCount,
    };
  });

  // Compute unread buzz status for this user
  let hasUnreadBuzz = false;
  let unreadBuzzCount = 0;
  if (personalizedUnread > 0) {
    const msgs = conv.messages || [];
    const readCount = userPrefs?.readMessageCountByConv?.[conv.id];
    const startIndex =
      typeof readCount === 'number'
        ? Math.min(msgs.length, Math.max(0, readCount))
        : Math.max(0, msgs.length - personalizedUnread);
    const unreadMessages = msgs.slice(startIndex);
    for (const m of unreadMessages) {
      if (m.isBuzzed && Number(m.senderId) !== myStaffId) {
        hasUnreadBuzz = true;
        unreadBuzzCount++;
      }
    }
  }

  if (conv.type !== 'dm') {
    const liveStaffMap = new Map(staffDirectory.map((s) => [Number(s.id), s]));
    const hydratedMembers = Array.isArray(conv.members)
      ? conv.members.map((m) => {
          const live = liveStaffMap.get(Number(m.id));
          return live
            ? {
                ...m,
                displayName: live.displayName || m.displayName,
                avatarUrl: live.avatarUrl || m.avatarUrl,
                isOnline: Boolean(live.isOnline),
              }
            : { ...m, isOnline: false };
        })
      : conv.members;
    return {
      ...conv,
      members: hydratedMembers,
      unreadCount: personalizedUnread,
      unreadThreadCount,
      hasUnreadBuzz,
      unreadBuzzCount,
      readReceipts,
      messages: formattedMessages,
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
      unreadThreadCount,
      hasUnreadBuzz,
      unreadBuzzCount,
      readReceipts,
      messages: formattedMessages,
    };
  }
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
    unreadThreadCount,
    hasUnreadBuzz,
    unreadBuzzCount,
    readReceipts,
    messages: formattedMessages,
  };
}

export function filterAndFormatConversationsForUser(
  conversations: MosChatConversation[],
  user: JwtUserPayload | undefined,
  staffDirectory: MosChatStaffMember[],
  userPrefs?: MosChatUserSidebarPrefs,
  allUserPrefsByUserKey?: Record<string, MosChatUserSidebarPrefs>
): MosChatConversation[] {
  return conversations
    .filter((c) => canUserAccessConversation(c, user, staffDirectory))
    .map((c) => formatConversationForUser(c, user, staffDirectory, userPrefs, allUserPrefsByUserKey));
}

export function filterTasksForUser(
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
    if (!conv) {
      return isCanonicalSuperAdminIdentity(user || {});
    }
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

function sortRepliesChronologically(replies: MosChatThreadReply[]): MosChatThreadReply[] {
  return [...replies].sort((a, b) => {
    const tA = a.createdAt ? Date.parse(a.createdAt) : NaN;
    const tB = b.createdAt ? Date.parse(b.createdAt) : NaN;
    if (Number.isFinite(tA) && Number.isFinite(tB) && tA !== tB) {
      return tA - tB;
    }
    return 0;
  });
}

export function moveChatThreadItemInMemory(
  conv: MosChatConversation,
  tasks: MosChatTaskItem[],
  params: {
    mode: MosChatThreadMoveMode;
    sourceMessageId: string;
    replyId?: string | null;
    targetMessageId?: string | null;
  }
): {
  targetMessage: MosChatMessage | null;
  promotedMessage: MosChatMessage | null;
  movedReplies: MosChatThreadReply[];
  tasksChanged: boolean;
} {
  const { mode, sourceMessageId, replyId, targetMessageId } = params;
  const sourceIdx = conv.messages.findIndex((m) => m.id === sourceMessageId);
  if (sourceIdx < 0) {
    throw new Error('Không tìm thấy tin nhắn nguồn.');
  }
  const sourceMsg = conv.messages[sourceIdx];

  if (mode === 'MERGE_ROOT_TO_THREAD') {
    if (!targetMessageId || targetMessageId === sourceMessageId) {
      throw new Error('Vui lòng chọn một luồng đích hợp lệ để gộp tin nhắn.');
    }
    const targetMsg = conv.messages.find((m) => m.id === targetMessageId);
    if (!targetMsg) {
      throw new Error('Không tìm thấy tin nhắn luồng đích.');
    }

    const convertedReply: MosChatThreadReply = {
      id: `th-mv-${sourceMsg.id.replace(/^msg-/, '')}`,
      senderId: sourceMsg.senderId,
      senderName: sourceMsg.senderName,
      senderRole: sourceMsg.senderRole,
      senderAvatar: sourceMsg.senderAvatar,
      text: sourceMsg.text || '',
      attachments: sourceMsg.attachments && sourceMsg.attachments.length > 0 ? sourceMsg.attachments : undefined,
      timeLabel: sourceMsg.timeLabel,
      createdAt: sourceMsg.createdAt || new Date().toISOString(),
      editHistory: sourceMsg.editHistory,
      editedAt: sourceMsg.editedAt,
      editedBy: sourceMsg.editedBy,
      isDeleted: sourceMsg.isDeleted,
      deletedAt: sourceMsg.deletedAt,
      deletedBy: sourceMsg.deletedBy,
      deletedByName: sourceMsg.deletedByName,
      originalText: sourceMsg.originalText,
    };

    const childReplies = Array.isArray(sourceMsg.thread) ? sourceMsg.thread : [];
    const existingTargetThread = Array.isArray(targetMsg.thread) ? targetMsg.thread : [];
    const existingIds = new Set(existingTargetThread.map((r) => r.id));

    const toAppend: MosChatThreadReply[] = [];
    if (!existingIds.has(convertedReply.id) && (convertedReply.text.trim() || convertedReply.attachments?.length)) {
      toAppend.push(convertedReply);
      existingIds.add(convertedReply.id);
    }
    for (const child of childReplies) {
      if (!existingIds.has(child.id)) {
        toAppend.push(child);
        existingIds.add(child.id);
      }
    }

    targetMsg.thread = sortRepliesChronologically([...existingTargetThread, ...toAppend]);

    // Transfer Mission ownership if sourceMsg had a mission and targetMsg did not
    if (sourceMsg.missionId && !targetMsg.missionId) {
      targetMsg.missionId = sourceMsg.missionId;
      targetMsg.missionKey = sourceMsg.missionKey;
      targetMsg.mission = sourceMsg.mission;
      targetMsg.missionSyncedStage = sourceMsg.missionSyncedStage;
      targetMsg.missionSyncedCommentIds = sourceMsg.missionSyncedCommentIds;
    }

    // Re-link any tasks pointing to sourceMsg over to targetMsg
    let tasksChanged = false;
    for (const t of tasks) {
      if (t.sourceMessageId === sourceMsg.id || (sourceMsg.taskId && t.id === sourceMsg.taskId)) {
        t.sourceMessageId = targetMsg.id;
        if (!targetMsg.taskId) {
          targetMsg.taskId = t.id;
        }
        tasksChanged = true;
      }
    }

    // Remove sourceMsg from root messages
    conv.messages = conv.messages.filter((m) => m.id !== sourceMsg.id);
    conv.updatedAt = new Date().toISOString();

    return {
      targetMessage: targetMsg,
      promotedMessage: null,
      movedReplies: toAppend.filter((r) => !r.isMissionMilestone),
      tasksChanged,
    };
  }

  if (mode === 'PROMOTE_REPLY_TO_ROOT') {
    if (!replyId) {
      throw new Error('Thiếu mã phản hồi (replyId) cần tách ra luồng chính.');
    }
    const sourceThread = Array.isArray(sourceMsg.thread) ? sourceMsg.thread : [];
    const replyItem = sourceThread.find((r) => r.id === replyId);
    if (!replyItem) {
      throw new Error('Không tìm thấy câu trả lời cần tách trong luồng.');
    }

    sourceMsg.thread = sourceThread.filter((r) => r.id !== replyId);

    const promotedMsg: MosChatMessage = {
      id: `msg-pr-${replyItem.id.replace(/^th-/, '')}`,
      conversationId: conv.id,
      senderId: replyItem.senderId,
      senderName: replyItem.senderName,
      senderRole: replyItem.senderRole,
      senderAvatar: replyItem.senderAvatar,
      roleColor: '#38bdf8',
      text: replyItem.text || '',
      attachments: replyItem.attachments && replyItem.attachments.length > 0 ? replyItem.attachments : undefined,
      timeLabel: replyItem.timeLabel,
      createdAt: replyItem.createdAt || new Date().toISOString(),
      reactions: {},
      customerCard: null,
      thread: [],
      aiThinking: null,
      aiAction: null,
      editHistory: replyItem.editHistory,
      editedAt: replyItem.editedAt,
      editedBy: replyItem.editedBy,
    };

    const nextMessages = [...conv.messages];
    const promotedTime = promotedMsg.createdAt ? Date.parse(promotedMsg.createdAt) : NaN;
    let inserted = false;
    if (Number.isFinite(promotedTime)) {
      for (let i = sourceIdx + 1; i < nextMessages.length; i++) {
        const msgTime = nextMessages[i]?.createdAt ? Date.parse(nextMessages[i].createdAt!) : NaN;
        if (Number.isFinite(msgTime) && msgTime > promotedTime) {
          nextMessages.splice(i, 0, promotedMsg);
          inserted = true;
          break;
        }
      }
    }
    if (!inserted) {
      nextMessages.push(promotedMsg);
    }
    conv.messages = nextMessages;
    conv.updatedAt = new Date().toISOString();

    return {
      targetMessage: sourceMsg,
      promotedMessage: promotedMsg,
      movedReplies: [],
      tasksChanged: false,
    };
  }

  if (mode === 'MOVE_REPLY_TO_THREAD') {
    if (!replyId || !targetMessageId || targetMessageId === sourceMessageId) {
      throw new Error('Vui lòng chọn phản hồi và luồng đích hợp lệ để di chuyển.');
    }
    const targetMsg = conv.messages.find((m) => m.id === targetMessageId);
    if (!targetMsg) {
      throw new Error('Không tìm thấy tin nhắn luồng đích.');
    }
    const sourceThread = Array.isArray(sourceMsg.thread) ? sourceMsg.thread : [];
    const replyItem = sourceThread.find((r) => r.id === replyId);
    if (!replyItem) {
      throw new Error('Không tìm thấy câu trả lời cần di chuyển.');
    }

    sourceMsg.thread = sourceThread.filter((r) => r.id !== replyId);
    const existingTargetThread = Array.isArray(targetMsg.thread) ? targetMsg.thread : [];
    targetMsg.thread = sortRepliesChronologically([...existingTargetThread, replyItem]);
    conv.updatedAt = new Date().toISOString();

    return {
      targetMessage: targetMsg,
      promotedMessage: null,
      movedReplies: replyItem.isMissionMilestone ? [] : [replyItem],
      tasksChanged: false,
    };
  }

  throw new Error('Chế độ di chuyển luồng không hợp lệ.');
}

export async function loadChatState(fastify: FastifyInstance): Promise<{
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

  const relationalSynced = await loadOrMigrateRelationalChatData(fastify, {
    conversations,
    tasks,
    accessConfig,
    userPrefsByUserKey,
  });
  conversations = relationalSynced.conversations;
  tasks = relationalSynced.tasks;
  Object.assign(userPrefsByUserKey, relationalSynced.userPrefsByUserKey);

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

let userPrefsPersistTimeout: NodeJS.Timeout | null = null;
let latestUserPrefsSnapshot: Record<string, MosChatUserSidebarPrefs> | null = null;

function scheduleUserPrefsPersist(fastify: FastifyInstance, snapshot: Record<string, MosChatUserSidebarPrefs>) {
  latestUserPrefsSnapshot = snapshot;
  if (userPrefsPersistTimeout) return;
  userPrefsPersistTimeout = setTimeout(() => {
    userPrefsPersistTimeout = null;
    const toSave = latestUserPrefsSnapshot;
    if (!toSave) return;
    writeChain = writeChain
      .then(async () => {
        await fastify.prisma.crm.crmConfig.upsert({
          where: { key: CHAT_USER_PREFS_CONFIG_KEY },
          update: { value: JSON.stringify(toSave) },
          create: { key: CHAT_USER_PREFS_CONFIG_KEY, value: JSON.stringify(toSave) },
        });
      })
      .catch((err) => {
        fastify.log.error(err, 'debounced saveUserSidebarPrefs crmConfig error:');
      });
  }, 200);
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
  invalidateNotificationsCache();

  // Debounce the heavy JSON crmConfig persist, and run relational DB sync asynchronously without blocking request
  scheduleUserPrefsPersist(fastify, snapshot);
  writeChain = writeChain
    .then(async () => {
      await syncUserPrefsToRelationalDb(fastify, userPrefKey, normalized);
    })
    .catch((err) => {
      fastify.log.error(err, 'saveUserSidebarPrefs relational sync error:');
    });

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
      fastify.log.error(err, 'saveAccessConfig error:');
    });
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
  invalidateNotificationsCache();
  writeChain = writeChain
    .then(async () => {
      await Promise.all([
        fastify.prisma.crm.crmConfig.upsert({
          where: { key: CHAT_CONVERSATIONS_CONFIG_KEY },
          update: { value: JSON.stringify(trimmed) },
          create: { key: CHAT_CONVERSATIONS_CONFIG_KEY, value: JSON.stringify(trimmed) },
        }),
        syncConversationsToRelationalDb(fastify, trimmed),
      ]);
    })
    .catch((err) => {
      fastify.log.error(err, 'saveConversations error:');
    });
}

async function saveTasks(fastify: FastifyInstance, tasks: MosChatTaskItem[]) {
  const trimmed = trimTasksRetention(tasks, memoryChatCache?.conversations);
  const nextVersion = Date.now();
  if (memoryChatCache) {
    memoryChatCache.tasks = trimmed;
    memoryChatCache.version = nextVersion;
    memoryChatCache.lastSyncedFromDbAt = nextVersion;
  }
  invalidateNotificationsCache();
  writeChain = writeChain
    .then(async () => {
      await Promise.all([
        fastify.prisma.crm.crmConfig.upsert({
          where: { key: CHAT_TASKS_CONFIG_KEY },
          update: { value: JSON.stringify(trimmed) },
          create: { key: CHAT_TASKS_CONFIG_KEY, value: JSON.stringify(trimmed) },
        }),
        syncTasksToRelationalDb(fastify, trimmed),
      ]);
    })
    .catch((err) => {
      fastify.log.error(err, 'saveTasks error:');
    });
}

export async function loadStaffDirectoryCached(fastify: FastifyInstance): Promise<MosChatStaffMember[]> {
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
        if (tCode === 'CORE' || tCode === 'CORE_TEAM') {
          teamSet.add('CORE_TEAM');
          teamSet.add('CORE');
        }
      }
    }

    const fallbackLegacyAvatar = s.legacyStaffId ? legacyAvatarMap.get(Number(s.legacyStaffId)) || null : null;

    return {
      id: s.id,
      username: s.username,
      displayName: s.displayName || s.username,
      role: s.role,
      avatarUrl: s.avatarUrl || fallbackLegacyAvatar,
      isOnline: Boolean(s.lastActiveAt && nowMs - new Date(s.lastActiveAt).getTime() < 5 * 60 * 1000),
      departmentCodes: Array.from(deptSet),
      teamCodes: Array.from(teamSet),
      legacyStaffId: s.legacyStaffId ? Number(s.legacyStaffId) : null,
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

        // Zero-DB, lightweight short-circuit when conversations/tasks unchanged (still returns fresh staffDirectory presence!)
        if (!missionMutated && clientVersion > 0 && clientVersion === version) {
          return {
            version,
            unchanged: true,
            conversations: [],
            tasks: [],
            staffDirectory,
            accessConfig,
            canAccessChat,
            userPrefs,
          } satisfies MosChatBootstrapResponse;
        }

        const userConversations = filterAndFormatConversationsForUser(
          conversations,
          user,
          staffDirectory,
          userPrefs,
          userPrefsByUserKey
        );
        const userTasks = filterTasksForUser(tasks, conversations, user, staffDirectory);
        const wfState = await loadWorkflowState(fastify);
        const wfInstanceMap = new Map<string, MosChatWorkflowInstance>();
        for (const inst of wfState.instances) {
          wfInstanceMap.set(inst.id, inst);
        }
        for (const conv of userConversations) {
          for (const msg of conv.messages || []) {
            if (msg.workflowInstanceId && wfInstanceMap.has(msg.workflowInstanceId)) {
              msg.workflow = wfInstanceMap.get(msg.workflowInstanceId) || null;
            }
          }
        }

        const payload: MosChatBootstrapResponse = {
          version,
          unchanged: false,
          conversations: userConversations,
          tasks: userTasks,
          staffDirectory,
          accessConfig,
          canAccessChat,
          userPrefs,
          workflowTemplates: wfState.templates,
          workflowInstances: wfState.instances,
          storageEngine: 'PRISMA_RELATIONAL',
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

        const mergedReadMessageCountByConv: Record<string, number> = {
          ...(current.readMessageCountByConv || {}),
        };
        if (body.readMessageCountByConv && typeof body.readMessageCountByConv === 'object') {
          for (const [k, v] of Object.entries(body.readMessageCountByConv)) {
            const n = Number(v);
            if (Number.isFinite(n) && n >= 0) {
              mergedReadMessageCountByConv[k] = Math.max(mergedReadMessageCountByConv[k] || 0, n);
            }
          }
        }

        const mergedReadThreadReplyCountByMsg: Record<string, number> = {
          ...(current.readThreadReplyCountByMsg || {}),
        };
        if (body.readThreadReplyCountByMsg && typeof body.readThreadReplyCountByMsg === 'object') {
          for (const [k, v] of Object.entries(body.readThreadReplyCountByMsg)) {
            const n = Number(v);
            if (Number.isFinite(n) && n >= 0) {
              mergedReadThreadReplyCountByMsg[k] = Math.max(mergedReadThreadReplyCountByMsg[k] || 0, n);
            }
          }
        }

        const saved = await saveUserSidebarPrefs(fastify, userPrefKey, {
          ...current,
          ...body,
          readMessageCountByConv: mergedReadMessageCountByConv,
          readAtByConv: {
            ...(current.readAtByConv || {}),
            ...(body.readAtByConv || {}),
          },
          lastReadMessageIdByConv: {
            ...(current.lastReadMessageIdByConv || {}),
            ...(body.lastReadMessageIdByConv || {}),
          },
          readThreadReplyCountByMsg: mergedReadThreadReplyCountByMsg,
          readThreadAtByMsg: {
            ...(current.readThreadAtByMsg || {}),
            ...(body.readThreadAtByMsg || {}),
          },
          lastReadThreadReplyIdByMsg: {
            ...(current.lastReadThreadReplyIdByMsg || {}),
            ...(body.lastReadThreadReplyIdByMsg || {}),
          },
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
        let buffer = decodeAndValidateChatImage(body);
        let finalMimeType: MosChatImageMimeType = body.mimeType;

        if (body.mimeType === 'image/heic' || body.mimeType === 'image/heif') {
          buffer = await convertHeicToJpegBuffer(buffer);
          finalMimeType = 'image/jpeg';
        }

        const ext = CHAT_MIME_EXTENSIONS[finalMimeType] || 'jpg';
        const fileUuid = crypto.randomUUID();
        const fileName = `${fileUuid}.${ext}`;
        const rootDir = mosChatMediaRoot();
        await mkdir(rootDir, { recursive: true, mode: 0o700 });
        const targetPath = resolve(rootDir, fileName);
        if (!targetPath.startsWith(`${rootDir}${sep}`)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'Đường dẫn tệp không hợp lệ.' });
        }
        await writeFile(targetPath, buffer, { flag: 'wx', mode: 0o600 });

        const rawName = String(body.fileName || `chat-image.${ext}`);
        const safeName = rawName.replace(/\.(heic|heif)$/i, `.${ext}`).slice(0, 120);

        const attachment: MosChatImageAttachment = {
          id: `att-${fileUuid.slice(0, 8)}`,
          url: `/api/chat/media/${fileName}`,
          name: safeName,
          mimeType: finalMimeType,
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

  // Helper for cleaning text before TTS synthesis
  function cleanChatTextForTts(text: string): string {
    if (!text) return '';
    return text
      .replace(/<thinking[\s\S]*?<\/thinking>/gi, '')
      .replace(/<thinking[\s\S]*$/gi, '')
      .replace(/<action[\s\S]*?<\/action>/gi, '')
      .replace(/<\/?action[^>]*>/gi, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/[*#_~>|]/g, ' ')
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 4000);
  }

  function convertSpeedToRate(speed?: number | string, rate?: string): string {
    if (rate && String(rate).trim()) return String(rate).trim();
    if (speed !== undefined && speed !== null && speed !== '') {
      const s = typeof speed === 'string' ? parseFloat(speed) : speed;
      if (!isNaN(s) && s > 0) {
        const pct = Math.round((s - 1.0) * 100);
        return pct >= 0 ? `+${pct}%` : `${pct}%`;
      }
    }
    return '+0%';
  }

  const handleChatTtsRequest = async (
    params: {
      text?: string;
      voice?: string;
      speed?: string | number;
      rate?: string;
      pitch?: string;
    },
    reply: FastifyReply
  ) => {
    const rawText = params.text || '';
    const cleanText = cleanChatTextForTts(rawText);
    if (!cleanText) {
      return reply.status(400).send({ error: 'Text is required' });
    }

    const voice = (params.voice || 'vi-VN-HoaiMyNeural').trim();
    const rate = convertSpeedToRate(params.speed, params.rate);
    const pitch = (params.pitch || '+0Hz').trim();

    try {
      const audioBuffer = await TelesaleTargetService.synthesizeCelebrationAudio(cleanText, voice, rate, pitch);
      return reply
        .header('Content-Type', 'audio/mpeg')
        .header('Cross-Origin-Resource-Policy', 'cross-origin')
        .header('Access-Control-Allow-Origin', '*')
        .header('Accept-Ranges', 'bytes')
        .header('Cache-Control', 'public, max-age=86400')
        .send(audioBuffer);
    } catch (err: SafeAny) {
      fastify.log.error(`Failed to synthesize chat tts audio: ${err.message}`);
      return reply.status(500).send({ error: 'Failed to synthesize chat tts audio' });
    }
  };

  // GET /api/chat/tts - Neural TTS stream with Hoai My voice & customizable playback speed
  fastify.get('/chat/tts', async (request, reply) => {
    return handleChatTtsRequest(request.query as SafeAny, reply);
  });

  // POST /api/chat/tts - Neural TTS stream via JSON body (no URL length constraints)
  fastify.post('/chat/tts', async (request, reply) => {
    return handleChatTtsRequest((request.body || {}) as SafeAny, reply);
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
      if (isAiBot) {
        const cleanText = fallbackText.trim();
        const existingMsg = conv.messages
          .slice(-10)
          .find(
            (m) =>
              (m.isAiBot || m.senderId === 'wings-ai-copilot') &&
              (m.text.trim() === cleanText ||
                m.text.trim().replace(/^Chào\s+@[^,]+,\s*/i, '') === cleanText.replace(/^Chào\s+@[^,]+,\s*/i, '')) &&
              Math.abs(now.getTime() - new Date(m.createdAt).getTime()) < 60_000
          );
        if (existingMsg) {
          if (body.aiThinking && !existingMsg.aiThinking) {
            existingMsg.aiThinking = String(body.aiThinking).slice(0, 4000);
          }
          if (body.aiAction && !existingMsg.aiAction) {
            existingMsg.aiAction = body.aiAction;
          }
          await saveConversations(fastify, conversations);
          return {
            success: true,
            message: existingMsg,
            conversation: formatConversationForUser(conv, user, staffDirectory),
          };
        }
      }
      const newMessage = {
        id: `msg-${crypto.randomUUID().slice(0, 8)}`,
        conversationId: conv.id,
        senderId: isAiBot ? 'wings-ai-copilot' : user.id,
        senderName: isAiBot ? '🤖 MAI' : senderName,
        senderRole: isAiBot ? 'mOS AI' : roleInfo.label,
        senderAvatar: isAiBot ? 'MAI' : staffRecord?.avatarUrl || getInitials(senderName, user.username),
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
      const updatedSenderPrefs: MosChatUserSidebarPrefs = {
        ...currentSenderPrefs,
        manualUnreadIds: (currentSenderPrefs.manualUnreadIds || []).filter((id) => id !== conv.id),
        readMessageCountByConv: {
          ...(currentSenderPrefs.readMessageCountByConv || {}),
          [conv.id]: conv.messages.length,
        },
        readAtByConv: {
          ...(currentSenderPrefs.readAtByConv || {}),
          [conv.id]: now.toISOString(),
        },
        lastReadMessageIdByConv: {
          ...(currentSenderPrefs.lastReadMessageIdByConv || {}),
          [conv.id]: newMessage.id,
        },
      };
      const savedPrefs = await saveUserSidebarPrefs(fastify, userPrefKey, updatedSenderPrefs);

      return {
        success: true,
        message: newMessage,
        conversation: formatConversationForUser(conv, user, staffDirectory, savedPrefs, userPrefsByUserKey),
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

      const isAiBot = Boolean(body.isAiBot);
      msg.thread = msg.thread || [];

      if (isAiBot) {
        const cleanText = text.trim();
        const existingReply = msg.thread.find(
          (r) =>
            (r.isAiBot || r.senderId === 'wings-ai-copilot') &&
            (r.text.trim() === cleanText ||
              r.text.trim().replace(/^Chào\s+@[^,]+,\s*/i, '') === cleanText.replace(/^Chào\s+@[^,]+,\s*/i, '')) &&
            Math.abs(now.getTime() - new Date(r.createdAt).getTime()) < 60_000
        );
        if (existingReply) {
          if (body.aiThinking && !existingReply.aiThinking) {
            existingReply.aiThinking = String(body.aiThinking).slice(0, 4000);
          }
          if (body.aiAction && !existingReply.aiAction) {
            existingReply.aiAction = body.aiAction;
          }
          if (body.aiActions && !existingReply.aiActions) {
            existingReply.aiActions = body.aiActions;
          }
          await saveConversations(fastify, conversations);
          return {
            success: true,
            reply: existingReply,
            conversation: formatConversationForUser(conv, user, staffDirectory),
          };
        }
      }
      const replyItem = {
        id: `th-${crypto.randomUUID().slice(0, 8)}`,
        senderId: isAiBot ? 'wings-ai-copilot' : user.id,
        senderName: isAiBot ? '🤖 MAI' : senderName,
        senderRole: isAiBot ? 'mOS AI' : roleInfo.label,
        senderAvatar: isAiBot ? 'MAI' : staffRecord?.avatarUrl || getInitials(senderName, user.username),
        roleColor: isAiBot ? '#8b5cf6' : roleInfo.color,
        text,
        attachments: attachments.length > 0 ? attachments : undefined,
        timeLabel: formatTimeLabel(now),
        createdAt: now.toISOString(),
        isAiBot: isAiBot || undefined,
        aiThinking: body.aiThinking ? String(body.aiThinking).slice(0, 4000) : null,
        aiAction: body.aiAction || null,
        aiActions: body.aiActions || null,
      };
      msg.thread.push(replyItem);
      conv.updatedAt = now.toISOString();

      if (msg.missionId) {
        await ChatMissionBridgeService.syncChatReplyToMission(fastify, user, msg, replyItem, mosChatMediaRoot());
      }

      await saveConversations(fastify, conversations);

      // Advance sender's read count for this sub-thread in userPrefs
      const userPrefKey = resolveUserPrefKey(user, staffDirectory);
      const { userPrefsByUserKey } = await loadChatState(fastify);
      const currentSenderPrefs = userPrefsByUserKey[userPrefKey] || buildDefaultUserSidebarPrefs();
      const threadKey = `${conv.id}::${msg.id}`;
      const updatedSenderPrefs: MosChatUserSidebarPrefs = {
        ...currentSenderPrefs,
        readThreadReplyCountByMsg: {
          ...(currentSenderPrefs.readThreadReplyCountByMsg || {}),
          [threadKey]: msg.thread.length,
        },
        readThreadAtByMsg: {
          ...(currentSenderPrefs.readThreadAtByMsg || {}),
          [threadKey]: now.toISOString(),
        },
        lastReadThreadReplyIdByMsg: {
          ...(currentSenderPrefs.lastReadThreadReplyIdByMsg || {}),
          [threadKey]: replyItem.id,
        },
      };
      await saveUserSidebarPrefs(fastify, userPrefKey, updatedSenderPrefs);

      return { success: true, reply: replyItem, message: msg };
    }
  );

  // POST /api/chat/threads/move (Merge root message into subthread, promote reply to root, or move reply between threads)
  fastify.post(
    '/chat/threads/move',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const body = request.body as MoveMosChatThreadItemRequest;
      const conversationId = String(body?.conversationId || '').trim();
      const sourceMessageId = String(body?.sourceMessageId || '').trim();
      const mode = body?.mode;
      const replyId = body?.replyId ? String(body.replyId).trim() : null;
      const targetMessageId = body?.targetMessageId ? String(body.targetMessageId).trim() : null;

      if (!conversationId || !sourceMessageId || !mode) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Thiếu thông tin luồng cần di chuyển (conversationId, sourceMessageId, mode).',
        });
      }

      const [{ conversations, tasks, userPrefsByUserKey }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      const conv = conversations.find((c) => c.id === conversationId);
      const sourceMsg = conv?.messages.find((m) => m.id === sourceMessageId);
      if (!conv || !sourceMsg) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy tin nhắn nguồn.' });
      }
      if (!canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Bạn không có quyền truy cập cuộc trò chuyện này.',
        });
      }

      const itemToMove = replyId ? sourceMsg.thread?.find((r) => r.id === replyId) : sourceMsg;
      if (!itemToMove) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy nội dung cần di chuyển.' });
      }

      const staffRecord = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: Number(user.id) || 0 },
        select: { displayName: true, username: true, role: true },
      });
      const effectiveRole = String(staffRecord?.role || user.role || '').toLowerCase();
      const isOwner =
        String(itemToMove.senderId) === String(user.id) ||
        (user.id && String(itemToMove.senderId) === 'me') ||
        Boolean(staffRecord?.displayName && itemToMove.senderName === staffRecord.displayName);
      const isAdminOrManager =
        isDannyOrSuperAdminUser(user) || ['admin', 'manager', 'super_admin'].includes(effectiveRole);

      if (!isOwner && !isAdminOrManager) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Chỉ người gửi tin nhắn, Quản lý/Admin hoặc Super Admin mới có thể gộp/tách luồng.',
        });
      }

      let moveResult: ReturnType<typeof moveChatThreadItemInMemory>;
      try {
        moveResult = moveChatThreadItemInMemory(conv, tasks, {
          mode,
          sourceMessageId,
          replyId,
          targetMessageId,
        });
      } catch (err: SafeAny) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: err?.message || 'Không thể thực hiện di chuyển luồng.',
        });
      }

      if (moveResult.targetMessage?.missionId && moveResult.movedReplies.length > 0) {
        for (const movedReply of moveResult.movedReplies) {
          await ChatMissionBridgeService.syncChatReplyToMission(
            fastify,
            user,
            moveResult.targetMessage,
            movedReply,
            mosChatMediaRoot()
          );
        }
        await ChatMissionBridgeService.syncLinkedMissionsIntoChatState(fastify, conversations, tasks);
      }

      await saveConversations(fastify, conversations);
      if (moveResult.tasksChanged || moveResult.targetMessage?.missionId) {
        await saveTasks(fastify, tasks);
      }

      const userPrefKey = resolveUserPrefKey(user, staffDirectory);
      const currentSenderPrefs = userPrefsByUserKey[userPrefKey] || buildDefaultUserSidebarPrefs();
      if (moveResult.targetMessage) {
        const threadKey = `${conv.id}::${moveResult.targetMessage.id}`;
        const targetThread = moveResult.targetMessage.thread || [];
        const lastReply = targetThread[targetThread.length - 1];
        const updatedSenderPrefs: MosChatUserSidebarPrefs = {
          ...currentSenderPrefs,
          readThreadReplyCountByMsg: {
            ...(currentSenderPrefs.readThreadReplyCountByMsg || {}),
            [threadKey]: targetThread.length,
          },
          readThreadAtByMsg: {
            ...(currentSenderPrefs.readThreadAtByMsg || {}),
            [threadKey]: new Date().toISOString(),
          },
          lastReadThreadReplyIdByMsg: lastReply
            ? {
                ...(currentSenderPrefs.lastReadThreadReplyIdByMsg || {}),
                [threadKey]: lastReply.id,
              }
            : currentSenderPrefs.lastReadThreadReplyIdByMsg,
        };
        userPrefsByUserKey[userPrefKey] = updatedSenderPrefs;
        await saveUserSidebarPrefs(fastify, userPrefKey, updatedSenderPrefs);
      }

      return {
        success: true,
        mode,
        conversation: formatConversationForUser(
          conv,
          user,
          staffDirectory,
          userPrefsByUserKey[userPrefKey] || currentSenderPrefs,
          userPrefsByUserKey
        ),
        targetMessage: moveResult.targetMessage,
        promotedMessage: moveResult.promotedMessage,
        tasks,
      };
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
      const { conversationId, emoji, replyId } = request.body as {
        conversationId: string;
        emoji: string;
        replyId?: string;
      };
      const [{ conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      const conv = conversations.find((c) => c.id === conversationId);
      if (!conv) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy cuộc trò chuyện' });
      }

      // Find target message: root message or thread reply
      let targetMsg: MosChatMessage | MosChatThreadReply | undefined;
      const rootMsg = conv.messages.find((m) => m.id === messageId);
      if (rootMsg) {
        if (replyId) {
          targetMsg = (rootMsg.thread || []).find((r) => r.id === replyId);
        } else {
          targetMsg = rootMsg;
        }
      } else {
        // Fallback: check if messageId is directly a reply ID
        for (const m of conv.messages) {
          const replyItem = (m.thread || []).find((r) => r.id === messageId);
          if (replyItem) {
            targetMsg = replyItem;
            break;
          }
        }
      }

      if (!targetMsg) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy tin nhắn' });
      }
      if (!canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Tin nhắn trực tiếp (Direct Message) chỉ hiển thị cho 2 người tham gia.',
        });
      }
      targetMsg.reactions = targetMsg.reactions || {};
      targetMsg.reactionUsers = targetMsg.reactionUsers || {};

      const existingUsers = targetMsg.reactionUsers[emoji];
      const currentCount = targetMsg.reactions[emoji] || 0;

      if (Array.isArray(existingUsers)) {
        const normalized = existingUsers.map(String);
        if (normalized.includes(userKey)) {
          const remaining = normalized.filter((u) => u !== userKey);
          if (remaining.length === 0) {
            delete targetMsg.reactions[emoji];
            delete targetMsg.reactionUsers[emoji];
          } else {
            targetMsg.reactionUsers[emoji] = remaining;
            targetMsg.reactions[emoji] = remaining.length;
          }
        } else {
          const updated = [...normalized, userKey];
          targetMsg.reactionUsers[emoji] = updated;
          targetMsg.reactions[emoji] = updated.length;
        }
      } else if (currentCount > 0) {
        // Legacy reaction without per-user tracking (e.g. inflated count): clicking undoes/clears it
        delete targetMsg.reactions[emoji];
        delete targetMsg.reactionUsers[emoji];
      } else {
        targetMsg.reactionUsers[emoji] = [userKey];
        targetMsg.reactions[emoji] = 1;
      }

      await saveConversations(fastify, conversations);
      return { success: true, reactions: targetMsg.reactions, reactionUsers: targetMsg.reactionUsers };
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

      const [{ conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      let conv = conversationId ? conversations.find((c) => c.id === conversationId) : undefined;
      if (!conv) {
        conv = conversations.find(
          (c) => c.messages.some((m) => m.id === messageId) && canUserAccessConversation(c, user, staffDirectory)
        );
      }
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

      const isOwner = canUserEditChatMessage(targetItem, user, staffRecord);

      if (!isOwner) {
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

      const [{ conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      let conv = conversationId ? conversations.find((c) => c.id === conversationId) : undefined;
      if (!conv) {
        conv = conversations.find(
          (c) => c.messages.some((m) => m.id === messageId) && canUserAccessConversation(c, user, staffDirectory)
        );
      }
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

  // POST /api/chat/messages/:messageId/restore (Restore soft-deleted message)
  fastify.post(
    '/chat/messages/:messageId/restore',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const { messageId } = request.params as { messageId: string };
      const body = ((request.body as SafeAny) || {}) as RestoreMosChatMessageRequest;
      const query = ((request.query as SafeAny) || {}) as RestoreMosChatMessageRequest;
      const conversationId = String(body.conversationId || query.conversationId || '').trim();
      const replyId = body.replyId || query.replyId ? String(body.replyId || query.replyId).trim() : undefined;

      const [{ conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      let conv = conversationId ? conversations.find((c) => c.id === conversationId) : undefined;
      if (!conv) {
        conv = conversations.find(
          (c) => c.messages.some((m) => m.id === messageId) && canUserAccessConversation(c, user, staffDirectory)
        );
      }
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
      const restorerName = staffRecord?.displayName || user.username || 'mOS User';

      const isOwner =
        String(targetItem.senderId) === String(user.id) ||
        (user.id && String(targetItem.senderId) === 'me') ||
        (staffRecord?.displayName && targetItem.senderName === staffRecord.displayName);
      const isAdmin = isDannyOrSuperAdminUser(user);

      if (!isOwner && !isAdmin) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Bạn chỉ có thể khôi phục tin nhắn của chính mình.',
        });
      }

      const now = new Date();
      targetItem.isDeleted = false;
      targetItem.deletedAt = null;
      targetItem.deletedBy = null;
      targetItem.deletedByName = null;
      if (targetItem.originalText && (!targetItem.text || targetItem.text.trim() === '')) {
        targetItem.text = targetItem.originalText;
      }

      targetItem.editHistory = targetItem.editHistory || [];
      targetItem.editHistory.push({
        text: targetItem.text,
        editedAt: now.toISOString(),
        editedBy: user.id,
        editorName: `${restorerName} (Đã khôi phục tin nhắn)`,
      });

      conv.updatedAt = now.toISOString();
      await saveConversations(fastify, conversations);
      return { success: true, message: msg, target: targetItem };
    }
  );

  // POST /api/chat/messages/:messageId/buzz (Buzz / Bump urgent message)
  fastify.post(
    '/chat/messages/:messageId/buzz',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const { messageId } = request.params as { messageId: string };
      const body = ((request.body as SafeAny) || {}) as BuzzMosChatMessageRequest;
      const conversationId = String(body.conversationId || '').trim();
      const replyId = body.replyId ? String(body.replyId).trim() : undefined;
      const note = body.note ? String(body.note).trim() : undefined;

      const [{ conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      let conv = conversationId ? conversations.find((c) => c.id === conversationId) : undefined;
      if (!conv) {
        conv = conversations.find(
          (c) => c.messages.some((m) => m.id === messageId) && canUserAccessConversation(c, user, staffDirectory)
        );
      }
      const msg = conv?.messages.find((m) => m.id === messageId);
      if (!conv || !msg) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy tin nhắn.' });
      }
      if (!canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Bạn không có quyền truy cập cuộc hội thoại này.',
        });
      }

      const targetItem = replyId ? msg.thread?.find((r) => r.id === replyId) : msg;
      if (!targetItem) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy câu trả lời trong luồng.' });
      }

      const myStaffId = resolveUserStaffId(user, staffDirectory);
      const staffRecord = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: myStaffId || Number(user.id) || 0 },
        select: { displayName: true, username: true, role: true, avatarUrl: true },
      });
      const senderName = staffRecord?.displayName || user.displayName || user.username || 'Nhân sự';
      const senderRole = staffRecord?.role || user.role || 'Staff';

      const isSender =
        Number(targetItem.senderId) === myStaffId ||
        String(targetItem.senderId) === String(user.id) ||
        (user.id && String(targetItem.senderId) === 'me') ||
        Boolean(
          staffRecord?.displayName &&
          targetItem.senderName?.trim().toLowerCase() === staffRecord.displayName.trim().toLowerCase()
        );
      const isAdmin = isDannyOrSuperAdminUser(user) || user.role === 'admin';

      if (!isSender && !isAdmin) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Chỉ người gửi tin nhắn hoặc Quản trị viên mới có thể Buzz / Bump tin nhắn này.',
        });
      }

      // Anti-spam Cooldown: 60 seconds between buzzes on the same message
      const now = new Date();
      if (targetItem.buzzedAt) {
        const lastBuzzTime = new Date(targetItem.buzzedAt).getTime();
        const diffSeconds = Math.floor((now.getTime() - lastBuzzTime) / 1000);
        const cooldownSeconds = 60;
        if (diffSeconds < cooldownSeconds) {
          const waitLeft = cooldownSeconds - diffSeconds;
          return reply.status(429).send({
            error: 'Too Many Requests',
            message: `Tin nhắn vừa được Buzz cách đây ${diffSeconds}s. Vui lòng chờ thêm ${waitLeft}s trước khi Buzz lại để tránh làm phiền đồng nghiệp.`,
            waitRemainingSeconds: waitLeft,
          });
        }
      }

      const buzzEvent: MosChatBuzzEvent = {
        id: `buzz-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        senderId: myStaffId || user.id || 'unknown',
        senderName,
        senderRole,
        senderAvatar: staffRecord?.avatarUrl || null,
        buzzedAt: now.toISOString(),
        note: note || null,
      };

      targetItem.isBuzzed = true;
      targetItem.buzzedAt = buzzEvent.buzzedAt;
      targetItem.latestBuzz = buzzEvent;
      targetItem.buzzHistory = [...(targetItem.buzzHistory || []), buzzEvent];
      targetItem.buzzCount = targetItem.buzzHistory.length;

      conv.updatedAt = now.toISOString();
      await saveConversations(fastify, conversations);

      const formattedConv = formatConversationForUser(conv, user, staffDirectory);
      const formattedMsg = formattedConv.messages.find((m) => m.id === messageId) || msg;

      return {
        success: true,
        message: formattedMsg,
        buzzEvent,
        conversation: formattedConv,
      };
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
      const normAssignee = rawAssigneeName.toLowerCase();
      const isGenericAssignee =
        !normAssignee || ['staff', 'thành viên', 'chính tôi', 'tôi', 'me'].includes(normAssignee);

      let matchedAssignee = staffDirectory.find(
        (s) =>
          (rawAssigneeId > 0 && s.id === rawAssigneeId) ||
          (!isGenericAssignee &&
            (String(s.displayName || '')
              .trim()
              .toLowerCase() === normAssignee ||
              String(s.username || '')
                .trim()
                .toLowerCase() === normAssignee))
      );

      // Self-assign fallback: if unassigned, generic label, or assignee not found, fallback to creator
      if (!matchedAssignee) {
        const myStaffId = resolveUserStaffId(user, staffDirectory);
        if (myStaffId > 0) {
          matchedAssignee = staffDirectory.find((s) => s.id === myStaffId);
        } else if (Number(user.id) > 0) {
          matchedAssignee = staffDirectory.find((s) => s.id === Number(user.id));
        }
      }

      if (!matchedAssignee) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Vui lòng chọn Người phụ trách từ danh sách nhân sự đang hoạt động.',
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
          text:
            canonicalAssigneeId === Number(user.id) || canonicalAssigneeId === resolveUserStaffId(user, staffDirectory)
              ? 'Tự tạo việc cho chính mình:'
              : `Giao việc cho ${canonicalAssigneeName}:`,
          timeLabel: formatTimeLabel(now),
          createdAt: now.toISOString(),
          taskId,
          reactions: {},
          thread: [],
        });
      }

      let deadlineIso: string | null = null;
      const rawDeadline = body.deadline !== undefined ? body.deadline : body.dueAt;
      if (rawDeadline) {
        const parsedDeadline = new Date(rawDeadline);
        if (!isNaN(parsedDeadline.getTime())) {
          deadlineIso = parsedDeadline.toISOString();
        }
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
        assignerName: (body as SafeAny).assignerName || creatorName,
        priority: body.priority || 'HIGH',
        remindAt: remindAtDate.toISOString(),
        dueAt: deadlineIso,
        deadline: deadlineIso,
        negotiationNote: body.negotiationNote ? String(body.negotiationNote).trim() : null,
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
      const body = request.body as UpdateMosChatTaskRequest;
      const user = request.user as JwtUserPayload;

      const [{ tasks, conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      const task = tasks.find((t) => t.id === taskId);
      if (!task) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy công việc' });
      }
      const conv = conversations.find((c) => c.id === task.conversationId);
      if (conv && !canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền chỉnh sửa công việc này' });
      }

      const now = new Date();
      if (typeof body.title === 'string' && body.title.trim()) {
        task.title = body.title.trim();
      }
      if (body.assigneeId !== undefined) {
        task.assigneeId = body.assigneeId;
      }
      if (typeof body.assigneeName === 'string' && body.assigneeName.trim()) {
        task.assigneeName = body.assigneeName.trim();
      }
      if (body.priority && ['URGENT', 'HIGH', 'NORMAL'].includes(body.priority)) {
        task.priority = body.priority;
      }
      if (typeof body.done === 'boolean') {
        task.done = body.done;
      }
      if (typeof body.archived === 'boolean') {
        task.archived = body.archived;
        task.archivedAt = body.archived ? now.toISOString() : null;
      }
      if (typeof body.snoozeSeconds === 'number' && body.snoozeSeconds > 0) {
        task.remindAt = new Date(now.getTime() + body.snoozeSeconds * 1000).toISOString();
        task.fired = false;
        task.done = false;
      } else if (typeof body.remindInSeconds === 'number') {
        if (body.remindInSeconds > 0) {
          task.remindAt = new Date(now.getTime() + body.remindInSeconds * 1000).toISOString();
          task.fired = false;
        } else {
          task.remindAt = now.toISOString();
          task.fired = true;
        }
      } else if (body.remindAt) {
        const parsed = new Date(body.remindAt);
        if (!isNaN(parsed.getTime())) {
          task.remindAt = parsed.toISOString();
          task.fired = parsed.getTime() <= now.getTime();
        }
      }
      if (body.triggerReminderNow && !task.fired) {
        task.fired = true;
        task.remindAt = now.toISOString();
      }
      if (body.deadline !== undefined || body.dueAt !== undefined) {
        const rawDeadline = body.deadline !== undefined ? body.deadline : body.dueAt;
        if (!rawDeadline) {
          task.deadline = null;
          task.dueAt = null;
        } else {
          const parsed = new Date(rawDeadline);
          if (!isNaN(parsed.getTime())) {
            task.deadline = parsed.toISOString();
            task.dueAt = parsed.toISOString();
          }
        }
      }
      if (body.negotiatedDeadline !== undefined) {
        if (!body.negotiatedDeadline) {
          task.negotiatedDeadline = null;
        } else {
          const parsed = new Date(body.negotiatedDeadline);
          if (!isNaN(parsed.getTime())) {
            task.negotiatedDeadline = parsed.toISOString();
          }
        }
      }
      if (body.negotiationNote !== undefined) {
        task.negotiationNote = body.negotiationNote ? String(body.negotiationNote).trim() : null;
      }
      if (body.negotiatedBy !== undefined) {
        task.negotiatedBy = body.negotiatedBy ? String(body.negotiatedBy).trim() : null;
      }
      if (body.negotiatedAt !== undefined) {
        task.negotiatedAt = body.negotiatedAt ? String(body.negotiatedAt) : null;
      }
      if (body.acceptNegotiatedDeadline && task.negotiatedDeadline) {
        task.deadline = task.negotiatedDeadline;
        task.dueAt = task.negotiatedDeadline;
        task.negotiatedDeadline = null;
        task.negotiationNote = null;
        task.negotiatedBy = null;
        task.negotiatedAt = null;
      } else if (body.rejectNegotiatedDeadline) {
        task.negotiatedDeadline = null;
        task.negotiationNote = null;
        task.negotiatedBy = null;
        task.negotiatedAt = null;
      }
      task.updatedAt = now.toISOString();

      await saveTasks(fastify, tasks);
      return { success: true, task };
    }
  );

  // DELETE /api/chat/tasks/:taskId
  fastify.delete(
    '/chat/tasks/:taskId',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { taskId } = request.params as { taskId: string };
      const user = request.user as JwtUserPayload;
      const [{ tasks, conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      const taskIndex = tasks.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy công việc' });
      }

      const deletedTask = tasks[taskIndex];
      const conv = conversations.find((c) => c.id === deletedTask.conversationId);
      if (conv && !canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền xoá công việc này' });
      }
      tasks.splice(taskIndex, 1);

      // Clean up taskId link in conversations messages if present
      let convChanged = false;
      if (deletedTask.sourceMessageId || deletedTask.conversationId) {
        for (const c of conversations) {
          if (c.id === deletedTask.conversationId) {
            for (const m of c.messages) {
              if (m.taskId === taskId) {
                delete m.taskId;
                convChanged = true;
              }
            }
          }
        }
      }

      await Promise.all([
        saveTasks(fastify, tasks),
        convChanged ? saveConversations(fastify, conversations) : Promise.resolve(),
      ]);

      return { success: true, taskId, message: 'Đã xoá công việc thành công' };
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
          select: { id: true, username: true, displayName: true, role: true, avatarUrl: true, lastActiveAt: true },
        });
        const nowMs = Date.now();
        initialMembers = staffRows.map((s) => ({
          id: s.id,
          username: s.username,
          displayName: s.displayName || s.username,
          role: s.role,
          avatarUrl: s.avatarUrl,
          isOnline: Boolean(s.lastActiveAt && nowMs - new Date(s.lastActiveAt).getTime() < 5 * 60 * 1000),
        }));
      }

      const newConv: MosChatConversation = {
        id,
        type: 'space',
        name: normalizedName,
        subtitle: body.subtitle || 'Không gian phối hợp trên mOS',
        roleTag: String(initialMemberIds.length || 1),
        color: body.color?.trim() || '#3b82f6',
        avatar: body.avatar?.trim() || getInitials(rawName, user.username),
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
        const nowIso = new Date().toISOString();
        const msgs = targetConv.messages || [];
        const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
        const userPrefKey = resolveUserPrefKey(user, staffDirectory);
        const currentPrefs = userPrefsByUserKey[userPrefKey] || buildDefaultUserSidebarPrefs();

        const threadRepliesUpdates: Record<string, number> = {};
        const threadAtUpdates: Record<string, string> = {};
        const threadLastReplyUpdates: Record<string, string> = {};
        for (const m of msgs) {
          if (m.thread && m.thread.length > 0) {
            const threadKey = `${convId}::${m.id}`;
            const repCount = m.thread.length;
            threadRepliesUpdates[m.id] = repCount;
            threadRepliesUpdates[threadKey] = repCount;
            threadAtUpdates[m.id] = nowIso;
            threadAtUpdates[threadKey] = nowIso;
            const lastRep = m.thread[m.thread.length - 1];
            if (lastRep?.id) {
              threadLastReplyUpdates[m.id] = lastRep.id;
              threadLastReplyUpdates[threadKey] = lastRep.id;
            }
          }
        }

        const updatedPrefs: MosChatUserSidebarPrefs = {
          ...currentPrefs,
          manualUnreadIds: (currentPrefs.manualUnreadIds || []).filter((id) => id !== convId),
          readMessageCountByConv: {
            ...(currentPrefs.readMessageCountByConv || {}),
            [convId]: msgs.length,
          },
          readAtByConv: {
            ...(currentPrefs.readAtByConv || {}),
            [convId]: nowIso,
          },
          lastReadMessageIdByConv: {
            ...(currentPrefs.lastReadMessageIdByConv || {}),
            ...(lastMsg?.id ? { [convId]: lastMsg.id } : {}),
          },
          readThreadReplyCountByMsg: {
            ...(currentPrefs.readThreadReplyCountByMsg || {}),
            ...threadRepliesUpdates,
          },
          readThreadAtByMsg: {
            ...(currentPrefs.readThreadAtByMsg || {}),
            ...threadAtUpdates,
          },
          lastReadThreadReplyIdByMsg: {
            ...(currentPrefs.lastReadThreadReplyIdByMsg || {}),
            ...threadLastReplyUpdates,
          },
        };
        const saved = await saveUserSidebarPrefs(fastify, userPrefKey, updatedPrefs);
        return {
          success: true,
          unreadCount: 0,
          userPrefs: saved,
          conversation: formatConversationForUser(targetConv, user, staffDirectory, saved, state.userPrefsByUserKey),
        };
      } catch (err: SafeAny) {
        fastify.log.error('Mark conversation as read error:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể đánh dấu đã đọc' });
      }
    }
  );

  // POST /api/chat/conversations/:id/threads/:messageId/read (Explicitly mark a sub-thread as read)
  fastify.post(
    '/chat/conversations/:id/threads/:messageId/read',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const { id: convId, messageId } = request.params as { id: string; messageId: string };
        const state = await loadChatState(fastify);
        const { conversations, userPrefsByUserKey } = state;
        const staffDirectory = await loadStaffDirectoryCached(fastify);
        const targetConv = conversations.find((c) => c.id === convId);
        if (!targetConv) {
          return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy cuộc trò chuyện' });
        }
        const targetMsg = targetConv.messages?.find((m) => m.id === messageId);
        if (!targetMsg) {
          return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy tin nhắn gốc của luồng' });
        }
        const nowIso = new Date().toISOString();
        const replies = targetMsg.thread || [];
        const lastReply = replies.length > 0 ? replies[replies.length - 1] : null;
        const threadKey = `${convId}::${messageId}`;
        const userPrefKey = resolveUserPrefKey(user, staffDirectory);
        const currentPrefs = userPrefsByUserKey[userPrefKey] || buildDefaultUserSidebarPrefs();
        const updatedPrefs: MosChatUserSidebarPrefs = {
          ...currentPrefs,
          readThreadReplyCountByMsg: {
            ...(currentPrefs.readThreadReplyCountByMsg || {}),
            [messageId]: replies.length,
            [threadKey]: replies.length,
          },
          readThreadAtByMsg: {
            ...(currentPrefs.readThreadAtByMsg || {}),
            [messageId]: nowIso,
            [threadKey]: nowIso,
          },
          lastReadThreadReplyIdByMsg: {
            ...(currentPrefs.lastReadThreadReplyIdByMsg || {}),
            ...(lastReply?.id ? { [messageId]: lastReply.id, [threadKey]: lastReply.id } : {}),
          },
        };
        const saved = await saveUserSidebarPrefs(fastify, userPrefKey, updatedPrefs);
        return {
          success: true,
          unreadThreadReplyCount: 0,
          userPrefs: saved,
          conversation: formatConversationForUser(targetConv, user, staffDirectory, saved, state.userPrefsByUserKey),
        };
      } catch (err: SafeAny) {
        fastify.log.error('Mark thread as read error:', err);
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', message: 'Không thể đánh dấu đã đọc luồng trả lời' });
      }
    }
  );

  // POST /api/chat/conversations/:id/unread (Explicitly mark conversation as unread)
  fastify.post(
    '/chat/conversations/:id/unread',
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
        const currentManual = currentPrefs.manualUnreadIds || [];
        const nextManual = currentManual.includes(convId) ? currentManual : [...currentManual, convId];
        const updatedPrefs = {
          ...currentPrefs,
          manualUnreadIds: nextManual,
          readMessageCountByConv: {
            ...(currentPrefs.readMessageCountByConv || {}),
            [convId]: Math.max(0, (targetConv.messages?.length || 1) - 1),
          },
          updatedAt: new Date().toISOString(),
        };
        const saved = await saveUserSidebarPrefs(fastify, userPrefKey, updatedPrefs);
        const unreadCount = computeUnreadCountForUser(targetConv, user, staffDirectory, saved);
        return {
          success: true,
          unreadCount: Math.max(1, unreadCount),
          userPrefs: saved,
        };
      } catch (err: SafeAny) {
        fastify.log.error('Mark conversation as unread error:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể đánh dấu chưa đọc' });
      }
    }
  );

  // POST /api/chat/conversations/:id/pin (Toggle or explicitly set pin status of conversation in user's sidebar)
  fastify.post(
    '/chat/conversations/:id/pin',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const convId = String((request.params as { id: string }).id || '').trim();
        const body = (request.body || {}) as { pinned?: boolean };
        const state = await loadChatState(fastify);
        const { conversations, userPrefsByUserKey } = state;
        const staffDirectory = await loadStaffDirectoryCached(fastify);
        const targetConv = conversations.find((c) => c.id === convId);
        const isSpecialPersonalConv = convId === 'ai-copilot-mos' || convId.startsWith('dm-self-');
        if (!targetConv && !isSpecialPersonalConv) {
          return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy cuộc trò chuyện' });
        }
        const userPrefKey = resolveUserPrefKey(user, staffDirectory);
        const currentPrefs = userPrefsByUserKey[userPrefKey] || buildDefaultUserSidebarPrefs();
        const exists = (currentPrefs.pinnedIds || []).includes(convId);
        const shouldPin = typeof body.pinned === 'boolean' ? body.pinned : !exists;
        const filteredPinned = (currentPrefs.pinnedIds || []).filter((id) => id !== convId);
        const nextPinned = shouldPin ? [convId, ...filteredPinned] : filteredPinned;
        const updatedPrefs = {
          ...currentPrefs,
          pinnedIds: nextPinned,
          updatedAt: new Date().toISOString(),
        };
        const saved = await saveUserSidebarPrefs(fastify, userPrefKey, updatedPrefs);
        return {
          success: true,
          pinned: shouldPin,
          userPrefs: saved,
        };
      } catch (err: SafeAny) {
        fastify.log.error('Toggle conversation pin error:', err);
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', message: 'Không thể thay đổi trạng thái ghim' });
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

      const [{ conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      const conv = conversations.find((c) => c.id === id);
      if (!conv) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy cuộc hội thoại' });
      }

      if (!canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền truy cập không gian này.' });
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
        select: { id: true, username: true, displayName: true, role: true, avatarUrl: true, lastActiveAt: true },
      });

      if (staffList.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy nhân sự' });
      }

      const nowMs = Date.now();
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
            isOnline: Boolean(staff.lastActiveAt && nowMs - new Date(staff.lastActiveAt).getTime() < 5 * 60 * 1000),
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

      const [{ conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      const conv = conversations.find((c) => c.id === id);
      if (!conv) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy cuộc hội thoại' });
      }

      if (!canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền truy cập không gian này.' });
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

  // PUT /api/chat/conversations/:id/nickname (Change member's nickname in a group/space)
  // - Any user can change their own nickname in any space they belong to.
  // - Danny / Super Admin / Admin can change anyone's nickname in the space.
  fastify.put(
    '/chat/conversations/:id/nickname',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const { id } = request.params as { id: string };
      const body = (request.body || {}) as UpdateMosChatNicknameRequest;

      const [{ conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      const conv = conversations.find((c) => c.id === id);
      if (!conv) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy cuộc hội thoại' });
      }

      if (!canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền truy cập không gian này.' });
      }

      const myStaffId = resolveUserStaffId(user, staffDirectory);
      const targetStaffId = body.targetStaffId ? Number(body.targetStaffId) : myStaffId;

      if (!targetStaffId) {
        return reply
          .status(400)
          .send({ error: 'Bad Request', message: 'Không xác định được nhân sự cần đổi biệt danh' });
      }

      const isSelf = targetStaffId === myStaffId;
      const isAdmin = isDannyOrSuperAdminUser(user);

      if (!isSelf && !isAdmin) {
        return reply.status(403).send({
          error: 'Forbidden',
          message:
            'Bạn chỉ có thể đổi biệt danh của chính mình. Chỉ Quản trị viên mới được đổi biệt danh cho người khác.',
        });
      }

      const targetStaff = staffDirectory.find((s) => s.id === targetStaffId);
      const targetName = targetStaff?.displayName || targetStaff?.username || `ID #${targetStaffId}`;
      const operatorStaff = staffDirectory.find((s) => s.id === myStaffId);
      const operatorName = operatorStaff?.displayName || user.displayName || user.username || 'Thành viên';

      conv.memberNicknames = conv.memberNicknames || {};
      const rawNick = typeof body.nickname === 'string' ? body.nickname.trim() : '';

      const now = new Date();
      if (!rawNick) {
        // Gỡ bỏ biệt danh
        delete conv.memberNicknames[String(targetStaffId)];
        conv.messages.push({
          id: `msg-${crypto.randomUUID().slice(0, 8)}`,
          conversationId: conv.id,
          senderId: 'system',
          senderName: 'Hệ thống mOS',
          senderRole: 'Hệ thống',
          senderAvatar: '🏷️',
          roleColor: '#3b82f6',
          text: isSelf
            ? `${operatorName} đã gỡ biệt danh của mình trong nhóm.`
            : `${operatorName} đã gỡ biệt danh của ${targetName} trong nhóm.`,
          timeLabel: formatTimeLabel(now),
          createdAt: now.toISOString(),
          reactions: {},
          thread: [],
          isSystemReminder: true,
        });
      } else {
        // Đặt biệt danh mới (tối đa 40 ký tự)
        const sanitizedNick = rawNick.slice(0, 40);
        conv.memberNicknames[String(targetStaffId)] = sanitizedNick;
        conv.messages.push({
          id: `msg-${crypto.randomUUID().slice(0, 8)}`,
          conversationId: conv.id,
          senderId: 'system',
          senderName: 'Hệ thống mOS',
          senderRole: 'Hệ thống',
          senderAvatar: '🏷️',
          roleColor: '#3b82f6',
          text: isSelf
            ? `${operatorName} đã đổi biệt danh của mình thành "${sanitizedNick}".`
            : `${operatorName} đã đặt biệt danh cho ${targetName} là "${sanitizedNick}".`,
          timeLabel: formatTimeLabel(now),
          createdAt: now.toISOString(),
          reactions: {},
          thread: [],
          isSystemReminder: true,
        });
      }
      conv.updatedAt = now.toISOString();

      await saveConversations(fastify, conversations);
      return {
        success: true,
        conversation: conv,
        memberNicknames: conv.memberNicknames,
      };
    }
  );

  // PATCH /api/chat/conversations/:id (Cấu hình Không gian Space: Tên, Mô tả, Emoji đại diện, Màu chủ đạo)
  fastify.patch(
    '/chat/conversations/:id',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user as JwtUserPayload;
      const { id } = request.params as { id: string };
      const body = (request.body || {}) as UpdateMosChatSpaceConfigRequest;

      const [{ conversations }, staffDirectory] = await Promise.all([
        loadChatState(fastify),
        loadStaffDirectoryCached(fastify),
      ]);
      const conv = conversations.find((c) => c.id === id);
      if (!conv) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy cuộc hội thoại' });
      }

      if (conv.type !== 'space') {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Chỉ hỗ trợ chỉnh sửa cấu hình cho Không gian làm việc (Space).',
        });
      }

      if (!canUserAccessConversation(conv, user, staffDirectory)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền truy cập không gian này.' });
      }

      const myStaffId = resolveUserStaffId(user, staffDirectory);
      const isMember = conv.memberIds ? conv.memberIds.includes(myStaffId) : true;
      const isAdmin = isDannyOrSuperAdminUser(user);

      if (!isMember && !isAdmin) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Chỉ thành viên của Không gian hoặc Quản trị viên mới được chỉnh sửa cấu hình.',
        });
      }

      const changes: string[] = [];

      // 1. Tên Không gian
      if (body.name !== undefined) {
        const cleanName = String(body.name).trim().toLowerCase().replace(/\s+/g, '-');
        if (!cleanName) {
          return reply.status(400).send({ error: 'Bad Request', message: 'Tên Không gian không được để trống.' });
        }
        if (conv.name !== cleanName) {
          changes.push(`tên thành "#${cleanName}"`);
          conv.name = cleanName;
        }
      }

      // 2. Mục đích hoạt động
      if (body.subtitle !== undefined) {
        const cleanSubtitle = String(body.subtitle).trim() || undefined;
        if (conv.subtitle !== cleanSubtitle) {
          conv.subtitle = cleanSubtitle;
          changes.push('mô tả hoạt động');
        }
      }

      // 3. Emoji đại diện cho Space
      if (body.avatar !== undefined) {
        const cleanEmoji = String(body.avatar).trim();
        if (conv.avatar !== cleanEmoji) {
          conv.avatar = cleanEmoji || undefined;
          changes.push(`biểu tượng Emoji thành ${cleanEmoji || '(mặc định)'}`);
        }
      }

      // 4. Màu chủ đạo
      if (body.color !== undefined) {
        const cleanColor = String(body.color).trim();
        if (cleanColor && conv.color !== cleanColor) {
          conv.color = cleanColor;
          changes.push('màu chủ đạo');
        }
      }

      const now = new Date();
      conv.updatedAt = now.toISOString();

      // Nếu có thay đổi, ghi system message vào luồng chat của Space
      if (changes.length > 0) {
        const operatorStaff = staffDirectory.find((s) => s.id === myStaffId);
        const operatorName = operatorStaff?.displayName || user.displayName || user.username || 'Thành viên';
        conv.messages.push({
          id: `msg-${crypto.randomUUID().slice(0, 8)}`,
          conversationId: conv.id,
          senderId: 'system',
          senderName: 'Hệ thống mOS',
          senderRole: 'Cấu hình Space',
          senderAvatar: conv.avatar || '⚙️',
          roleColor: conv.color || '#3b82f6',
          text: `${operatorName} đã cập nhật cấu hình Không gian: đổi ${changes.join(', ')}.`,
          timeLabel: formatTimeLabel(now),
          createdAt: now.toISOString(),
          reactions: {},
          thread: [],
          isSystemReminder: true,
        });
      }

      await saveConversations(fastify, conversations);
      return {
        success: true,
        conversation: conv,
      };
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

  // ================= DYNAMIC WORKFLOW ENGINE ENDPOINTS =================

  // GET /api/chat/workflows
  fastify.get(
    '/chat/workflows',
    {
      preHandler: [requireAuth],
    },
    async (_request, reply) => {
      try {
        const wfState = await loadWorkflowState(fastify);
        return {
          success: true,
          templates: wfState.templates,
          instances: wfState.instances,
        };
      } catch (err: SafeAny) {
        fastify.log.error('GET /chat/workflows error:', err);
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', message: 'Không thể tải danh sách quy trình.' });
      }
    }
  );

  // POST /api/chat/workflows/instances (Super Admin Only: Trigger a Workflow Card in a Conversation)
  fastify.post(
    '/chat/workflows/instances',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        if (!isDannyOrSuperAdminUser(user)) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Chỉ Super Admin mới có quyền khởi tạo Quy trình (Workflow) trên mOS Chat.',
          });
        }

        const body = (request.body || {}) as CreateMosChatWorkflowInstanceRequest;
        if (!body.conversationId || !body.templateCode) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Thiếu mã cuộc trò chuyện hoặc mã mẫu quy trình.',
          });
        }

        const [{ conversations, tasks, userPrefsByUserKey }, staffDirectory, wfState] = await Promise.all([
          loadChatState(fastify),
          loadStaffDirectoryCached(fastify),
          loadWorkflowState(fastify),
        ]);

        const conv = conversations.find((c) => c.id === body.conversationId);
        if (!conv) {
          return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy phòng chat.' });
        }

        const template = wfState.templates.find((t) => t.code === body.templateCode) || wfState.templates[0];
        if (!template) {
          return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy mẫu quy trình.' });
        }

        const senderStaffId = resolveUserStaffId(user, staffDirectory);
        const senderStaff = staffDirectory.find((s) => s.id === senderStaffId);
        const senderName =
          senderStaff?.displayName || (user as SafeAny)?.fullName || user?.username || 'Danny (Super Admin)';
        const roleInfo = getRoleDisplayLabel(senderStaff?.role || user?.role);

        const now = new Date();
        const nowIso = now.toISOString();
        const instanceId = `wf-inst-${Date.now()}`;
        const messageId = `msg-wf-${Date.now()}`;

        const formData: Record<string, unknown> = {
          ...(body.formData || {}),
        };

        if (template.targetSystemHook === 'STOCK_INVENTORY') {
          const warehouse = String(formData.warehouse || 'detham');
          const rawItems = Array.isArray(formData.inventoryItems) ? (formData.inventoryItems as SafeAny[]) : undefined;
          formData.inventoryItems = await computeInventoryReconciliation(fastify, warehouse, rawItems);
          formData.warehouse = warehouse;
        }

        const steps = template.steps.map((s, idx) => {
          const override = body.stepActorOverrides?.[idx];
          return {
            ...s,
            index: idx,
            actorStaffId: override?.actorStaffId ?? s.actorStaffId ?? (idx === 0 ? senderStaffId : null),
            actorName: override?.actorName ?? s.actorName ?? (idx === 0 ? senderName : null),
            actorRole: override?.actorRole ?? s.actorRole,
          };
        });

        // Step 0 is completed immediately upon submitting the workflow request card; advance to Step 1 if available
        const nextStepIndex = steps.length > 1 ? 1 : 0;
        const stepLogs: MosChatWorkflowStepLog[] = steps.map((s, idx) => ({
          stepIndex: idx,
          stepId: s.id,
          stepTitle: s.title,
          status: idx === 0 && steps.length > 1 ? 'COMPLETED' : 'PENDING',
          actorStaffId: idx === 0 ? senderStaffId : (s.actorStaffId ?? null),
          actorName: idx === 0 ? senderName : (s.actorName ?? null),
          actorRole: s.actorRole,
          note: idx === 0 ? String(formData.reason || formData.notes || 'Khởi tạo quy trình') : null,
          actedAt: idx === 0 && steps.length > 1 ? nowIso : null,
        }));

        const instance: MosChatWorkflowInstance = {
          id: instanceId,
          templateId: template.id,
          templateCode: template.code,
          templateName: template.name,
          category: template.category,
          targetSystemHook: template.targetSystemHook,
          title: (body.title || template.name).trim(),
          conversationId: conv.id,
          messageId,
          status: 'IN_PROGRESS',
          currentStepIndex: nextStepIndex,
          initiatorStaffId: senderStaffId,
          initiatorName: senderName,
          steps,
          stepLogs,
          formData,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        const activeStep = steps[nextStepIndex];
        let createdTask: MosChatTaskItem | null = null;
        if (activeStep) {
          createdTask = {
            id: `task-wf-${Date.now()}`,
            conversationId: conv.id,
            conversationName: conv.name,
            sourceMessageId: messageId,
            sourceAuthorName: senderName,
            title: `[Quy trình: ${instance.title}] Bước ${nextStepIndex + 1}: ${activeStep.title}`,
            assigneeId: activeStep.actorStaffId ?? undefined,
            assigneeName: activeStep.actorName || activeStep.actorRole || 'Quản lý / Người duyệt',
            creatorName: senderName,
            priority: 'URGENT',
            remindAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
            deadline: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
            done: false,
            fired: false,
            createdAt: nowIso,
          };
          tasks.unshift(createdTask);
        }

        const newMessage: MosChatMessage = {
          id: messageId,
          conversationId: conv.id,
          senderId: senderStaffId,
          senderName,
          senderRole: roleInfo.label,
          senderAvatar: senderStaff?.avatarUrl || getInitials(senderName, user?.username),
          roleColor: roleInfo.color,
          text: `⚡ **[Quy trình: ${template.name}]** ${instance.title}`,
          timeLabel: formatTimeLabel(now),
          createdAt: nowIso,
          taskId: createdTask?.id ?? null,
          workflowInstanceId: instance.id,
          workflow: instance,
          thread: [],
        };

        conv.messages.push(newMessage);
        conv.updatedAt = nowIso;

        const nextInstances = [instance, ...wfState.instances];
        await Promise.all([
          saveWorkflowInstances(fastify, nextInstances),
          saveConversations(fastify, conversations),
          saveTasks(fastify, tasks),
        ]);

        const userPrefKey = resolveUserPrefKey(user, staffDirectory);
        const formattedConv = formatConversationForUser(
          conv,
          user,
          staffDirectory,
          userPrefsByUserKey[userPrefKey],
          userPrefsByUserKey
        );

        return {
          success: true,
          workflow: instance,
          message: newMessage,
          conversation: formattedConv,
          task: createdTask,
        };
      } catch (err: SafeAny) {
        fastify.log.error('POST /chat/workflows/instances error:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể khởi tạo quy trình.' });
      }
    }
  );

  // POST /api/chat/workflows/instances/:instanceId/action (Advance / Approve / Reject / Confirm Workflow Step)
  fastify.post(
    '/chat/workflows/instances/:instanceId/action',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const { instanceId } = request.params as { instanceId: string };
        const body = (request.body || {}) as ActionMosChatWorkflowInstanceRequest;

        const [{ conversations, tasks, userPrefsByUserKey }, staffDirectory, wfState] = await Promise.all([
          loadChatState(fastify),
          loadStaffDirectoryCached(fastify),
          loadWorkflowState(fastify),
        ]);

        const instance = wfState.instances.find((i) => i.id === instanceId);
        if (!instance) {
          return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy phiên quy trình.' });
        }

        const actorStaffId = resolveUserStaffId(user, staffDirectory);
        const actorStaff = staffDirectory.find((s) => s.id === actorStaffId);
        const actorName = actorStaff?.displayName || (user as SafeAny)?.fullName || user?.username || 'Nhân sự';
        const roleInfo = getRoleDisplayLabel(actorStaff?.role || user?.role);

        const currentStep = instance.steps[instance.currentStepIndex];
        const isSuperAdmin = isDannyOrSuperAdminUser(user);
        const isAssignedStepActor =
          Boolean(currentStep?.actorStaffId && Number(currentStep.actorStaffId) === actorStaffId) ||
          Boolean(currentStep?.actorRole === 'REQUESTER' && Number(instance.initiatorStaffId) === actorStaffId) ||
          Boolean(
            currentStep?.actorName && currentStep.actorName.trim().toLowerCase() === actorName.trim().toLowerCase()
          );

        if (!isSuperAdmin && !isAssignedStepActor) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Chỉ người phụ trách bước hiện tại hoặc Super Admin mới có quyền xác nhận bước này.',
          });
        }

        if (
          body.action !== 'REJECT' &&
          currentStep?.requireAttachment &&
          (!body.attachments || body.attachments.length === 0)
        ) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Bước này bắt buộc phải đính kèm ảnh chụp màn hình / chứng từ (UNC).',
          });
        }

        const now = new Date();
        const nowIso = now.toISOString();
        const sanitizedAttachments = sanitizeChatAttachments(body.attachments);

        if (body.payload && typeof body.payload === 'object') {
          instance.formData = {
            ...instance.formData,
            ...body.payload,
          };
        }

        // Record current step completion or rejection
        const logEntry = instance.stepLogs[instance.currentStepIndex] || {
          stepIndex: instance.currentStepIndex,
          stepId: currentStep?.id || `step-${instance.currentStepIndex + 1}`,
          stepTitle: currentStep?.title || `Bước ${instance.currentStepIndex + 1}`,
          status: 'PENDING',
        };
        logEntry.status = body.action === 'REJECT' ? 'REJECTED' : body.action === 'APPROVE' ? 'APPROVED' : 'COMPLETED';
        logEntry.actorStaffId = actorStaffId;
        logEntry.actorName = actorName;
        logEntry.actorRole = roleInfo.label;
        logEntry.note = body.note?.trim() || null;
        if (sanitizedAttachments.length > 0) {
          logEntry.attachments = sanitizedAttachments;
        }
        logEntry.actedAt = nowIso;
        instance.stepLogs[instance.currentStepIndex] = logEntry;

        let statusText = '';
        if (body.action === 'REJECT') {
          instance.status = 'REJECTED';
          statusText = `❌ **${actorName}** đã từ chối tại bước **"${currentStep?.title}"**${body.note ? `: "${body.note}"` : '.'}`;
        } else if (instance.currentStepIndex + 1 < instance.steps.length) {
          instance.currentStepIndex += 1;
          const nextStep = instance.steps[instance.currentStepIndex];
          statusText = `✅ **${actorName}** đã hoàn tất bước **"${currentStep?.title}"**${body.note ? ` (${body.note})` : ''}. Chuyển sang bước ${instance.currentStepIndex + 1}: **${nextStep.title}**.`;
        } else {
          instance.status = 'COMPLETED';
          const hookRes = await executeWorkflowSystemHook(fastify, instance, actorStaffId, actorName);
          instance.syncedRecordType = hookRes.syncedRecordType;
          instance.syncedRecordId = hookRes.syncedRecordId;
          instance.syncedSummary = hookRes.syncedSummary;
          statusText = `🎉 **${actorName}** đã xác nhận hoàn tất bước cuối **"${currentStep?.title}"**!\n📊 **Đồng bộ hệ thống**: ${hookRes.syncedSummary || 'Đã lưu trữ toàn bộ hồ sơ quy trình.'}`;
        }

        instance.updatedAt = nowIso;

        // Post audit trail reply into the message's thread and update linked task
        const conv = conversations.find((c) => c.id === instance.conversationId);
        let targetMsg: MosChatMessage | null = null;
        let threadReply: MosChatThreadReply | null = null;
        let updatedTask: MosChatTaskItem | null = null;

        if (conv) {
          targetMsg = conv.messages.find((m) => m.id === instance.messageId) || null;
          if (targetMsg) {
            targetMsg.workflow = instance;
            threadReply = {
              id: `reply-wf-${Date.now()}`,
              senderId: actorStaffId,
              senderName: actorName,
              senderRole: roleInfo.label,
              senderAvatar: actorStaff?.avatarUrl || getInitials(actorName, user?.username),
              roleColor: roleInfo.color,
              text: statusText,
              timeLabel: formatTimeLabel(now),
              createdAt: nowIso,
              attachments: sanitizedAttachments.length > 0 ? sanitizedAttachments : undefined,
            };
            targetMsg.thread = [...(targetMsg.thread || []), threadReply];
          }
          conv.updatedAt = nowIso;
        }

        const linkedTask = tasks.find((t) => t.sourceMessageId === instance.messageId && !t.done);
        if (linkedTask) {
          if (instance.status === 'COMPLETED' || instance.status === 'REJECTED') {
            linkedTask.done = true;
            linkedTask.updatedAt = nowIso;
          } else {
            const nextStep = instance.steps[instance.currentStepIndex];
            if (nextStep) {
              linkedTask.title = `[Quy trình: ${instance.title}] Bước ${instance.currentStepIndex + 1}: ${nextStep.title}`;
              linkedTask.assigneeId = nextStep.actorStaffId ?? undefined;
              linkedTask.assigneeName = nextStep.actorName || nextStep.actorRole || linkedTask.assigneeName;
              linkedTask.remindAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
              linkedTask.fired = false;
              linkedTask.updatedAt = nowIso;
            }
          }
          updatedTask = linkedTask;
        }

        await Promise.all([
          saveWorkflowInstances(fastify, wfState.instances),
          saveConversations(fastify, conversations),
          saveTasks(fastify, tasks),
        ]);

        const userPrefKey = resolveUserPrefKey(user, staffDirectory);
        const formattedConv = conv
          ? formatConversationForUser(conv, user, staffDirectory, userPrefsByUserKey[userPrefKey], userPrefsByUserKey)
          : null;

        return {
          success: true,
          workflow: instance,
          message: targetMsg,
          conversation: formattedConv,
          task: updatedTask,
          threadReply,
        };
      } catch (err: SafeAny) {
        fastify.log.error('POST /chat/workflows/instances/:instanceId/action error:', err);
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', message: 'Không thể cập nhật bước quy trình.' });
      }
    }
  );

  // POST /api/chat/workflows/templates/from-thread (Super Admin Only: Package Ad-hoc Thread -> Reusable Workflow or Upgrade Workflow via Chat)
  fastify.post(
    '/chat/workflows/templates/from-thread',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        if (!isDannyOrSuperAdminUser(user)) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Chỉ Super Admin mới có quyền đóng gói hoặc nâng cấp Quy trình (Workflow).',
          });
        }

        const body = (request.body || {}) as SaveThreadAsWorkflowTemplateRequest;
        if (!body.name || !body.name.trim()) {
          return reply.status(400).send({ error: 'Bad Request', message: 'Vui lòng nhập tên quy trình.' });
        }

        const [{ conversations }, staffDirectory, wfState] = await Promise.all([
          loadChatState(fastify),
          loadStaffDirectoryCached(fastify),
          loadWorkflowState(fastify),
        ]);

        const senderStaffId = resolveUserStaffId(user, staffDirectory);
        const senderStaff = staffDirectory.find((s) => s.id === senderStaffId);
        const creatorName =
          senderStaff?.displayName || (user as SafeAny)?.fullName || user?.username || 'Danny (Super Admin)';
        const roleInfo = getRoleDisplayLabel(senderStaff?.role || user?.role);

        const conv = conversations.find((c) => c.id === body.conversationId);
        const rootMsg = body.messageId ? conv?.messages.find((m) => m.id === body.messageId) : null;
        const threadContextMessages: Array<{ senderName: string; senderRole?: string; text: string }> = [];

        if (rootMsg) {
          threadContextMessages.push({
            senderName: rootMsg.senderName,
            senderRole: rootMsg.senderRole,
            text: rootMsg.text,
          });
          for (const r of rootMsg.thread || []) {
            threadContextMessages.push({
              senderName: r.senderName,
              senderRole: r.senderRole,
              text: r.text,
            });
          }
        }

        const template = await saveOrUpgradeWorkflowFromThread(
          fastify,
          body,
          creatorName,
          threadContextMessages,
          wfState.templates
        );

        let systemReply: MosChatThreadReply | null = null;
        if (conv && rootMsg) {
          const now = new Date();
          systemReply = {
            id: `reply-wf-tpl-${Date.now()}`,
            senderId: senderStaffId,
            senderName: creatorName,
            senderRole: roleInfo.label,
            senderAvatar: senderStaff?.avatarUrl || getInitials(creatorName, user?.username),
            roleColor: roleInfo.color,
            text: `✨ **Đã chuẩn hóa thành Quy trình Hệ thống**: **${template.name}** (\`${template.code}\` · v${template.version})\nCác bước tự động: ${template.steps.map((s, i) => `(${i + 1}) ${s.title}`).join(' → ')}`,
            timeLabel: formatTimeLabel(now),
            createdAt: now.toISOString(),
          };
          rootMsg.thread = [...(rootMsg.thread || []), systemReply];
          conv.updatedAt = now.toISOString();
          await saveConversations(fastify, conversations);
        }

        return {
          success: true,
          template,
          systemReply,
        };
      } catch (err: SafeAny) {
        fastify.log.error('POST /chat/workflows/templates/from-thread error:', err);
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', message: 'Không thể lưu quy trình từ luồng chat.' });
      }
    }
  );
}
