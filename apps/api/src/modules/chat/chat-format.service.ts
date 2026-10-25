import {
  MosChatConversation,
  MosChatMessage,
  MosChatReadReceiptEntry,
  MosChatStaffMember,
  MosChatTaskItem,
  MosChatThreadReadReceiptEntry,
  MosChatUserSidebarPrefs,
  isCanonicalSuperAdminIdentity,
} from '@mos-lab/shared';
import { JwtUserPayload } from '../../middlewares/auth.js';
import {
  canUserAccessConversation,
  computeUnreadCountForUser,
  isStaffMentionedInChatText,
  resolveDmParticipantIds,
  resolveUserPrefKey,
  resolveUserStaffId,
} from './chat-access.service.js';

export function formatTimeLabel(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function getRoleDisplayLabel(role?: string | null): { label: string; color: string } {
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

export function getInitials(name?: string | null, username?: string | null): string {
  const source = (name || username || 'NV').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
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
