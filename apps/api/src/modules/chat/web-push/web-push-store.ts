import type { FastifyInstance } from 'fastify';
import type { MosChatPushSubscriptionPayload, MosChatWebPushNotificationPayload, SafeAny } from '@mos-lab/shared';
import {
  createVapidJwtToken,
  encryptWebPushAes128Gcm,
  generateVapidKeyPair,
  type StoredVapidKeyPair,
} from './web-push-crypto.js';

const WEB_PUSH_VAPID_CONFIG_KEY = 'mos_chat:web_push_vapid_v1';
const WEB_PUSH_SUBS_CONFIG_KEY = 'mos_chat:web_push_subs_v1';
const MAX_SUBSCRIPTIONS_PER_STAFF = 5;

export interface StoredStaffPushSubscription extends MosChatPushSubscriptionPayload {
  staffId: string;
  updatedAt: string;
}

type SubscriptionsByStaffMap = Record<string, StoredStaffPushSubscription[]>;

let cachedVapidKeys: StoredVapidKeyPair | null = null;
let cachedSubscriptionsByStaff: SubscriptionsByStaffMap | null = null;

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
