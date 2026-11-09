import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { MosChatPushSubscriptionPayload, MosChatWebPushNotificationPayload, SafeAny } from '@mos-lab/shared';

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
  if (crm?.crmSystemConfig) {
    try {
      const row = await crm.crmSystemConfig.findUnique({
        where: { configKey: WEB_PUSH_VAPID_CONFIG_KEY },
      });
      if (row?.configValue) {
        const parsed = JSON.parse(row.configValue) as StoredVapidKeyPair;
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

  if (crm?.crmSystemConfig) {
    try {
      await crm.crmSystemConfig.upsert({
        where: { configKey: WEB_PUSH_VAPID_CONFIG_KEY },
        update: { configValue: JSON.stringify(generated) },
        create: {
          configKey: WEB_PUSH_VAPID_CONFIG_KEY,
          configValue: JSON.stringify(generated),
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
  if (crm?.crmSystemConfig) {
    try {
      const row = await crm.crmSystemConfig.findUnique({
        where: { configKey: WEB_PUSH_SUBS_CONFIG_KEY },
      });
      if (row?.configValue) {
        const parsed = JSON.parse(row.configValue) as SubscriptionsByStaffMap;
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
  if (crm?.crmSystemConfig) {
    try {
      await crm.crmSystemConfig.upsert({
        where: { configKey: WEB_PUSH_SUBS_CONFIG_KEY },
        update: { configValue: JSON.stringify(map) },
        create: {
          configKey: WEB_PUSH_SUBS_CONFIG_KEY,
          configValue: JSON.stringify(map),
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

export async function sendWebPushToStaffIds(
  fastify: FastifyInstance | undefined,
  targetStaffIds: string[],
  notification: MosChatWebPushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  const uniqueStaffIds = Array.from(new Set(targetStaffIds.map(String).filter(Boolean)));
  if (uniqueStaffIds.length === 0) return { sent: 0, failed: 0 };

  const [vapidKeys, map] = await Promise.all([getOrCreateVapidKeys(fastify), loadSubscriptionsMap(fastify)]);

  const payloadJson = JSON.stringify(notification);
  let sent = 0;
  let failed = 0;
  let mapDirty = false;

  const tasks: Promise<void>[] = [];

  for (const staffId of uniqueStaffIds) {
    const subs = map[staffId] || [];
    for (const sub of subs) {
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

            const res = await fetch(sub.endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Encoding': 'aes128gcm',
                'Content-Length': String(encryptedBody.length),
                TTL: '45',
                Urgency: 'high',
                Authorization: `vapid t=${jwt}, k=${vapidKeys.publicKey}`,
              },
              body: new Uint8Array(encryptedBody),
              signal: AbortSignal.timeout(8000),
            });

            if (res.status >= 200 && res.status < 300) {
              sent++;
            } else {
              failed++;
              // 404 or 410 from Apple/Google means the push subscription was revoked or expired
              if (res.status === 404 || res.status === 410) {
                map[staffId] = (map[staffId] || []).filter((item) => item.endpoint !== sub.endpoint);
                mapDirty = true;
              }
            }
          } catch {
            failed++;
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
