interface OmiCallIntentEntry {
  staffId: number;
  extension: string | null;
  phoneSuffix: string;
  callUuid: string | null;
  createdAt: number;
}

const CALL_INTENT_TTL_MS = 15 * 60 * 1000;
const callIntentStore: OmiCallIntentEntry[] = [];

function normalizePhoneSuffix(raw: string | null | undefined): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.length > 9 ? digits.slice(-9) : digits;
}

function pruneExpiredIntents(now: number): void {
  const cutoff = now - CALL_INTENT_TTL_MS;
  while (callIntentStore.length > 0 && callIntentStore[0].createdAt < cutoff) {
    callIntentStore.shift();
  }
}

/**
 * Records an outbound OmiCall click intent so shared-extension SIP trunks
 * (e.g. Ext 110 used by multiple admins/managers) resolve the exact caller on webhook.
 */
export function recordOmiCallIntent(params: {
  staffId: number;
  phone: string;
  extension?: string | null;
  callUuid?: string | null;
  now?: number;
}): void {
  const now = params.now ?? Date.now();
  pruneExpiredIntents(now);

  const phoneSuffix = normalizePhoneSuffix(params.phone);
  const callUuid = params.callUuid ? String(params.callUuid).trim() || null : null;
  if (!phoneSuffix && !callUuid) return;

  callIntentStore.push({
    staffId: params.staffId,
    extension: params.extension ? String(params.extension).trim() || null : null,
    phoneSuffix,
    callUuid,
    createdAt: now,
  });

  if (callIntentStore.length > 300) {
    callIntentStore.splice(0, callIntentStore.length - 300);
  }
}

/**
 * Finds the most recent matching outbound call intent for an incoming CDR webhook.
 * Precedence: exact `callUuid`, then `(extension + phoneSuffix)`, then `phoneSuffix`.
 */
export function resolveMatchingOmiCallIntent(params: {
  extension?: string | null;
  customerPhone?: string | null;
  callUuid?: string | null;
  now?: number;
}): number | null {
  const now = params.now ?? Date.now();
  pruneExpiredIntents(now);

  const targetUuid = params.callUuid ? String(params.callUuid).trim() : '';
  const targetSuffix = normalizePhoneSuffix(params.customerPhone);
  const targetExt = params.extension ? String(params.extension).trim() : '';

  if (targetUuid) {
    for (let i = callIntentStore.length - 1; i >= 0; i--) {
      if (callIntentStore[i].callUuid === targetUuid) {
        return callIntentStore[i].staffId;
      }
    }
  }

  if (targetSuffix && targetExt) {
    for (let i = callIntentStore.length - 1; i >= 0; i--) {
      const entry = callIntentStore[i];
      if (entry.phoneSuffix === targetSuffix && entry.extension === targetExt) {
        return entry.staffId;
      }
    }
  }

  if (targetSuffix) {
    for (let i = callIntentStore.length - 1; i >= 0; i--) {
      if (callIntentStore[i].phoneSuffix === targetSuffix) {
        return callIntentStore[i].staffId;
      }
    }
  }

  return null;
}

export function clearOmiCallIntentsForTest(): void {
  callIntentStore.length = 0;
}
