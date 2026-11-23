import {
  removeVietnameseTones,
  type MosChatAccessConfig,
  type MosChatConversation,
  type MosChatStaffMember,
  type MosChatUserSidebarPrefs,
  type UserRole,
} from '@mos-lab/shared';
import type { JwtUserPayload } from '../../../middlewares/auth.js';
import {
  COMMON_VI_SURNAMES_NORM,
  canUserAccessConversation,
  evaluateCanUserAccessMosChat,
  resolveDmParticipantIds,
  resolveUserStaffId,
} from '../chat-access.service.js';

/**
 * Cleans markdown formatting and builds a concise, readable lock-screen preview for iOS / Desktop Web Push.
 */
export function buildChatPushBodyPreview(params: {
  text?: string | null;
  customerCardName?: string | null;
  attachmentCount?: number;
  maxLength?: number;
}): string {
  const maxLen = params.maxLength ?? 120;
  let cleaned = String(params.text || '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_|~~)(.*?)\1/g, '$2')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    if (params.customerCardName) {
      cleaned = `📋 Đính kèm hồ sơ khách hàng ${params.customerCardName}`;
    } else if (params.attachmentCount && params.attachmentCount > 0) {
      cleaned =
        params.attachmentCount === 1
          ? '📷 Đã gửi một tệp / hình ảnh đính kèm'
          : `📎 Đã gửi ${params.attachmentCount} tệp / hình ảnh đính kèm`;
    } else {
      cleaned = 'Đã gửi một tin nhắn mới';
    }
  }

  if (cleaned.length <= maxLen) {
    return cleaned;
  }
  return `${cleaned.slice(0, Math.max(10, maxLen - 3)).trimEnd()}...`;
}

/**
 * Expands a staff ID to include dual-account sibling records representing the exact same person
 * (e.g. Google Workspace account vs Legacy CRM account in mos-lab).
 */
export function findDualAccountPeerIds(staffId: number, staffDirectory: MosChatStaffMember[]): number[] {
  if (!Number.isFinite(staffId) || staffId <= 0) return [];
  const result = new Set<number>([staffId]);
  const primary = staffDirectory.find((s) => Number(s.id) === staffId);
  if (!primary) return [staffId];

  const primaryLegacyId = primary.legacyStaffId ? Number(primary.legacyStaffId) : 0;
  const primaryNormName = primary.displayName ? removeVietnameseTones(primary.displayName.trim().toLowerCase()) : '';
  const primaryHandle = primary.username ? primary.username.split('@')[0].trim().toLowerCase() : '';
  const hasSpecificHandle = Boolean(primaryHandle && primaryHandle.length >= 3 && !/^user\d+$/i.test(primaryHandle));

  for (const s of staffDirectory) {
    const sid = Number(s?.id);
    if (!Number.isFinite(sid) || sid <= 0 || sid === staffId) continue;

    if (primaryLegacyId > 0 && s.legacyStaffId && Number(s.legacyStaffId) === primaryLegacyId) {
      result.add(sid);
      continue;
    }

    if (primaryNormName.length >= 3 && s.displayName) {
      const sNormName = removeVietnameseTones(s.displayName.trim().toLowerCase());
      if (sNormName === primaryNormName) {
        result.add(sid);
        continue;
      }
    }

    if (hasSpecificHandle && s.username) {
      const sHandle = s.username.split('@')[0].trim().toLowerCase();
      if (sHandle === primaryHandle) {
        result.add(sid);
      }
    }
  }

  return Array.from(result);
}

function buildStaffMentionCandidates(
  staff: MosChatStaffMember,
  nicknames?: Record<string, string>
): Array<{ normToken: string; rawLength: number }> {
  const candidates: Array<{ normToken: string; rawLength: number }> = [];
  const seenNorm = new Set<string>();

  const addCandidate = (rawToken: string | undefined | null, allowSingleChar = false) => {
    const trimmed = String(rawToken || '').trim();
    if (!trimmed) return;
    const norm = removeVietnameseTones(trimmed.toLowerCase());
    if (!norm) return;
    if (allowSingleChar ? norm.length < 1 : norm.length < 2) return;
    if (seenNorm.has(norm)) return;
    seenNorm.add(norm);
    candidates.push({ normToken: norm, rawLength: trimmed.length });
  };

  // 1. Space nickname (supports 1-char nicknames such as '@K')
  const nick = staff.id != null ? nicknames?.[String(staff.id)] : undefined;
  if (nick && nick.trim()) {
    addCandidate(nick, true);
  }

  // 2. Full display name + multi-word segments (excluding common Vietnamese surnames)
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
      const firstWord = words[0];
      const firstNorm = removeVietnameseTones(firstWord.toLowerCase());
      if (firstNorm.length >= 2 && !COMMON_VI_SURNAMES_NORM.has(firstNorm)) {
        addCandidate(firstWord);
      }
    }
  }

  // 3. Username & email handle
  const uname = String(staff.username || '')
    .trim()
    .toLowerCase();
  if (uname) {
    addCandidate(uname);
    const localPart = uname.split('@')[0];
    if (localPart && localPart.length >= 2 && !/^user\d+$/i.test(localPart)) {
      addCandidate(localPart);
      const firstSeg = localPart.split(/[._-]/)[0];
      if (firstSeg && firstSeg.length >= 3 && !COMMON_VI_SURNAMES_NORM.has(firstSeg)) {
        addCandidate(firstSeg);
      }
    }
  }

  return candidates;
}

export interface DirectAndMentionPushTargets {
  dmRecipientIds: string[];
  personalMentionRecipientIds: string[];
  atAllMentionRecipientIds: string[];
}

/**
 * Resolves exact recipient staff IDs for Native iOS / Desktop Web Push on incoming messages & thread replies:
 * - 1-1 Direct Messages (`conv.type === 'dm'`): notifies the peer participant (and dual-account siblings),
 *   strictly excluding self-DMs, sender, and conversations explicitly muted via `mutedIds`.
 * - Group Spaces (`conv.type === 'space'`): notifies accessible Space members who are @mentioned
 *   (longest-prefix disambiguation per `@` token so `@Tâm Nguyễn` never falsely matches `Lê Minh Tâm`)
 *   or targeted via `@all` / `@channel` / `@mọi người` (respecting private Space membership & mute settings).
 */
export function resolveDirectAndMentionPushTargets(params: {
  conv: MosChatConversation;
  senderUser?: JwtUserPayload;
  senderStaffId?: number;
  text?: string | null;
  staffDirectory: MosChatStaffMember[];
  accessConfig?: MosChatAccessConfig;
  userPrefsByUserKey?: Record<string, Partial<MosChatUserSidebarPrefs>>;
}): DirectAndMentionPushTargets {
  const empty: DirectAndMentionPushTargets = {
    dmRecipientIds: [],
    personalMentionRecipientIds: [],
    atAllMentionRecipientIds: [],
  };

  const { conv, senderUser, staffDirectory, accessConfig, userPrefsByUserKey } = params;
  if (!conv || !conv.id) return empty;

  const convIdStr = String(conv.id);
  if (conv.isSelf || convIdStr.startsWith('dm-self-') || convIdStr.startsWith('ai-')) {
    return empty;
  }

  const resolvedSenderId =
    params.senderStaffId && params.senderStaffId > 0
      ? params.senderStaffId
      : resolveUserStaffId(senderUser, staffDirectory);

  const senderExcludedIds = new Set<number>();
  if (resolvedSenderId > 0) {
    for (const id of findDualAccountPeerIds(resolvedSenderId, staffDirectory)) {
      senderExcludedIds.add(id);
    }
  }
  const rawUserNum = Number(senderUser?.id);
  if (Number.isFinite(rawUserNum) && rawUserNum > 0) {
    for (const id of findDualAccountPeerIds(rawUserNum, staffDirectory)) {
      senderExcludedIds.add(id);
    }
  }

  const getRecipientPrefs = (staffId: number): Partial<MosChatUserSidebarPrefs> | undefined => {
    if (!userPrefsByUserKey) return undefined;
    return userPrefsByUserKey[`staff_${staffId}`] || userPrefsByUserKey[String(staffId)];
  };

  const isConvExplicitlyMuted = (staffId: number): boolean => {
    const prefs = getRecipientPrefs(staffId);
    return Boolean(prefs?.mutedIds?.includes(convIdStr));
  };

  // 1. Direct Message (1-1 DM)
  if (conv.type === 'dm') {
    const dmParticipantIds = resolveDmParticipantIds(conv, staffDirectory);
    if (dmParticipantIds.length !== 2) {
      return empty;
    }

    const dmRecipientSet = new Set<number>();
    for (const pid of dmParticipantIds) {
      if (pid <= 0 || senderExcludedIds.has(pid)) continue;
      for (const expandedId of findDualAccountPeerIds(pid, staffDirectory)) {
        if (expandedId > 0 && !senderExcludedIds.has(expandedId) && !isConvExplicitlyMuted(expandedId)) {
          dmRecipientSet.add(expandedId);
        }
      }
    }

    return {
      dmRecipientIds: Array.from(dmRecipientSet).map(String),
      personalMentionRecipientIds: [],
      atAllMentionRecipientIds: [],
    };
  }

  // 2. Group Space (@Mention & @all)
  if (conv.type !== 'space') {
    return empty;
  }

  const rawText = String(params.text || '').trim();
  if (!rawText || !rawText.includes('@')) {
    return empty;
  }

  const explicitMemberNums = Array.isArray(conv.memberIds)
    ? conv.memberIds.map(Number).filter((n) => Number.isFinite(n) && n > 0)
    : [];
  const explicitMemberExpandedSet = new Set<number>();
  for (const mid of explicitMemberNums) {
    for (const expandedId of findDualAccountPeerIds(mid, staffDirectory)) {
      explicitMemberExpandedSet.add(expandedId);
    }
  }

  // Zero-Trust Space Privacy: compute staff IDs authorized to access this Space
  const accessibleStaffIds = new Set<number>();
  for (const s of staffDirectory) {
    const sid = Number(s?.id);
    if (!Number.isFinite(sid) || sid <= 0 || senderExcludedIds.has(sid)) continue;

    const staffPayload: JwtUserPayload = {
      id: sid,
      username: s.username || '',
      displayName: s.displayName || s.username || '',
      role: (s.role || 'staff') as UserRole,
    };

    if (accessConfig && !evaluateCanUserAccessMosChat(staffPayload, staffDirectory, accessConfig)) {
      continue;
    }

    const hasSpaceAccess =
      explicitMemberNums.length > 0
        ? explicitMemberExpandedSet.has(sid) || canUserAccessConversation(conv, staffPayload, staffDirectory)
        : canUserAccessConversation(conv, staffPayload, staffDirectory);

    if (hasSpaceAccess) {
      accessibleStaffIds.add(sid);
    }
  }

  if (accessibleStaffIds.size === 0) {
    return empty;
  }

  const candidatesByStaffId = new Map<number, Array<{ normToken: string; rawLength: number }>>();
  for (const s of staffDirectory) {
    const sid = Number(s?.id);
    if (!Number.isFinite(sid) || sid <= 0) continue;
    candidatesByStaffId.set(sid, buildStaffMentionCandidates(s, conv.memberNicknames));
  }

  const personalMentionSet = new Set<number>();
  let hasAtAll = false;

  for (let i = 0; i < rawText.length; i++) {
    if (rawText[i] !== '@') continue;
    if (i > 0 && !/[\s([{"']/.test(rawText[i - 1])) continue;

    const afterAt = rawText.slice(i + 1);
    const normAfterAt = removeVietnameseTones(afterAt);

    if (/^[ \t]*(?:all|channel|moi[ \t]+nguoi)(?=$|\b|[\s.,!?;:)\]}"'])/i.test(normAfterAt)) {
      hasAtAll = true;
      continue;
    }
    if (/^[ \t]*mai(?=$|\b|[\s.,!?;:)\]}"'])/i.test(normAfterAt)) {
      continue;
    }

    let longestLenAtPos = 0;
    const matchLenByStaffId = new Map<number, number>();

    for (const s of staffDirectory) {
      const sid = Number(s?.id);
      if (!Number.isFinite(sid) || sid <= 0) continue;
      const cands = candidatesByStaffId.get(sid) || [];
      let bestForStaff = 0;

      for (const cand of cands) {
        const escaped = cand.normToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`^[ \\t]*${escaped}(?=$|\\b|[\\s.,!?;:)\\]}"'])`, 'i');
        if (regex.test(normAfterAt) && cand.rawLength > bestForStaff) {
          bestForStaff = cand.rawLength;
        }
      }

      if (bestForStaff > 0) {
        matchLenByStaffId.set(sid, bestForStaff);
        if (bestForStaff > longestLenAtPos) {
          longestLenAtPos = bestForStaff;
        }
      }
    }

    if (longestLenAtPos > 0) {
      for (const [matchedSid, len] of matchLenByStaffId.entries()) {
        if (len !== longestLenAtPos) continue;
        for (const expandedId of findDualAccountPeerIds(matchedSid, staffDirectory)) {
          if (
            accessibleStaffIds.has(expandedId) &&
            !senderExcludedIds.has(expandedId) &&
            !isConvExplicitlyMuted(expandedId)
          ) {
            personalMentionSet.add(expandedId);
          }
        }
      }
    }
  }

  const atAllSet = new Set<number>();
  if (hasAtAll) {
    for (const sid of accessibleStaffIds) {
      if (personalMentionSet.has(sid)) continue;
      const isExplicitSpaceMember = explicitMemberNums.length === 0 || explicitMemberExpandedSet.has(sid);
      if (!isExplicitSpaceMember) continue;
      if (isConvExplicitlyMuted(sid)) continue;

      const prefs = getRecipientPrefs(sid);
      const override = prefs?.channelNotificationOverrides?.[convIdStr];
      const effectiveMode = override && override !== 'INHERIT' ? override : prefs?.notificationMode || 'ALL';
      if (effectiveMode === 'MUTED' || effectiveMode === 'NOTHING') continue;

      atAllSet.add(sid);
    }
  }

  return {
    dmRecipientIds: [],
    personalMentionRecipientIds: Array.from(personalMentionSet).map(String),
    atAllMentionRecipientIds: Array.from(atAllSet).map(String),
  };
}
