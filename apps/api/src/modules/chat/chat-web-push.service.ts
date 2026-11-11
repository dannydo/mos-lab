import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import {
  removeVietnameseTones,
  type MosChatAccessConfig,
  type MosChatConversation,
  type MosChatPushSubscriptionPayload,
  type MosChatStaffMember,
  type MosChatUserSidebarPrefs,
  type MosChatWebPushNotificationPayload,
  type SafeAny,
  type UserRole,
} from '@mos-lab/shared';
import type { JwtUserPayload } from '../../middlewares/auth.js';
import {
  COMMON_VI_SURNAMES_NORM,
  canUserAccessConversation,
  evaluateCanUserAccessMosChat,
  resolveDmParticipantIds,
  resolveUserStaffId,
} from './chat-access.service.js';

const WEB_PUSH_VAPID_CONFIG_KEY = 'mos_chat:web_push_vapid_v1';
const WEB_PUSH_SUBS_CONFIG_KEY = 'mos_chat:web_push_subs_v1';
const MAX_SUBSCRIPTIONS_PER_STAFF = 5;

export interface StoredVapidKeyPair {
  publicKey: string;
  privateJwk: crypto.JsonWebKey;
  createdAt: string;
}

export interface StoredStaffPushSubscription extends MosChatPushSubscriptionPayload {
  staffId: string;
  updatedAt: string;
}

type SubscriptionsByStaffMap = Record<string, StoredStaffPushSubscription[]>;

let cachedVapidKeys: StoredVapidKeyPair | null = null;
let cachedSubscriptionsByStaff: SubscriptionsByStaffMap | null = null;

function decodeBase64UrlOrBase64(input: string): Buffer {
  const normalized = String(input || '')
    .trim()
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + '='.repeat(padLen), 'base64');
}

export function generateVapidKeyPair(): StoredVapidKeyPair {
  const { privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  });
  const jwk = privateKey.export({ format: 'jwk' }) as crypto.JsonWebKey;
  const xBuf = decodeBase64UrlOrBase64(jwk.x || '');
  const yBuf = decodeBase64UrlOrBase64(jwk.y || '');
  const uncompressedPub = Buffer.concat([Buffer.from([0x04]), xBuf, yBuf]);

  return {
    publicKey: uncompressedPub.toString('base64url'),
    privateJwk: jwk,
    createdAt: new Date().toISOString(),
  };
}

export function createVapidJwtToken(params: {
  endpoint: string;
  privateJwk: crypto.JsonWebKey;
  subject?: string;
}): string {
  const url = new URL(params.endpoint);
  const audience = url.origin;
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const sub = params.subject || process.env.VAPID_SUBJECT || 'mailto:admin@masteros.app';

  const headerB64 = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify({ aud: audience, exp, sub })).toString('base64url');
  const signingInput = `${headerB64}.${payloadB64}`;

  const privateKeyObj = crypto.createPrivateKey({
    key: params.privateJwk,
    format: 'jwk',
  });

  const signature = crypto
    .sign('sha256', Buffer.from(signingInput, 'utf8'), {
      key: privateKeyObj,
      dsaEncoding: 'ieee-p1363',
    })
    .toString('base64url');

  return `${signingInput}.${signature}`;
}

/**
 * RFC 8291 (Web Push Message Encryption) + RFC 8188 (aes128gcm Content-Encoding)
 */
export function encryptWebPushAes128Gcm(params: { payloadJson: string; p256dh: string; auth: string }): Buffer {
  const uaPublic = decodeBase64UrlOrBase64(params.p256dh);
  const authSecret = decodeBase64UrlOrBase64(params.auth);

  if (uaPublic.length !== 65 || uaPublic[0] !== 0x04) {
    throw new Error('Invalid client p256dh public key (must be 65-byte uncompressed P-256 point)');
  }
  if (authSecret.length < 16) {
    throw new Error('Invalid client auth secret (must be at least 16 bytes)');
  }

  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const sharedSecret = ecdh.computeSecret(uaPublic);
  const salt = crypto.randomBytes(16);

  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0', 'ascii'), uaPublic, asPublic]);
  const ikm = Buffer.from(crypto.hkdfSync('sha256', sharedSecret, authSecret, keyInfo, 32));

  const cekInfo = Buffer.from('Content-Encoding: aes128gcm\0', 'ascii');
  const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, cekInfo, 16));

  const nonceInfo = Buffer.from('Content-Encoding: nonce\0', 'ascii');
  const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, nonceInfo, 12));

  // RFC 8188 final record delimiter 0x02
  const plaintextRecord = Buffer.concat([Buffer.from(params.payloadJson, 'utf8'), Buffer.from([0x02])]);
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintextRecord), cipher.final(), cipher.getAuthTag()]);

  // RFC 8188 header: salt (16) || rs (4, uint32BE=4096) || idlen (1, uint8=65) || keyid (asPublic, 65)
  const header = Buffer.alloc(21 + asPublic.length);
  salt.copy(header, 0);
  header.writeUInt32BE(4096, 16);
  header.writeUInt8(asPublic.length, 20);
  asPublic.copy(header, 21);

  return Buffer.concat([header, ciphertext]);
}

export async function getOrCreateVapidKeys(fastify?: FastifyInstance): Promise<StoredVapidKeyPair> {
  if (cachedVapidKeys) return cachedVapidKeys;

  const crm = (fastify as SafeAny)?.prisma?.crm;
  if (crm?.crmConfig) {
    try {
      const row = await crm.crmConfig.findUnique({
        where: { key: WEB_PUSH_VAPID_CONFIG_KEY },
      });
      if (row?.value) {
        const parsed = JSON.parse(row.value) as StoredVapidKeyPair;
        if (parsed?.publicKey && parsed?.privateJwk?.d) {
          cachedVapidKeys = parsed;
          return parsed;
        }
      }
    } catch {
      // ignore and generate below
    }
  }

  const generated = generateVapidKeyPair();
  cachedVapidKeys = generated;

  if (crm?.crmConfig) {
    try {
      await crm.crmConfig.upsert({
        where: { key: WEB_PUSH_VAPID_CONFIG_KEY },
        update: { value: JSON.stringify(generated) },
        create: {
          key: WEB_PUSH_VAPID_CONFIG_KEY,
          value: JSON.stringify(generated),
        },
      });
    } catch {
      // ignore persistence error in test/readonly environments
    }
  }

  return generated;
}

async function loadSubscriptionsMap(fastify?: FastifyInstance): Promise<SubscriptionsByStaffMap> {
  if (cachedSubscriptionsByStaff) return cachedSubscriptionsByStaff;

  const crm = (fastify as SafeAny)?.prisma?.crm;
  if (crm?.crmConfig) {
    try {
      const row = await crm.crmConfig.findUnique({
        where: { key: WEB_PUSH_SUBS_CONFIG_KEY },
      });
      if (row?.value) {
        const parsed = JSON.parse(row.value) as SubscriptionsByStaffMap;
        if (parsed && typeof parsed === 'object') {
          cachedSubscriptionsByStaff = parsed;
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  cachedSubscriptionsByStaff = {};
  return cachedSubscriptionsByStaff;
}

async function saveSubscriptionsMap(fastify: FastifyInstance | undefined, map: SubscriptionsByStaffMap): Promise<void> {
  cachedSubscriptionsByStaff = map;
  const crm = (fastify as SafeAny)?.prisma?.crm;
  if (crm?.crmConfig) {
    try {
      await crm.crmConfig.upsert({
        where: { key: WEB_PUSH_SUBS_CONFIG_KEY },
        update: { value: JSON.stringify(map) },
        create: {
          key: WEB_PUSH_SUBS_CONFIG_KEY,
          value: JSON.stringify(map),
        },
      });
    } catch {
      // ignore
    }
  }
}

export async function getStaffPushSubscriptionCount(
  fastify: FastifyInstance | undefined,
  staffId: string
): Promise<number> {
  const map = await loadSubscriptionsMap(fastify);
  return (map[String(staffId)] || []).length;
}

export async function registerStaffPushSubscription(
  fastify: FastifyInstance | undefined,
  staffId: string,
  subscription: MosChatPushSubscriptionPayload
): Promise<number> {
  const key = String(staffId);
  const map = await loadSubscriptionsMap(fastify);
  const existing = (map[key] || []).filter((s) => s.endpoint !== subscription.endpoint);

  const nextList: StoredStaffPushSubscription[] = [
    {
      ...subscription,
      staffId: key,
      updatedAt: new Date().toISOString(),
    },
    ...existing,
  ].slice(0, MAX_SUBSCRIPTIONS_PER_STAFF);

  map[key] = nextList;
  await saveSubscriptionsMap(fastify, map);
  return nextList.length;
}

export async function unregisterStaffPushSubscription(
  fastify: FastifyInstance | undefined,
  staffId: string,
  endpoint: string
): Promise<number> {
  const key = String(staffId);
  const map = await loadSubscriptionsMap(fastify);
  const existing = map[key] || [];
  const nextList = existing.filter((s) => s.endpoint !== endpoint);
  map[key] = nextList;
  await saveSubscriptionsMap(fastify, map);
  return nextList.length;
}

export function clearWebPushCacheForTests(): void {
  cachedVapidKeys = null;
  cachedSubscriptionsByStaff = null;
}

export async function sendWebPushToStaffIds(
  fastify: FastifyInstance | undefined,
  targetStaffIds: string[],
  notification: MosChatWebPushNotificationPayload,
  options?: { fetchImpl?: typeof fetch }
): Promise<{ sent: number; failed: number }> {
  const uniqueStaffIds = Array.from(new Set(targetStaffIds.map(String).filter(Boolean)));
  if (uniqueStaffIds.length === 0) return { sent: 0, failed: 0 };

  const [vapidKeys, map] = await Promise.all([getOrCreateVapidKeys(fastify), loadSubscriptionsMap(fastify)]);

  const fetchFn = options?.fetchImpl ?? fetch;
  const payloadJson = JSON.stringify(notification);
  let sent = 0;
  let failed = 0;
  let mapDirty = false;
  const seenEndpoints = new Set<string>();

  const tasks: Promise<void>[] = [];

  for (const staffId of uniqueStaffIds) {
    const subs = map[staffId] || [];
    for (const sub of subs) {
      if (!sub?.endpoint || seenEndpoints.has(sub.endpoint)) {
        continue;
      }
      seenEndpoints.add(sub.endpoint);

      tasks.push(
        (async () => {
          try {
            const encryptedBody = encryptWebPushAes128Gcm({
              payloadJson,
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            });
            const jwt = createVapidJwtToken({
              endpoint: sub.endpoint,
              privateJwk: vapidKeys.privateJwk,
            });

            const res = await fetchFn(sub.endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Encoding': 'aes128gcm',
                'Content-Length': String(encryptedBody.length),
                TTL: '45',
                Urgency: 'high',
                Authorization: `vapid t=${jwt}, k=${vapidKeys.publicKey}`,
                'Crypto-Key': `p256ecdsa=${vapidKeys.publicKey}`,
              },
              body: new Uint8Array(encryptedBody),
              signal: AbortSignal.timeout(8000),
            });

            if (res.status >= 200 && res.status < 300) {
              sent++;
            } else {
              failed++;
              const errBody = await res.text().catch(() => '');
              fastify?.log?.warn?.(
                `Web push send failed to endpoint ${sub.endpoint.slice(0, 45)}... status ${res.status}: ${errBody}`
              );
              // 404 or 410 from Apple/Google means the push subscription was revoked or expired
              if (res.status === 404 || res.status === 410) {
                map[staffId] = (map[staffId] || []).filter((item) => item.endpoint !== sub.endpoint);
                mapDirty = true;
              }
            }
          } catch (pushErr) {
            failed++;
            fastify?.log?.warn?.(`Web push network exception: ${(pushErr as Error)?.message}`);
          }
        })()
      );
    }
  }

  await Promise.allSettled(tasks);

  if (mapDirty) {
    await saveSubscriptionsMap(fastify, map);
  }

  return { sent, failed };
}

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

/**
 * Dispatches Native Web Push notifications (iOS PWA & Desktop) for incoming 1-1 Direct Messages and @Mentions.
 */
export async function dispatchChatMessageWebPush(
  fastify: FastifyInstance | undefined,
  params: {
    conv: MosChatConversation;
    senderUser?: JwtUserPayload;
    senderStaffId?: number;
    senderName: string;
    messageId: string;
    threadRootMessageId?: string;
    text?: string | null;
    customerCardName?: string | null;
    attachmentCount?: number;
    staffDirectory: MosChatStaffMember[];
    accessConfig?: MosChatAccessConfig;
    userPrefsByUserKey?: Record<string, Partial<MosChatUserSidebarPrefs>>;
    fetchImpl?: typeof fetch;
  }
): Promise<{ dmSent: number; mentionSent: number; failed: number }> {
  const targets = resolveDirectAndMentionPushTargets({
    conv: params.conv,
    senderUser: params.senderUser,
    senderStaffId: params.senderStaffId,
    text: params.text,
    staffDirectory: params.staffDirectory,
    accessConfig: params.accessConfig,
    userPrefsByUserKey: params.userPrefsByUserKey,
  });

  if (
    targets.dmRecipientIds.length === 0 &&
    targets.personalMentionRecipientIds.length === 0 &&
    targets.atAllMentionRecipientIds.length === 0
  ) {
    return { dmSent: 0, mentionSent: 0, failed: 0 };
  }

  const preview = buildChatPushBodyPreview({
    text: params.text,
    customerCardName: params.customerCardName,
    attachmentCount: params.attachmentCount,
  });

  const targetUrl = params.threadRootMessageId
    ? `/chat?convId=${encodeURIComponent(params.conv.id)}&msgId=${encodeURIComponent(params.messageId)}&threadId=${encodeURIComponent(params.threadRootMessageId)}`
    : `/chat?convId=${encodeURIComponent(params.conv.id)}&msgId=${encodeURIComponent(params.messageId)}`;

  const spaceLabel =
    String(params.conv.name || 'Nhóm')
      .replace(/^#+\s*/, '')
      .trim() || 'Nhóm';

  let dmSent = 0;
  let mentionSent = 0;
  let failed = 0;

  if (targets.dmRecipientIds.length > 0) {
    const res = await sendWebPushToStaffIds(
      fastify,
      targets.dmRecipientIds,
      {
        title: params.threadRootMessageId ? `💬 ${params.senderName} (phản hồi luồng)` : `💬 ${params.senderName}`,
        body: preview,
        icon: '/apple-touch-icon.png',
        badge: '/icon-192.png',
        tag: `mos-chat-dm-${params.messageId}`,
        renotify: true,
        requireInteraction: false,
        vibrate: [200, 100, 200],
        data: {
          type: 'CHAT_DM',
          conversationId: params.conv.id,
          messageId: params.messageId,
          ...(params.threadRootMessageId ? { threadRootMessageId: params.threadRootMessageId } : {}),
          url: targetUrl,
        },
      },
      { fetchImpl: params.fetchImpl }
    );
    dmSent += res.sent;
    failed += res.failed;
  }

  if (targets.personalMentionRecipientIds.length > 0) {
    const res = await sendWebPushToStaffIds(
      fastify,
      targets.personalMentionRecipientIds,
      {
        title: `📣 ${params.senderName} nhắc bạn trong #${spaceLabel}`,
        body: preview,
        icon: '/apple-touch-icon.png',
        badge: '/icon-192.png',
        tag: `mos-chat-mention-${params.messageId}`,
        renotify: true,
        requireInteraction: false,
        vibrate: [220, 100, 220],
        data: {
          type: 'CHAT_MENTION',
          conversationId: params.conv.id,
          messageId: params.messageId,
          ...(params.threadRootMessageId ? { threadRootMessageId: params.threadRootMessageId } : {}),
          url: targetUrl,
        },
      },
      { fetchImpl: params.fetchImpl }
    );
    mentionSent += res.sent;
    failed += res.failed;
  }

  if (targets.atAllMentionRecipientIds.length > 0) {
    const res = await sendWebPushToStaffIds(
      fastify,
      targets.atAllMentionRecipientIds,
      {
        title: `📣 ${params.senderName} nhắc cả nhóm #${spaceLabel}`,
        body: preview,
        icon: '/apple-touch-icon.png',
        badge: '/icon-192.png',
        tag: `mos-chat-mention-${params.messageId}`,
        renotify: true,
        requireInteraction: false,
        vibrate: [220, 100, 220],
        data: {
          type: 'CHAT_MENTION',
          conversationId: params.conv.id,
          messageId: params.messageId,
          ...(params.threadRootMessageId ? { threadRootMessageId: params.threadRootMessageId } : {}),
          url: targetUrl,
        },
      },
      { fetchImpl: params.fetchImpl }
    );
    mentionSent += res.sent;
    failed += res.failed;
  }

  return { dmSent, mentionSent, failed };
}
