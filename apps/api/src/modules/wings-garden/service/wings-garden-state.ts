import type { FastifyInstance } from 'fastify';
import {
  computeMandatoryKitCoverage,
  DEFAULT_WINGS_GARDEN_CONFIG,
  hasExpiredGlueInItems,
  WINGS_GARDEN_WAREHOUSES,
  type WingsGardenConfig,
  type WingsGardenIslandState,
  type WingsGardenLegacyQrLookup,
  type WingsGardenLegacyWarehouseCounts,
  type WingsGardenPreviewRole,
  type WingsGardenStateResponse,
  type WingsGardenWallet,
  type WingsGardenWarehouseId,
} from '@mos-lab/shared';
import type { IosAuthContext } from '../../ios/services/ios-auth.service.js';
import {
  fetchLegacyStaffTodayEvents,
  fetchLegacyWarehouseSnapshot,
  lookupLegacyQrUnit,
} from '../wings-garden-legacy.service.js';
import { ensureConfigFeatherRules, ensureWalletQuestState } from '../wings-garden-rules.service.js';
import {
  createDefaultIslandState,
  createDefaultWallet,
  getTimeLabel,
  getTodayDateString,
} from './wings-garden-seeds.js';

export interface WingsGardenStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export interface WingsGardenLegacyAdapter {
  lookupQr: (rawCode: string, config: WingsGardenConfig) => Promise<WingsGardenLegacyQrLookup>;
  fetchSnapshot: (
    warehouseId: WingsGardenWarehouseId,
    config: WingsGardenConfig
  ) => ReturnType<typeof fetchLegacyWarehouseSnapshot>;
  fetchStaffTodayEvents?: (
    legacyStaffId: number | undefined,
    todayDateKey: string,
    comboWindowDays: number
  ) => ReturnType<typeof fetchLegacyStaffTodayEvents>;
}

export function normalizeWarehouseId(raw: unknown): WingsGardenWarehouseId {
  return Number(raw) === 41 ? 41 : 3;
}

export function normalizePreviewRole(raw: unknown): WingsGardenPreviewRole {
  const up = String(raw || '').toUpperCase();
  if (up === 'CVLL' || up === 'CV' || up === 'FM' || up === 'ADMIN') return up;
  return 'CVL';
}

export function createPrismaWingsGardenStore(fastify: FastifyInstance): WingsGardenStore {
  return {
    async get(key: string): Promise<string | null> {
      const row = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key },
        select: { value: true },
      });
      return row?.value ?? null;
    },
    async set(key: string, value: string): Promise<void> {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    },
  };
}

export function appendLedger(island: WingsGardenIslandState, type: string, message: string): void {
  island.ledger.unshift({
    id: `ldg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    time: getTimeLabel(),
    type,
    message,
  });
  if (island.ledger.length > 30) {
    island.ledger = island.ledger.slice(0, 30);
  }
}

export function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function loadOrInitConfig(store: WingsGardenStore): Promise<WingsGardenConfig> {
  const existing = safeParseJson<WingsGardenConfig>(await store.get('WG_CFG'));
  if (existing && Array.isArray(existing.skus) && existing.skus.length >= 24) {
    const hadRules = Array.isArray(existing.featherRules) && existing.featherRules.length >= 9;
    ensureConfigFeatherRules(existing);
    if (!hadRules) {
      await store.set('WG_CFG', JSON.stringify(existing));
    }
    return existing;
  }
  const cloned = JSON.parse(JSON.stringify(DEFAULT_WINGS_GARDEN_CONFIG)) as WingsGardenConfig;
  ensureConfigFeatherRules(cloned);
  await store.set('WG_CFG', JSON.stringify(cloned));
  return cloned;
}

export async function loadOrInitWallet(
  store: WingsGardenStore,
  staffId: number,
  staffName: string
): Promise<WingsGardenWallet> {
  const key = `WG_W:${staffId}`;
  const today = getTodayDateString();
  const existing = safeParseJson<WingsGardenWallet>(await store.get(key));
  if (existing && typeof existing.feathers === 'number') {
    let dirty = false;
    if (!existing.staffName && staffName) {
      existing.staffName = staffName;
      dirty = true;
    }
    const questSync = ensureWalletQuestState(existing, today);
    if (dirty || questSync.changed) {
      await store.set(key, JSON.stringify(existing));
    }
    return existing;
  }
  const created = createDefaultWallet(staffId, staffName);
  await store.set(key, JSON.stringify(created));
  return created;
}

export async function loadOrInitIsland(
  store: WingsGardenStore,
  warehouseId: WingsGardenWarehouseId,
  actorName: string
): Promise<WingsGardenIslandState> {
  const key = `WG_I:${warehouseId}`;
  const existing = safeParseJson<WingsGardenIslandState>(await store.get(key));
  if (existing && Array.isArray(existing.items)) {
    const today = getTodayDateString();
    if (existing.emergencyOffDate !== today) {
      existing.emergencyOffDate = today;
      existing.emergencyOffCountToday = 0;
    }
    return existing;
  }
  const created = createDefaultIslandState(warehouseId, actorName);
  await store.set(key, JSON.stringify(created));
  return created;
}

export function buildStateResponse(params: {
  config: WingsGardenConfig;
  wallet: WingsGardenWallet;
  island: WingsGardenIslandState;
  otherIsland: WingsGardenIslandState;
  legacyCounts: WingsGardenLegacyWarehouseCounts;
  previewRole: WingsGardenPreviewRole;
  actor: IosAuthContext;
}): WingsGardenStateResponse {
  const { config, wallet, island, otherIsland, legacyCounts, previewRole, actor } = params;
  const nowMs = Date.now();
  const mandatoryCoverage = computeMandatoryKitCoverage(island.items, config, nowMs);
  const expiredGlue = hasExpiredGlueInItems(island.items, nowMs);
  const personalUsing = island.items.filter((i) => i.state === 'USING' && !i.isShared).length;
  const sharedUsing = island.items.filter((i) => i.state === 'USING' && i.isShared).length;
  const starterNewSum = Object.values(legacyCounts.bySkuNew).reduce((sum, n) => sum + Number(n || 0), 0);
  const otherMeta = WINGS_GARDEN_WAREHOUSES.find((w) => w.warehouseId === otherIsland.warehouseId)!;
  const deThamLight = island.warehouseId === 3 ? island.lightHp : otherIsland.lightHp;
  const estellaLight = island.warehouseId === 41 ? island.lightHp : otherIsland.lightHp;

  return {
    success: true,
    config,
    wallet,
    island,
    otherIslandSummary: {
      warehouseId: otherIsland.warehouseId,
      name: otherMeta.name,
      lightHp: otherIsland.lightHp,
      harvestedToday: otherIsland.harvestedToday,
      emergencyOffCountToday: otherIsland.emergencyOffCountToday,
    },
    legacyCounts,
    mandatoryCoverage,
    hasExpiredGlue: expiredGlue,
    reports: {
      report1NewCount: starterNewSum,
      report1LegacyNewCount: legacyCounts.totalNew,
      report2UsingCount: island.items.filter((i) => i.state === 'USING').length,
      report2PersonalUsing: personalUsing,
      report2SharedUsing: sharedUsing,
      report3UsedTodayCount: island.harvestedToday,
      report4WalletFeathers: wallet.feathers,
      report4CashSpentVnd: wallet.cashSpentVnd,
      report4CashOrdersCount: wallet.cashOrdersCount,
      report5DeThamLightHp: deThamLight,
      report5EstellaLightHp: estellaLight,
      report7ActiveSkuCount: config.skus.length,
      report8SuggestedReorderCount: config.skus.filter((s) => (legacyCounts.bySkuNew[s.skuId] || 0) <= 5).length,
      report9LegacyLostBaseline: legacyCounts.totalLost,
    },
    previewRole,
    actor: {
      id: Number(actor.id || 1),
      displayName: String(actor.displayName || 'Admin'),
      role: String(actor.role || 'admin'),
    },
  };
}

export function createDefaultLegacyAdapter(fastify: FastifyInstance): WingsGardenLegacyAdapter {
  return {
    lookupQr: (rawCode, config) => lookupLegacyQrUnit(fastify, rawCode, config),
    fetchSnapshot: (warehouseId, config) => fetchLegacyWarehouseSnapshot(fastify, warehouseId, config),
    fetchStaffTodayEvents: (legacyStaffId, todayDateKey, comboWindowDays) =>
      fetchLegacyStaffTodayEvents(fastify, legacyStaffId, todayDateKey, comboWindowDays),
  };
}

export function findMatchingActiveItem(island: WingsGardenIslandState, rawCode: string, itemUid?: string): number {
  if (itemUid) {
    const byUid = island.items.findIndex((i) => i.uid === itemUid && i.state === 'USING');
    if (byUid !== -1) return byUid;
  }
  const clean = rawCode.trim();
  if (!clean) return -1;
  const noHash = clean.replace(/^#/, '');
  return island.items.findIndex((i) => {
    if (i.state !== 'USING') return false;
    const itemNoHash = i.scanCode.replace(/^#/, '');
    return i.scanCode === clean || itemNoHash === noHash || `#${noHash}` === i.scanCode;
  });
}
