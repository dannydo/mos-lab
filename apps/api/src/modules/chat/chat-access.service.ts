import {
  MosChatAccessConfig,
  MosChatConversation,
  MosChatStaffMember,
  MosChatUserSidebarPrefs,
  isCanonicalSuperAdminIdentity,
  removeVietnameseTones,
  SafeAny,
} from '@mos-lab/shared';
import { JwtUserPayload } from '../../middlewares/auth.js';

export const COMMON_VI_SURNAMES_NORM = new Set([
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

export function resolveUserStaffId(user: JwtUserPayload | undefined, staffDirectory: MosChatStaffMember[]): number {
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

export function resolveUserPrefKey(user: JwtUserPayload | undefined, staffDirectory: MosChatStaffMember[]): string {
  const sid = resolveUserStaffId(user, staffDirectory);
  if (sid > 0) return `staff_${sid}`;
  const uname = String(user?.username || '')
    .toLowerCase()
    .trim();
  return uname ? `user_${uname}` : 'default';
}

/**
 * Resolves the exact participant staff IDs for a Direct Message (`type === 'dm'`).
 * - Self-chat (`isSelf: true` or `dm-self-<id>`): returns `[ownerStaffId]` (1 person).
 * - 1-1 Direct Message: returns `[staffIdA, staffIdB]` (strictly 2 people).
 * - Legacy DMs without `memberIds`: infers from `participantStaffId` + numeric message `senderId`s (or Danny's ID for earlier 1-1 DMs).
 */
export function resolveDmParticipantIds(conv: MosChatConversation, staffDirectory: MosChatStaffMember[]): number[] {
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

export function matchesStaffGroupBackend(member: MosChatStaffMember, groupKey: string): boolean {
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

export function evaluateCanUserAccessMosChat(
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

  // Space fallback
  return conv.unreadCount || 0;
}
