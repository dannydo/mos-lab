import type {
  MosChatConversation,
  MosChatMessage,
  MosChatStaffMember,
  MosChatUserSidebarPrefs,
} from '@mos-lab/shared';
import type { JwtUserPayload } from '../../middlewares/auth.js';
import {
  canUserAccessConversation,
  resolveDmParticipantIds,
  resolveUserPrefKey,
  resolveUserStaffId,
} from './chat-access.service.js';
import { getInitials, getRoleDisplayLabel } from './chat-format.service.js';
import { buildDefaultUserSidebarPrefs } from './chat-state-defaults.js';

export interface ResolvedChatTarget {
  conv: MosChatConversation;
  createdNewConversation: boolean;
}

export class ChatTargetResolutionError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'ChatTargetResolutionError';
    this.statusCode = statusCode;
  }
}

/**
 * Resolves existing spaces/DMs and creates missing self-DM or 1-1 DM rooms
 * for multi-target forwarding and mission sharing.
 */
export function resolveTargetChatConversations(params: {
  conversations: MosChatConversation[];
  user: JwtUserPayload;
  staffDirectory: MosChatStaffMember[];
  targetConversationIds: string[];
  targetStaffIds: number[];
  nowIso: string;
  maxTargets?: number;
}): ResolvedChatTarget[] {
  const {
    conversations,
    user,
    staffDirectory,
    targetConversationIds,
    targetStaffIds,
    nowIso,
    maxTargets = 20,
  } = params;

  const myStaffId = resolveUserStaffId(user, staffDirectory);
  const resolvedTargetsMap = new Map<string, ResolvedChatTarget>();

  for (const targetConvId of targetConversationIds) {
    if (resolvedTargetsMap.has(targetConvId)) continue;
    const targetConv = conversations.find((c) => c.id === targetConvId);
    if (!targetConv) {
      throw new ChatTargetResolutionError(`Không tìm thấy cuộc hội thoại đích (${targetConvId}).`, 404);
    }
    if (!canUserAccessConversation(targetConv, user, staffDirectory)) {
      throw new ChatTargetResolutionError(`Bạn không có quyền gửi tin nhắn vào "${targetConv.name}".`, 403);
    }
    resolvedTargetsMap.set(targetConv.id, { conv: targetConv, createdNewConversation: false });
  }

  for (const targetStaffId of targetStaffIds) {
    const staffTarget = staffDirectory.find((s) => Number(s.id) === targetStaffId);
    if (!staffTarget) {
      throw new ChatTargetResolutionError(`Không tìm thấy nhân sự đích (#${targetStaffId}).`, 404);
    }
    if (myStaffId <= 0) {
      throw new ChatTargetResolutionError(
        'Không xác định được tài khoản người gửi để tạo cuộc trò chuyện 1-1.',
        400
      );
    }

    if (targetStaffId === myStaffId) {
      const selfId = `dm-self-${myStaffId}`;
      let selfConv = conversations.find(
        (c) => c.id === selfId || (c.type === 'dm' && c.isSelf && Number(c.participantStaffId) === myStaffId)
      );
      let createdNew = false;
      if (!selfConv) {
        const displayName = staffTarget.displayName || user.username || 'Tôi';
        selfConv = {
          id: selfId,
          type: 'dm',
          name: `${displayName} (Ghi chú cho tôi)`,
          subtitle: 'Không gian lưu trữ ghi chú, hình ảnh & task cá nhân',
          roleTag: 'Cá nhân',
          color: '#6366f1',
          avatar: 'ME',
          isSelf: true,
          participantStaffId: myStaffId,
          memberIds: [myStaffId],
          memberCount: 1,
          unreadCount: 0,
          updatedAt: nowIso,
          messages: [],
        };
        conversations.unshift(selfConv);
        createdNew = true;
      }
      if (!resolvedTargetsMap.has(selfConv.id)) {
        resolvedTargetsMap.set(selfConv.id, { conv: selfConv, createdNewConversation: createdNew });
      }
      continue;
    }

    const pairIds = [Math.min(myStaffId, targetStaffId), Math.max(myStaffId, targetStaffId)];
    let existingDm = conversations.find((c) => {
      if (c.type !== 'dm' || c.isSelf) return false;
      const cIds = resolveDmParticipantIds(c, staffDirectory);
      return cIds.length === 2 && cIds.includes(myStaffId) && cIds.includes(targetStaffId);
    });
    let createdNew = false;
    if (!existingDm) {
      const peerRole = getRoleDisplayLabel(staffTarget.role);
      existingDm = {
        id: `dm-pair-${pairIds[0]}-${pairIds[1]}`,
        type: 'dm',
        name: staffTarget.displayName || staffTarget.username || `Nhân sự #${targetStaffId}`,
        subtitle: peerRole.label || 'Trò chuyện trực tiếp 1-1',
        roleTag: peerRole.label || '1-1',
        color: peerRole.color || '#10b981',
        avatar: staffTarget.avatarUrl || getInitials(staffTarget.displayName, staffTarget.username),
        memberCount: 2,
        participantStaffId: targetStaffId,
        memberIds: pairIds,
        unreadCount: 0,
        updatedAt: nowIso,
        messages: [],
      };
      conversations.unshift(existingDm);
      createdNew = true;
    }
    if (!resolvedTargetsMap.has(existingDm.id)) {
      resolvedTargetsMap.set(existingDm.id, { conv: existingDm, createdNewConversation: createdNew });
    }
  }

  const resolvedTargets = Array.from(resolvedTargetsMap.values());
  if (resolvedTargets.length === 0) {
    throw new ChatTargetResolutionError('Không có phòng đích hợp lệ để gửi.', 400);
  }
  if (resolvedTargets.length > maxTargets) {
    throw new ChatTargetResolutionError(`Chỉ có thể gửi tối đa ${maxTargets} nơi nhận trong một lần.`, 400);
  }

  return resolvedTargets;
}

/**
 * Advances sender's read cursors across all destination conversations after sending/forwarding/sharing.
 */
export function advanceSenderReadPrefsForTargets(params: {
  user: JwtUserPayload;
  staffDirectory: MosChatStaffMember[];
  userPrefsByUserKey: Record<string, MosChatUserSidebarPrefs>;
  deliveries: Array<{ conv: MosChatConversation; message: MosChatMessage }>;
  nowIso: string;
}): { userPrefKey: string; updatedSenderPrefs: MosChatUserSidebarPrefs } {
  const { user, staffDirectory, userPrefsByUserKey, deliveries, nowIso } = params;
  const userPrefKey = resolveUserPrefKey(user, staffDirectory);
  const currentPrefs = userPrefsByUserKey[userPrefKey] || buildDefaultUserSidebarPrefs();

  const nextReadCountByConv = { ...(currentPrefs.readMessageCountByConv || {}) };
  const nextReadAtByConv = { ...(currentPrefs.readAtByConv || {}) };
  const nextLastReadMsgByConv = { ...(currentPrefs.lastReadMessageIdByConv || {}) };
  const nextReadThreadCountByMsg = { ...(currentPrefs.readThreadReplyCountByMsg || {}) };
  const nextReadThreadAtByMsg = { ...(currentPrefs.readThreadAtByMsg || {}) };
  const nextLastReadThreadReplyByMsg = { ...(currentPrefs.lastReadThreadReplyIdByMsg || {}) };
  const targetConvIdSet = new Set(deliveries.map((d) => d.conv.id));

  for (const { conv, message } of deliveries) {
    nextReadCountByConv[conv.id] = conv.messages.length;
    nextReadAtByConv[conv.id] = nowIso;
    nextLastReadMsgByConv[conv.id] = message.id;

    if (message.thread && message.thread.length > 0) {
      const threadKey = `${conv.id}::${message.id}`;
      const lastReply = message.thread[message.thread.length - 1];
      nextReadThreadCountByMsg[threadKey] = message.thread.length;
      nextReadThreadCountByMsg[message.id] = message.thread.length;
      nextReadThreadAtByMsg[threadKey] = nowIso;
      nextReadThreadAtByMsg[message.id] = nowIso;
      if (lastReply?.id) {
        nextLastReadThreadReplyByMsg[threadKey] = lastReply.id;
        nextLastReadThreadReplyByMsg[message.id] = lastReply.id;
      }
    }
  }

  const updatedSenderPrefs: MosChatUserSidebarPrefs = {
    ...currentPrefs,
    manualUnreadIds: (currentPrefs.manualUnreadIds || []).filter((id) => !targetConvIdSet.has(id)),
    readMessageCountByConv: nextReadCountByConv,
    readAtByConv: nextReadAtByConv,
    lastReadMessageIdByConv: nextLastReadMsgByConv,
    readThreadReplyCountByMsg: nextReadThreadCountByMsg,
    readThreadAtByMsg: nextReadThreadAtByMsg,
    lastReadThreadReplyIdByMsg: nextLastReadThreadReplyByMsg,
  };
  userPrefsByUserKey[userPrefKey] = updatedSenderPrefs;

  return { userPrefKey, updatedSenderPrefs };
}
