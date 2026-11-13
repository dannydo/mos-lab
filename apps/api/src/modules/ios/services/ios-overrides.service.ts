import mysql from 'mysql2/promise';
import { hasCompleteNaturalLashAttributes, NaturalLashConsultationAttributes, SafeAny } from '@mos-lab/shared';
import { getCrmPool } from './db-pools.js';

export const LEGACY_LIVE_OVERRIDES_KEY = 'IOS_APP_LIVE_BOOKING_OVERRIDES';
export const LEGACY_CUSTOMER_AVATARS_KEY = 'IOS_APP_CUSTOMER_AVATARS';
export const BOOKING_OVERRIDE_KEY_PREFIX = 'IOS_BK_OVR:';
export const CUSTOMER_AVATAR_KEY_PREFIX = 'IOS_CUST_AVT:';
export const CUSTOMER_NATURAL_LASH_KEY_PREFIX = 'IOS_CUST_NLASH:';
export const CUSTOMER_COMBO_EXPIRY_KEY_PREFIX = 'IOS_CUST_COMBO_EXP:';
export const LEGACY_SETTLE_KEY_PREFIX = 'IOS_LEGACY_SETTLE:';

export interface CustomerComboExpiryOverrideEntry {
  balanceId: number;
  serviceGroup: 'upper' | 'under';
  dateExpired: string | null;
  isFrozen: boolean;
  reason: string;
  updatedByStaffId?: number;
  updatedAt: string;
}

export type BookingOverrideRecord = Record<string, SafeAny>;

export interface LegacySettlementReceipt {
  bookingId: number;
  settlementStatus: 'SETTLED_COMPLETED' | 'PENDING_COUNTER_SETTLEMENT' | 'DEMO_ONLY' | 'BRIDGE_DEFERRED';
  orderState: string;
  paymentMethod: 'CASH' | 'POS' | 'VIETQR';
  grandTotal: number;
  bankTransferRef?: string;
  settledAt: string;
}

export interface CrmConfigStoreAdapter {
  getOne(key: string): Promise<string | null>;
  getMany(keys: string[]): Promise<Map<string, string>>;
  getByPrefix(prefix: string): Promise<Map<string, string>>;
  upsert(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  removeByPrefix(prefix: string): Promise<void>;
}

export function getBookingOverrideKey(bookingId: number): string {
  return `${BOOKING_OVERRIDE_KEY_PREFIX}${bookingId}`;
}

export function getCustomerAvatarKey(customerId: number): string {
  return `${CUSTOMER_AVATAR_KEY_PREFIX}${customerId}`;
}

export function getCustomerNaturalLashKey(customerId: number): string {
  return `${CUSTOMER_NATURAL_LASH_KEY_PREFIX}${customerId}`;
}

export function getCustomerComboExpiryKey(customerId: number): string {
  return `${CUSTOMER_COMBO_EXPIRY_KEY_PREFIX}${customerId}`;
}

export function getLegacySettleKey(bookingId: number): string {
  return `${LEGACY_SETTLE_KEY_PREFIX}${bookingId}`;
}

function extractCleanNaturalLashProfile(
  raw?: Record<string, SafeAny> | null
): NaturalLashConsultationAttributes | null {
  if (!raw || !hasCompleteNaturalLashAttributes(raw as NaturalLashConsultationAttributes)) {
    return null;
  }
  const countVal = String(raw.naturalLashCount || raw.naturalLashDensity || '').trim();
  return {
    naturalLashLength: String(raw.naturalLashLength || '').trim(),
    naturalLashThickness: String(raw.naturalLashThickness || '').trim(),
    naturalLashCount: countVal,
    naturalLashDensity: String(raw.naturalLashDensity || countVal).trim(),
    lashTrail: String(raw.lashTrail || '').trim(),
    eyeShape: String(raw.eyeShape || '').trim(),
    lashHealth: String(raw.lashHealth || '').trim(),
    medicalProblem: String(raw.medicalProblem || '').trim(),
    isNewClientDiagnosticDone: true,
  };
}

function safeJsonParseObject(raw: string | null | undefined): Record<string, SafeAny> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, SafeAny>;
    }
  } catch {
    // ignore malformed json
  }
  return null;
}

function parseAvatarConfigValue(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('{') || trimmed.startsWith('"')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'string') return parsed.trim() || undefined;
      if (parsed && typeof parsed === 'object' && typeof parsed.avatarUrl === 'string') {
        return parsed.avatarUrl.trim() || undefined;
      }
    } catch {
      // fall through to raw string
    }
  }
  return trimmed;
}

export function createMysqlConfigStore(): CrmConfigStoreAdapter {
  return {
    async getOne(key: string): Promise<string | null> {
      try {
        const pool = getCrmPool();
        const [rows] = await pool.query<mysql.RowDataPacket[]>(
          'SELECT `value` FROM crm_config WHERE `key` = ? LIMIT 1',
          [key]
        );
        return rows?.[0]?.value !== undefined && rows[0].value !== null ? String(rows[0].value) : null;
      } catch {
        return null;
      }
    },

    async getMany(keys: string[]): Promise<Map<string, string>> {
      const map = new Map<string, string>();
      if (keys.length === 0) return map;
      try {
        const pool = getCrmPool();
        const placeholders = keys.map(() => '?').join(',');
        const [rows] = await pool.query<mysql.RowDataPacket[]>(
          `SELECT \`key\`, \`value\` FROM crm_config WHERE \`key\` IN (${placeholders})`,
          keys
        );
        for (const row of rows) {
          if (row.key && row.value !== undefined && row.value !== null) {
            map.set(String(row.key), String(row.value));
          }
        }
      } catch {
        // ignore offline/missing db in dev
      }
      return map;
    },

    async getByPrefix(prefix: string): Promise<Map<string, string>> {
      const map = new Map<string, string>();
      try {
        const pool = getCrmPool();
        const [rows] = await pool.query<mysql.RowDataPacket[]>(
          'SELECT `key`, `value` FROM crm_config WHERE `key` LIKE ?',
          [`${prefix}%`]
        );
        for (const row of rows) {
          if (row.key && row.value !== undefined && row.value !== null) {
            map.set(String(row.key), String(row.value));
          }
        }
      } catch {
        // ignore
      }
      return map;
    },

    async upsert(key: string, value: string): Promise<void> {
      try {
        const pool = getCrmPool();
        await pool.query(
          `INSERT INTO crm_config (\`key\`, \`value\`, \`updated_at\`)
           VALUES (?, ?, NOW())
           ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), \`updated_at\` = NOW()`,
          [key, value]
        );
      } catch (err) {
        console.warn(`[ios-overrides] Could not upsert crm_config key ${key}:`, err);
      }
    },

    async remove(key: string): Promise<void> {
      try {
        const pool = getCrmPool();
        await pool.query('DELETE FROM crm_config WHERE `key` = ?', [key]);
      } catch (err) {
        console.warn(`[ios-overrides] Could not delete crm_config key ${key}:`, err);
      }
    },

    async removeByPrefix(prefix: string): Promise<void> {
      try {
        const pool = getCrmPool();
        await pool.query('DELETE FROM crm_config WHERE `key` LIKE ?', [`${prefix}%`]);
      } catch (err) {
        console.warn(`[ios-overrides] Could not delete crm_config prefix ${prefix}:`, err);
      }
    },
  };
}

export function createInMemoryConfigStore(
  initialEntries: Record<string, string> = {},
  artificialDelayMs: number = 0
): CrmConfigStoreAdapter & { dump(): Record<string, string> } {
  const data = new Map<string, string>(Object.entries(initialEntries));
  const wait = () =>
    artificialDelayMs > 0 ? new Promise<void>((resolve) => setTimeout(resolve, artificialDelayMs)) : Promise.resolve();

  return {
    async getOne(key: string) {
      await wait();
      return data.get(key) ?? null;
    },
    async getMany(keys: string[]) {
      await wait();
      const out = new Map<string, string>();
      for (const k of keys) {
        const val = data.get(k);
        if (val !== undefined) out.set(k, val);
      }
      return out;
    },
    async getByPrefix(prefix: string) {
      await wait();
      const out = new Map<string, string>();
      for (const [k, v] of data.entries()) {
        if (k.startsWith(prefix)) out.set(k, v);
      }
      return out;
    },
    async upsert(key: string, value: string) {
      await wait();
      data.set(key, value);
    },
    async remove(key: string) {
      await wait();
      data.delete(key);
    },
    async removeByPrefix(prefix: string) {
      await wait();
      for (const k of Array.from(data.keys())) {
        if (k.startsWith(prefix)) data.delete(k);
      }
    },
    dump() {
      return Object.fromEntries(data.entries());
    },
  };
}

export function createOverrideRepository(store: CrmConfigStoreAdapter = createMysqlConfigStore()) {
  const bookingLocks = new Map<number, Promise<unknown>>();

  async function withBookingLock<T>(bookingId: number, task: () => Promise<T>): Promise<T> {
    const previous = bookingLocks.get(bookingId) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(task);
    bookingLocks.set(bookingId, run);
    try {
      return await run;
    } finally {
      if (bookingLocks.get(bookingId) === run) {
        bookingLocks.delete(bookingId);
      }
    }
  }

  async function loadBookingOverride(bookingId: number): Promise<BookingOverrideRecord | null> {
    const atomicRaw = await store.getOne(getBookingOverrideKey(bookingId));
    const atomicParsed = safeJsonParseObject(atomicRaw);
    if (atomicParsed) {
      return atomicParsed;
    }

    const legacyRaw = await store.getOne(LEGACY_LIVE_OVERRIDES_KEY);
    const legacyMap = safeJsonParseObject(legacyRaw);
    const legacyEntry = legacyMap?.[String(bookingId)];
    if (legacyEntry && typeof legacyEntry === 'object') {
      return legacyEntry as BookingOverrideRecord;
    }
    return null;
  }

  async function saveBookingOverride(bookingId: number, override: BookingOverrideRecord): Promise<void> {
    await store.upsert(getBookingOverrideKey(bookingId), JSON.stringify(override));
  }

  async function deleteBookingOverride(bookingId: number): Promise<void> {
    await Promise.all([store.remove(getBookingOverrideKey(bookingId)), store.remove(getLegacySettleKey(bookingId))]);
    const legacyRaw = await store.getOne(LEGACY_LIVE_OVERRIDES_KEY);
    const legacyMap = safeJsonParseObject(legacyRaw);
    if (legacyMap && Object.prototype.hasOwnProperty.call(legacyMap, String(bookingId))) {
      delete legacyMap[String(bookingId)];
      await store.upsert(LEGACY_LIVE_OVERRIDES_KEY, JSON.stringify(legacyMap));
    }
  }

  async function resetDemoOverrides(bookingIds?: number[], customerIds?: number[]): Promise<void> {
    if (!bookingIds || bookingIds.length === 0) {
      await Promise.all([
        store.removeByPrefix(BOOKING_OVERRIDE_KEY_PREFIX),
        store.removeByPrefix(LEGACY_SETTLE_KEY_PREFIX),
        store.removeByPrefix(CUSTOMER_NATURAL_LASH_KEY_PREFIX),
        store.removeByPrefix(CUSTOMER_COMBO_EXPIRY_KEY_PREFIX),
        store.remove(LEGACY_LIVE_OVERRIDES_KEY),
      ]);
      return;
    }
    const removals = bookingIds.flatMap((id) => [
      store.remove(getBookingOverrideKey(id)),
      store.remove(getLegacySettleKey(id)),
    ]);
    if (customerIds && customerIds.length > 0) {
      for (const cid of customerIds) {
        if (cid > 0) {
          removals.push(store.remove(getCustomerNaturalLashKey(cid)));
          removals.push(store.remove(getCustomerComboExpiryKey(cid)));
        }
      }
    }
    await Promise.all(removals);
    const legacyRaw = await store.getOne(LEGACY_LIVE_OVERRIDES_KEY);
    const legacyMap = safeJsonParseObject(legacyRaw);
    if (legacyMap) {
      let changed = false;
      for (const id of bookingIds) {
        if (Object.prototype.hasOwnProperty.call(legacyMap, String(id))) {
          delete legacyMap[String(id)];
          changed = true;
        }
      }
      if (changed) {
        await store.upsert(LEGACY_LIVE_OVERRIDES_KEY, JSON.stringify(legacyMap));
      }
    }
  }

  async function loadBookingOverridesBatch(bookingIds: number[]): Promise<Record<string, BookingOverrideRecord>> {
    const uniqueIds = Array.from(new Set(bookingIds.filter((id) => Number.isFinite(id) && id > 0)));
    if (uniqueIds.length === 0) return {};

    const keys = uniqueIds.map((id) => getBookingOverrideKey(id));
    const [legacyRaw, atomicRows] = await Promise.all([store.getOne(LEGACY_LIVE_OVERRIDES_KEY), store.getMany(keys)]);

    const result: Record<string, BookingOverrideRecord> = {};
    const legacyMap = safeJsonParseObject(legacyRaw);
    if (legacyMap) {
      for (const id of uniqueIds) {
        const entry = legacyMap[String(id)];
        if (entry && typeof entry === 'object') {
          result[String(id)] = entry as BookingOverrideRecord;
        }
      }
    }

    for (const id of uniqueIds) {
      const raw = atomicRows.get(getBookingOverrideKey(id));
      const parsed = safeJsonParseObject(raw);
      if (parsed) {
        result[String(id)] = parsed;
      }
    }

    return result;
  }

  async function saveCustomerAvatar(customerId: number, avatarUrl: string): Promise<void> {
    if (!customerId || customerId <= 0) return;
    const trimmed = String(avatarUrl || '').trim();
    const key = getCustomerAvatarKey(customerId);
    if (!trimmed) {
      await store.remove(key);
      const legacyRaw = await store.getOne(LEGACY_CUSTOMER_AVATARS_KEY);
      const legacyMap = safeJsonParseObject(legacyRaw);
      if (legacyMap && Object.prototype.hasOwnProperty.call(legacyMap, String(customerId))) {
        delete legacyMap[String(customerId)];
        await store.upsert(LEGACY_CUSTOMER_AVATARS_KEY, JSON.stringify(legacyMap));
      }
      return;
    }
    await store.upsert(key, JSON.stringify({ avatarUrl: trimmed }));
  }

  async function loadCustomerAvatarsBatch(customerIds: number[]): Promise<Record<string, string>> {
    const uniqueIds = Array.from(new Set(customerIds.filter((id) => Number.isFinite(id) && id > 0)));
    if (uniqueIds.length === 0) return {};

    const keys = uniqueIds.map((id) => getCustomerAvatarKey(id));
    const [legacyRaw, atomicRows] = await Promise.all([store.getOne(LEGACY_CUSTOMER_AVATARS_KEY), store.getMany(keys)]);

    const result: Record<string, string> = {};
    const legacyMap = safeJsonParseObject(legacyRaw);
    if (legacyMap) {
      for (const id of uniqueIds) {
        const val = legacyMap[String(id)];
        if (typeof val === 'string' && val.trim()) {
          result[String(id)] = val.trim();
        }
      }
    }

    for (const id of uniqueIds) {
      const parsed = parseAvatarConfigValue(atomicRows.get(getCustomerAvatarKey(id)));
      if (parsed) {
        result[String(id)] = parsed;
      }
    }

    return result;
  }

  async function applyConcurrentBookingOverride(
    bookingId: number,
    updater: (current: BookingOverrideRecord) => BookingOverrideRecord | Promise<BookingOverrideRecord>
  ): Promise<BookingOverrideRecord> {
    return withBookingLock(bookingId, async () => {
      const current = (await loadBookingOverride(bookingId)) || {};
      const next = await updater(current);
      await saveBookingOverride(bookingId, next);
      return next;
    });
  }

  async function loadSettlementReceipt(bookingId: number): Promise<LegacySettlementReceipt | null> {
    const raw = await store.getOne(getLegacySettleKey(bookingId));
    const parsed = safeJsonParseObject(raw);
    return parsed ? (parsed as unknown as LegacySettlementReceipt) : null;
  }

  async function saveSettlementReceipt(bookingId: number, receipt: LegacySettlementReceipt): Promise<void> {
    await store.upsert(getLegacySettleKey(bookingId), JSON.stringify(receipt));
  }

  async function saveCustomerNaturalLashProfile(
    customerId: number,
    attrs: NaturalLashConsultationAttributes
  ): Promise<void> {
    if (!customerId || customerId <= 0) return;
    const clean = extractCleanNaturalLashProfile(attrs as Record<string, SafeAny>);
    if (!clean) return;
    await store.upsert(getCustomerNaturalLashKey(customerId), JSON.stringify(clean));
  }

  async function loadCustomerNaturalLashProfile(customerId: number): Promise<NaturalLashConsultationAttributes | null> {
    if (!customerId || customerId <= 0) return null;
    const raw = await store.getOne(getCustomerNaturalLashKey(customerId));
    return extractCleanNaturalLashProfile(safeJsonParseObject(raw));
  }

  async function deleteCustomerNaturalLashProfile(customerId: number): Promise<void> {
    if (!customerId || customerId <= 0) return;
    await store.remove(getCustomerNaturalLashKey(customerId));
  }

  async function loadCustomerNaturalLashProfilesBatch(
    customerIds: number[]
  ): Promise<Record<string, NaturalLashConsultationAttributes>> {
    const uniqueIds = Array.from(new Set(customerIds.filter((id) => Number.isFinite(id) && id > 0)));
    if (uniqueIds.length === 0) return {};

    const keys = uniqueIds.map((id) => getCustomerNaturalLashKey(id));
    const atomicRows = await store.getMany(keys);
    const result: Record<string, NaturalLashConsultationAttributes> = {};
    for (const id of uniqueIds) {
      const clean = extractCleanNaturalLashProfile(safeJsonParseObject(atomicRows.get(getCustomerNaturalLashKey(id))));
      if (clean) {
        result[String(id)] = clean;
      }
    }
    return result;
  }

  async function saveCustomerComboExpiryOverride(
    customerId: number,
    entry: CustomerComboExpiryOverrideEntry
  ): Promise<void> {
    if (!customerId || customerId <= 0) return;
    const key = getCustomerComboExpiryKey(customerId);
    const existing = safeJsonParseObject(await store.getOne(key)) || {};
    const entryKey = entry.balanceId > 0 ? String(entry.balanceId) : entry.serviceGroup;
    existing[entryKey] = entry;
    await store.upsert(key, JSON.stringify(existing));
  }

  async function loadCustomerComboExpiryOverridesBatch(
    customerIds: number[]
  ): Promise<Record<string, Record<string, CustomerComboExpiryOverrideEntry>>> {
    const uniqueIds = Array.from(new Set(customerIds.filter((id) => Number.isFinite(id) && id > 0)));
    if (uniqueIds.length === 0) return {};

    const keys = uniqueIds.map((id) => getCustomerComboExpiryKey(id));
    const atomicRows = await store.getMany(keys);
    const result: Record<string, Record<string, CustomerComboExpiryOverrideEntry>> = {};
    for (const id of uniqueIds) {
      const parsed = safeJsonParseObject(atomicRows.get(getCustomerComboExpiryKey(id)));
      if (parsed) {
        result[String(id)] = parsed as Record<string, CustomerComboExpiryOverrideEntry>;
      }
    }
    return result;
  }

  return {
    withBookingLock,
    loadBookingOverride,
    saveBookingOverride,
    deleteBookingOverride,
    resetDemoOverrides,
    loadBookingOverridesBatch,
    saveCustomerAvatar,
    loadCustomerAvatarsBatch,
    saveCustomerNaturalLashProfile,
    loadCustomerNaturalLashProfile,
    deleteCustomerNaturalLashProfile,
    loadCustomerNaturalLashProfilesBatch,
    saveCustomerComboExpiryOverride,
    loadCustomerComboExpiryOverridesBatch,
    applyConcurrentBookingOverride,
    loadSettlementReceipt,
    saveSettlementReceipt,
  };
}

export const defaultIosOverrideRepo = createOverrideRepository();
