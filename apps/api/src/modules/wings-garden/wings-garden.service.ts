import type { FastifyInstance } from 'fastify';
import {
  computeMandatoryKitCoverage,
  DEFAULT_WINGS_GARDEN_CONFIG,
  hasExpiredGlueInItems,
  isWingsGardenGlueExpired,
  WINGS_GARDEN_WAREHOUSES,
  WingsGardenActionRequest,
  WingsGardenActionResponse,
  WingsGardenChestKind,
  WingsGardenConfig,
  WingsGardenIslandState,
  WingsGardenLegacyQrLookup,
  WingsGardenLegacyWarehouseCounts,
  WingsGardenOverlayItem,
  WingsGardenPerkCard,
  WingsGardenPreviewRole,
  WingsGardenSkuConfig,
  WingsGardenStateResponse,
  WingsGardenWallet,
  WingsGardenWarehouseId,
} from '@mos-lab/shared';
import type { IosAuthContext } from '../ios/services/ios-auth.service.js';
import {
  fetchLegacyStaffTodayEvents,
  fetchLegacyWarehouseSnapshot,
  lookupLegacyQrUnit,
} from './wings-garden-legacy.service.js';
import {
  applyUniqueQrStageReward,
  awardFeatherRuleEvent,
  createEmptyDailyProgress,
  ensureConfigFeatherRules,
  ensureWalletQuestState,
  evaluateDailyLashMilestones,
  normalizeUniqueQrKey,
  sanitizeFeatherRules,
} from './wings-garden-rules.service.js';

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

function getTodayDateString(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getTimeLabel(): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

function normalizeWarehouseId(raw: unknown): WingsGardenWarehouseId {
  return Number(raw) === 41 ? 41 : 3;
}

function normalizePreviewRole(raw: unknown): WingsGardenPreviewRole {
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

export function createDefaultWallet(staffId: number, staffName: string): WingsGardenWallet {
  const today = getTodayDateString();
  return {
    staffId,
    staffName,
    feathers: 34,
    cashSpentVnd: 0,
    cashOrdersCount: 0,
    wingTier: 1,
    streakDays: 7,
    servicesDoneToday: 0,
    chests: { bronze: 1, silver: 1, gold: 1 },
    chestOpenedCount: { bronze: 0, silver: 0, gold: 0 },
    perkCards: [],
    dailyProgress: createEmptyDailyProgress(today),
    pendingClaims: [],
    processedEventKeys: [],
    updatedAt: new Date().toISOString(),
  };
}

export function createDefaultIslandState(
  warehouseId: WingsGardenWarehouseId,
  actorName: string
): WingsGardenIslandState {
  const now = Date.now();
  const daysAgoIso = (days: number) => new Date(now - days * 86400000).toISOString();
  const shortName = warehouseId === 41 ? 'Estella' : 'Đề Thám';
  const defaultOwner = warehouseId === 41 ? 'Diễm Hương (CVLL)' : actorName;

  const starterItems: WingsGardenOverlayItem[] =
    warehouseId === 3
      ? [
          {
            uid: 'wg-init-1',
            scanCode: '#4421750',
            legacyWarehouseItemId: 78730,
            legacyItemId: 714,
            skuId: 'keo-den',
            name: 'Keo Đen (Wings SH)',
            category: 'GLUE',
            ownerStaffId: 1,
            ownerName: defaultOwner,
            warehouseId: 3,
            state: 'USING',
            payMethod: 'FEATHER',
            payLabel: 'Đổi 28 Lông',
            listedPriceVnd: 95000,
            costFeathers: 28,
            cashbackFeathers: 4,
            isShared: false,
            remainingPct: 35,
            openedAt: daysAgoIso(16),
            daysOffset: 0,
            freshLimitDays: 21,
            timeline: [
              { time: '07/09 · 17:36', actor: 'Wings-HQ', detail: 'Chuyển kho Đề Thám (NEW)' },
              { time: '16 ngày trước', actor: defaultOwner, detail: 'Đổi 28 Lông & quét NEW → USING' },
            ],
          },
          {
            uid: 'wg-init-2',
            scanCode: '#4431435',
            legacyItemId: 745,
            skuId: 'bot-rua-mi',
            name: 'Bọt Rửa Mi',
            category: 'HYGIENE',
            ownerStaffId: 1,
            ownerName: defaultOwner,
            warehouseId: 3,
            state: 'USING',
            payMethod: 'CASH',
            payLabel: 'Mua 21.000đ',
            listedPriceVnd: 21000,
            costFeathers: 7,
            cashbackFeathers: 1,
            isShared: false,
            remainingPct: 0,
            openedAt: daysAgoIso(19),
            daysOffset: 0,
            freshLimitDays: 60,
            timeline: [{ time: '19 ngày trước', actor: defaultOwner, detail: 'Mua giá niêm yết 21.000đ & quét USING' }],
          },
          {
            uid: 'wg-init-3',
            scanCode: '#4431292',
            legacyItemId: 741,
            skuId: 'sap-thao-mi',
            name: 'Sáp Tháo Mi',
            category: 'SOLUTION',
            ownerStaffId: 1,
            ownerName: defaultOwner,
            warehouseId: 3,
            state: 'USING',
            payMethod: 'FEATHER',
            payLabel: 'Đổi 10 Lông',
            listedPriceVnd: 30000,
            costFeathers: 10,
            cashbackFeathers: 2,
            isShared: false,
            remainingPct: 68,
            openedAt: daysAgoIso(11),
            daysOffset: 0,
            freshLimitDays: 90,
            timeline: [{ time: '11 ngày trước', actor: defaultOwner, detail: 'Đổi 10 Lông & quét USING' }],
          },
          {
            uid: 'wg-init-4',
            scanCode: '#4398979',
            skuId: 'khay-mi-lua',
            name: 'Khay Mi Lụa 0.07 / 0.10',
            category: 'LASH',
            ownerStaffId: 0,
            ownerName: 'Đồ Chung Sảnh Đề Thám',
            warehouseId: 3,
            state: 'USING',
            payMethod: 'FEATHER',
            payLabel: 'Đổi 14 Lông',
            listedPriceVnd: 45000,
            costFeathers: 14,
            cashbackFeathers: 2,
            isShared: true,
            remainingPct: 45,
            openedAt: daysAgoIso(9),
            daysOffset: 0,
            freshLimitDays: null,
            timeline: [{ time: '9 ngày trước', actor: 'Thảo Ly (FM)', detail: 'Mở Khay Chung Sảnh (NEW → USING)' }],
          },
        ]
      : [
          {
            uid: 'wg-ep-1',
            scanCode: '#4402334',
            legacyItemId: 293,
            skuId: 'keo-xanh',
            name: 'Keo Xanh (Sky Zone)',
            category: 'GLUE',
            ownerStaffId: 1,
            ownerName: defaultOwner,
            warehouseId: 41,
            state: 'USING',
            payMethod: 'CASH',
            payLabel: 'Mua 96.000đ',
            listedPriceVnd: 96000,
            costFeathers: 28,
            cashbackFeathers: 4,
            isShared: false,
            remainingPct: 58,
            openedAt: daysAgoIso(10),
            daysOffset: 0,
            freshLimitDays: 21,
            timeline: [{ time: '10 ngày trước', actor: defaultOwner, detail: 'Mua 96.000đ & quét USING tại Estella' }],
          },
          {
            uid: 'wg-ep-2',
            scanCode: '#4460096',
            legacyItemId: 284,
            skuId: 'eyepatch-gel',
            name: 'Eyepatch Gel',
            category: 'EYEPAD',
            ownerStaffId: 1,
            ownerName: defaultOwner,
            warehouseId: 41,
            state: 'USING',
            payMethod: 'FEATHER',
            payLabel: 'Đổi 8 Lông',
            listedPriceVnd: 26000,
            costFeathers: 8,
            cashbackFeathers: 1,
            isShared: false,
            remainingPct: 0,
            openedAt: daysAgoIso(14),
            daysOffset: 0,
            freshLimitDays: null,
            timeline: [{ time: '14 ngày trước', actor: defaultOwner, detail: 'Quét USING tại Estella' }],
          },
        ];

  const today = getTodayDateString();
  const timeStr = getTimeLabel();
  const dueIso = new Date(now + 4 * 60000).toISOString();

  return {
    warehouseId,
    lightHp: warehouseId === 3 ? 88 : 82,
    harvestedToday: warehouseId === 3 ? 19 : 14,
    comboCount: 0,
    emergencyOffDate: today,
    emergencyOffCountToday: 0,
    items: starterItems,
    usedHistory: [
      {
        uid: `wg-used-seed-${warehouseId}`,
        scanCode: warehouseId === 3 ? '#4461178' : '#4433045',
        skuId: warehouseId === 3 ? 'keo-den' : 'bao-rac',
        name: warehouseId === 3 ? 'Keo Đen (Wings SH)' : 'Bao Rác',
        actorName: defaultOwner,
        warehouseId,
        payMethod: 'FEATHER',
        payLabel: warehouseId === 3 ? 'Đổi 28 Lông' : 'Đổi 8 Lông',
        usedAt: `Hôm nay · ${timeStr}`,
        originSummary: `Royal Beauty → Wings-HQ → ${shortName} → USED`,
      },
    ],
    airshipOrders: [
      {
        id: `air-${warehouseId}-1`,
        requesterName: warehouseId === 3 ? 'Phương Nhi (CV)' : 'Minh Thư (CV)',
        skuId: 'bong-tam-nho',
        itemName: 'Bông Tăm Nhỏ (Micro Brush)',
        warehouseId,
        createdAt: new Date(now).toISOString(),
        dueAt: dueIso,
      },
    ],
    darkClouds: [
      {
        id: `cld-${warehouseId}-1`,
        warehouseId,
        text:
          warehouseId === 3
            ? '1 vỏ Bọt Rửa Mi (#4431435) đang chín vàng chờ quét USED'
            : '1 hộp Eyepatch Gel (#4460096) chờ quét thu hoạch vỏ USED',
        kind: 'RIPE_SHELL',
        createdAt: new Date(now).toISOString(),
      },
    ],
    ledger: [
      {
        id: `ldg-${warehouseId}-1`,
        time: timeStr,
        type: 'INIT',
        message: `Khởi tạo Thiên Đường Nối Lông · Đảo ${shortName} (Overlay Read-Only Legacy + Write mos_lab)`,
      },
    ],
    updatedAt: new Date(now).toISOString(),
  };
}

function appendLedger(island: WingsGardenIslandState, type: string, message: string): void {
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

function safeParseJson<T>(raw: string | null): T | null {
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

function buildStateResponse(params: {
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

export async function getWingsGardenState(
  fastify: FastifyInstance,
  actor: IosAuthContext,
  rawWarehouseId: unknown,
  rawPreviewRole?: unknown,
  deps?: { store?: WingsGardenStore; legacy?: WingsGardenLegacyAdapter }
): Promise<WingsGardenStateResponse> {
  const store = deps?.store || createPrismaWingsGardenStore(fastify);
  const legacy = deps?.legacy || createDefaultLegacyAdapter(fastify);
  const staffId = Number(actor.id || 1);
  const actorName = String(actor.displayName || 'Danny Do');
  const warehouseId = normalizeWarehouseId(rawWarehouseId);
  const otherWarehouseId: WingsGardenWarehouseId = warehouseId === 3 ? 41 : 3;
  const previewRole = normalizePreviewRole(rawPreviewRole);

  const config = await loadOrInitConfig(store);
  const [wallet, island, otherIsland, legacyCounts] = await Promise.all([
    loadOrInitWallet(store, staffId, actorName),
    loadOrInitIsland(store, warehouseId, actorName),
    loadOrInitIsland(store, otherWarehouseId, actorName),
    legacy.fetchSnapshot(warehouseId, config),
  ]);

  return buildStateResponse({
    config,
    wallet,
    island,
    otherIsland,
    legacyCounts,
    previewRole,
    actor,
  });
}

function findMatchingActiveItem(island: WingsGardenIslandState, rawCode: string, itemUid?: string): number {
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

function harvestOverlayItem(params: {
  idx: number;
  config: WingsGardenConfig;
  island: WingsGardenIslandState;
  wallet: WingsGardenWallet;
  actorName: string;
  previewRole: WingsGardenPreviewRole;
  todayDateKey: string;
}): { message: string } {
  const { idx, config, island, wallet, actorName, previewRole, todayDateKey } = params;
  const item = island.items[idx];
  const bonus = Math.max(1, item.cashbackFeathers || 1);

  wallet.feathers += bonus;
  wallet.streakDays += 1;
  wallet.updatedAt = new Date().toISOString();

  const qrKey = normalizeUniqueQrKey(item.scanCode, item.legacyWarehouseItemId);
  const usedStageReward = applyUniqueQrStageReward({
    config,
    wallet,
    island,
    role: previewRole,
    qrKey,
    displayCode: item.scanCode,
    stage: 'USED',
    actorName,
    todayDateKey,
  });

  island.lightHp = Math.min(100, island.lightHp + 4);
  island.harvestedToday += 1;
  island.items.splice(idx, 1);

  const shortWarehouse = island.warehouseId === 41 ? 'Estella' : 'Đề Thám';
  island.usedHistory.unshift({
    uid: item.uid,
    scanCode: item.scanCode,
    skuId: item.skuId,
    name: item.name,
    actorName,
    warehouseId: item.warehouseId,
    payMethod: item.payMethod,
    payLabel: item.payLabel,
    usedAt: `Hôm nay · ${getTimeLabel()}`,
    originSummary: `Wings-HQ → ${shortWarehouse} → ${item.ownerName} (${item.payLabel}) → USED`,
  });
  if (island.usedHistory.length > 40) {
    island.usedHistory = island.usedHistory.slice(0, 40);
  }

  // Clear resolved dark clouds
  if (!island.items.some((i) => i.remainingPct <= 0)) {
    island.darkClouds = island.darkClouds.filter((c) => c.kind !== 'RIPE_SHELL');
  }
  if (!hasExpiredGlueInItems(island.items)) {
    island.darkClouds = island.darkClouds.filter((c) => c.kind !== 'EXPIRED_GLUE');
  }

  const stageNote = usedStageReward.rewarded ? ` +${usedStageReward.feathers} Lông Scan USED` : '';
  appendLedger(
    island,
    'HARVEST_USED',
    `Thu hoạch vỏ ${item.scanCode} (${item.name}: USING → USED) · +${bonus} Lông Tái Sinh${stageNote} · Chuỗi ${wallet.streakDays} ngày`
  );

  return {
    message: `🌾 Đã quét thu hoạch vỏ ${item.scanCode}! +${bonus} Lông Tái Sinh${stageNote} & +4% Ánh Sáng Đảo.`,
  };
}

export async function executeWingsGardenAction(
  fastify: FastifyInstance,
  actor: IosAuthContext,
  req: WingsGardenActionRequest,
  deps?: { store?: WingsGardenStore; legacy?: WingsGardenLegacyAdapter }
): Promise<WingsGardenActionResponse> {
  const store = deps?.store || createPrismaWingsGardenStore(fastify);
  const legacy = deps?.legacy || createDefaultLegacyAdapter(fastify);
  const staffId = Number(actor.id || 1);
  const actorName = String(actor.displayName || 'Danny Do');
  const warehouseId = normalizeWarehouseId(req.warehouseId);
  const otherWarehouseId: WingsGardenWarehouseId = warehouseId === 3 ? 41 : 3;
  const previewRole = normalizePreviewRole(req.previewRole);

  const config = await loadOrInitConfig(store);
  const todayDateKey = getTodayDateString();
  let wallet = await loadOrInitWallet(store, staffId, actorName);
  let island = await loadOrInitIsland(store, warehouseId, actorName);
  const otherIsland = await loadOrInitIsland(store, otherWarehouseId, actorName);
  let message: string;
  let chestOutcome: WingsGardenActionResponse['chestOutcome'];

  if (req.action === 'RESET_PROTOTYPE') {
    wallet = createDefaultWallet(staffId, actorName);
    island = createDefaultIslandState(warehouseId, actorName);
    await Promise.all([
      store.set(`WG_W:${staffId}`, JSON.stringify(wallet)),
      store.set(`WG_I:${warehouseId}`, JSON.stringify(island)),
    ]);
    const legacyCounts = await legacy.fetchSnapshot(warehouseId, config);
    return {
      success: true,
      message: '↺ Đã khôi phục dữ liệu mẫu Thiên Đường Nối Lông (giữ nguyên cấu hình Admin).',
      state: buildStateResponse({ config, wallet, island, otherIsland, legacyCounts, previewRole, actor }),
    };
  }

  switch (req.action) {
    case 'SIMULATE_SERVICE': {
      const kind = req.serviceKind || 'FULL_SET';
      const label = kind === 'FULL_SET' ? 'Nối Mi Mới' : kind === 'REFILL' ? 'Dặm Mi' : 'Tháo / Spa Mi';
      let gain: number;
      let extraNote = '';

      if (kind === 'REMOVE') {
        gain = config.serviceEarn.removeOrSpa;
        wallet.feathers += gain;
      } else {
        const trigger = kind === 'FULL_SET' ? 'LASH_FULL_SET' : 'LASH_REFILL';
        const res = awardFeatherRuleEvent({
          config,
          wallet,
          role: previewRole,
          trigger,
          eventKey: `sim:${trigger}:${Date.now()}:${Math.floor(Math.random() * 10000)}`,
          title: label,
          detail: `Ca ${label} (${previewRole})`,
          todayDateKey,
        });
        gain = res.feathers;
        if (wallet.dailyProgress) {
          if (kind === 'FULL_SET') {
            wallet.dailyProgress.fullSetsToday += 1;
            wallet.dailyProgress.lashSetsToday = Number((wallet.dailyProgress.lashSetsToday + 1).toFixed(2));
          } else {
            wallet.dailyProgress.refillsToday += 1;
            const weight = typeof res.rule?.refillSetWeight === 'number' ? res.rule.refillSetWeight : 0.5;
            wallet.dailyProgress.lashSetsToday = Number((wallet.dailyProgress.lashSetsToday + weight).toFixed(2));
          }
        }
        const unlocked = evaluateDailyLashMilestones({ config, wallet, role: previewRole, todayDateKey });
        if (unlocked.length > 0) {
          extraNote = ` 🎉 Mở mốc ${unlocked.map((u) => `${u.thresholdSets} bộ (+${u.feathers} Lông)`).join(', ')}!`;
        }
      }

      wallet.servicesDoneToday += 1;
      for (const it of island.items) {
        if (it.state !== 'USING') continue;
        const drop = it.category === 'GLUE' ? 18 : 25;
        it.remainingPct = Math.max(0, it.remainingPct - drop);
      }
      appendLedger(island, 'SERVICE_EARN', `${actorName} hoàn tất ca ${label} → +${gain} Lông Vàng${extraNote}`);
      message = `✨ +${gain} Lông Vàng từ ca ${label}!${extraNote}`;
      break;
    }

    case 'BONUS_FEATHERS': {
      const bonus = Math.max(1, Math.min(500, Number(req.amountFeathers || 60)));
      wallet.feathers += bonus;
      appendLedger(island, 'BONUS_FEATHERS', `Cộng thử +${bonus} Lông Vàng để test Kết Cánh & Rương`);
      message = `🎁 Đã cộng +${bonus} Lông Vàng vào ví!`;
      break;
    }

    case 'FAST_FORWARD_DAYS': {
      const days = Math.max(1, Math.min(30, Number(req.amountFeathers || 7)));
      for (const it of island.items) {
        if (it.state !== 'USING') continue;
        it.daysOffset += days;
        it.remainingPct = Math.max(0, it.remainingPct - 45);
      }
      if (hasExpiredGlueInItems(island.items) && !island.darkClouds.some((c) => c.kind === 'EXPIRED_GLUE')) {
        island.darkClouds.unshift({
          id: `cld-exp-${Date.now()}`,
          warehouseId,
          text: 'Phát hiện lọ Keo mở nắp quá 21 ngày — cần đổi keo tươi ngay!',
          kind: 'EXPIRED_GLUE',
          createdAt: new Date().toISOString(),
        });
      }
      appendLedger(island, 'SIM_TIME', `Tua +${days} ngày: làm chín vỏ & kiểm tra rào chắn độ tươi keo`);
      message = `⏩ Đã tua +${days} ngày — kiểm tra vỏ chín vàng & hạn tươi keo!`;
      break;
    }

    case 'SCAN_QR': {
      const rawCode = String(req.scanCode || '').trim();
      const activeIdx = findMatchingActiveItem(island, rawCode, req.itemUid);

      // 1. If item is currently USING in this island -> Harvest USING -> USED
      if (activeIdx !== -1) {
        const res = harvestOverlayItem({
          idx: activeIdx,
          config,
          island,
          wallet,
          actorName,
          previewRole,
          todayDateKey,
        });
        message = res.message;
        break;
      }

      // 2. Otherwise -> Receive NEW -> USING (with real Legacy lookup + Dual Payment + Unique QR USING bonus)
      const lookup = rawCode ? await legacy.lookupQr(rawCode, config) : null;
      const sku: WingsGardenSkuConfig | undefined =
        (lookup?.matchedSkuId ? config.skus.find((s) => s.skuId === lookup.matchedSkuId) : undefined) ||
        (req.skuId ? config.skus.find((s) => s.skuId === req.skuId) : undefined) ||
        config.skus[0];

      if (!sku) {
        throw Object.assign(new Error('Không tìm thấy sản phẩm phù hợp với tem QR vừa quét.'), { statusCode: 400 });
      }

      const effectivePrice =
        lookup?.retailPriceVnd && lookup.retailPriceVnd > 0 ? lookup.retailPriceVnd : sku.listedPriceVnd;
      const payMethod = req.payMethod === 'CASH' ? 'CASH' : 'FEATHER';
      let payLabel: string;

      if (payMethod === 'CASH') {
        wallet.cashSpentVnd += effectivePrice;
        wallet.cashOrdersCount += 1;
        payLabel = `Mua ${effectivePrice.toLocaleString('vi-VN')}đ`;
      } else {
        const projected = wallet.feathers - sku.costFeathers;
        if (projected < config.overdraftFloor) {
          throw Object.assign(
            new Error(
              `Vượt ngưỡng Ứng Âm tối đa (${config.overdraftFloor} Lông). Hãy chọn "Mua Giá Niêm Yết" hoặc nhờ FM cấp Hoàn Lông Bảo Hiểm.`
            ),
            { statusCode: 400 }
          );
        }
        wallet.feathers = projected;
        payLabel = `Đổi ${sku.costFeathers} Lông`;
      }

      const displayCode =
        lookup?.numericSerial && lookup.numericSerial > 0
          ? `#${lookup.numericSerial}`
          : rawCode || `#WG${Math.floor(100000 + Math.random() * 899999)}`;
      const ownerName = sku.isSharedDefault
        ? `Đồ Chung Sảnh ${warehouseId === 41 ? 'Estella' : 'Đề Thám'}`
        : `${actorName} (${previewRole})`;

      const itemTimeline = [
        ...(lookup?.legacyTimeline || [
          {
            time: 'Hệ thống Wings',
            actor: 'Kho Shop',
            detail: `Đọc live tem ${displayCode} (${lookup?.itemName || sku.legacyName})`,
          },
        ]),
        {
          time: `Hôm nay · ${getTimeLabel()}`,
          actor: actorName,
          detail: `${payLabel} & Quét NEW → USING`,
        },
      ];

      island.items.unshift({
        uid: `wg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        scanCode: displayCode,
        legacyWarehouseItemId: lookup?.inventoryWarehouseItemId ?? null,
        legacyItemId: lookup?.inventoryItemId ?? sku.legacyItemIds[0] ?? null,
        skuId: sku.skuId,
        name: sku.name,
        category: sku.category,
        ownerStaffId: sku.isSharedDefault ? 0 : staffId,
        ownerName,
        warehouseId,
        state: 'USING',
        payMethod,
        payLabel,
        listedPriceVnd: effectivePrice,
        costFeathers: sku.costFeathers,
        cashbackFeathers: sku.cashbackFeathers,
        isShared: Boolean(sku.isSharedDefault),
        remainingPct: 100,
        openedAt: new Date().toISOString(),
        daysOffset: 0,
        freshLimitDays: sku.freshnessDays,
        timeline: itemTimeline,
      });

      const qrKey = normalizeUniqueQrKey(displayCode, lookup?.inventoryWarehouseItemId);
      const usingReward = applyUniqueQrStageReward({
        config,
        wallet,
        island,
        role: previewRole,
        qrKey,
        displayCode,
        stage: 'USING',
        actorName,
        todayDateKey,
      });
      const usingNote = usingReward.rewarded ? ` · +${usingReward.feathers} Lông Scan USING` : '';
      const overdraftNote = payMethod === 'FEATHER' && wallet.feathers < 0 ? ' (Ứng Lông an toàn)' : '';
      appendLedger(
        island,
        lookup?.found ? 'LEGACY_QR_SCAN' : 'MOS_QR_SCAN',
        `${actorName} quét ${displayCode} (${sku.name}) · ${payLabel} → USING${usingNote}${overdraftNote}`
      );
      message = `✨ Đã mở ${displayCode} (${sku.name}) vào Vườn (${payLabel})${usingNote}${overdraftNote}`;
      break;
    }

    case 'CONSUME_ITEM_STEP': {
      const idx = findMatchingActiveItem(island, '', req.itemUid);
      if (idx === -1) {
        throw Object.assign(new Error('Không tìm thấy vật tư đang dùng.'), { statusCode: 404 });
      }
      const item = island.items[idx];
      item.remainingPct = Math.max(0, item.remainingPct - 35);
      appendLedger(island, 'CONSUME', `Cập nhật ${item.scanCode} (${item.name}): còn ${item.remainingPct}%`);
      message =
        item.remainingPct === 0
          ? `✨ ${item.scanCode} đã chín vàng (0%)! Hãy quét vỏ USED để nhận +${item.cashbackFeathers} Lông Tái Sinh.`
          : `🪄 Đã cập nhật ${item.name} còn ${item.remainingPct}%.`;
      break;
    }

    case 'CRAFT_WING': {
      if (hasExpiredGlueInItems(island.items)) {
        throw Object.assign(
          new Error('Rào chắn Độ Tươi: Có lọ keo mở nắp >21 ngày. Hãy quét vỏ cũ sang USED trước khi Kết Cánh!'),
          { statusCode: 400 }
        );
      }
      const nextTier = config.wingTiers.find((w) => w.tier === wallet.wingTier + 1);
      if (!nextTier) {
        throw Object.assign(new Error('Bạn đã đạt đỉnh Cánh Hoàng Kim Nghệ Nhân!'), { statusCode: 400 });
      }
      if (wallet.feathers < nextTier.costFeathers) {
        throw Object.assign(new Error(`Cần đủ ${nextTier.costFeathers} Lông (hiện có ${wallet.feathers} Lông).`), {
          statusCode: 400,
        });
      }
      wallet.feathers -= nextTier.costFeathers;
      wallet.wingTier = nextTier.tier;
      wallet.chests[nextTier.bonusChest] = (wallet.chests[nextTier.bonusChest] || 0) + 1;
      island.lightHp = Math.min(100, island.lightHp + 6);
      const bonusChestName = config.chests[nextTier.bonusChest].name;
      appendLedger(
        island,
        'WING_CRAFT',
        `Kết thành công "${nextTier.name}" (-${nextTier.costFeathers} Lông) · Tặng 1 ${bonusChestName}`
      );
      message = `🪽 Kết thành công "${nextTier.name}" & nhận thưởng 1 ${bonusChestName}!`;
      break;
    }

    case 'BUY_CHEST': {
      const kind = (req.chestKind || 'bronze') as WingsGardenChestKind;
      const cfg = config.chests[kind];
      if ((kind === 'silver' || kind === 'gold') && hasExpiredGlueInItems(island.items)) {
        throw Object.assign(new Error('Rào chắn Độ Tươi: Thay keo mở nắp >21 ngày trước khi đổi Rương Bạc / Vàng!'), {
          statusCode: 400,
        });
      }
      if (wallet.feathers < cfg.buyCostFeathers) {
        throw Object.assign(new Error(`Cần đủ ${cfg.buyCostFeathers} Lông để đổi ${cfg.name}.`), { statusCode: 400 });
      }
      wallet.feathers -= cfg.buyCostFeathers;
      wallet.chests[kind] = (wallet.chests[kind] || 0) + 1;
      appendLedger(island, 'BUY_CHEST', `Đổi ${cfg.buyCostFeathers} Lông lấy 1 ${cfg.name}`);
      message = `🎁 Đã đổi thêm 1 ${cfg.name}!`;
      break;
    }

    case 'OPEN_CHEST': {
      const kind = (req.chestKind || 'bronze') as WingsGardenChestKind;
      const cfg = config.chests[kind];
      if ((wallet.chests[kind] || 0) <= 0) {
        throw Object.assign(new Error(`Không còn ${cfg.name} để mở.`), { statusCode: 400 });
      }
      if ((kind === 'silver' || kind === 'gold') && hasExpiredGlueInItems(island.items)) {
        throw Object.assign(new Error('Rào chắn Độ Tươi: Đổi keo tươi ≤21 ngày trước khi mở Rương Bạc / Vàng!'), {
          statusCode: 400,
        });
      }
      wallet.chests[kind] -= 1;
      wallet.chestOpenedCount[kind] = (wallet.chestOpenedCount[kind] || 0) + 1;
      const isFirst = wallet.chestOpenedCount[kind] === 1;
      const shouldDropPerk = isFirst || Math.random() < 0.6;

      if (shouldDropPerk) {
        const perkCard: WingsGardenPerkCard = {
          id: `perk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          chestKind: kind,
          perkKind: cfg.perkKind,
          title: cfg.perkTitle,
          rule: cfg.perkRule,
          validDays: cfg.perkValidDays,
          status: 'READY',
          createdAt: new Date().toISOString(),
        };
        wallet.perkCards.unshift(perkCard);
        chestOutcome = { chestKind: kind, rewardType: 'PERK', perkCard };
        appendLedger(island, 'OPEN_CHEST', `Mở ${cfg.name} → Trúng "${cfg.perkTitle}" (HSD ${cfg.perkValidDays} ngày)`);
        message = `🎉 Mở ${cfg.name} trúng ${cfg.perkTitle}!`;
      } else {
        const span = Math.max(1, cfg.featherMax - cfg.featherMin + 1);
        const feathersAwarded = cfg.featherMin + Math.floor(Math.random() * span);
        wallet.feathers += feathersAwarded;
        chestOutcome = { chestKind: kind, rewardType: 'FEATHERS', feathersAwarded };
        appendLedger(island, 'OPEN_CHEST', `Mở ${cfg.name} → Nhận +${feathersAwarded} Lông Vàng thưởng thêm`);
        message = `✨ Mở ${cfg.name} nhận +${feathersAwarded} Lông Vàng!`;
      }
      break;
    }

    case 'ACTIVATE_PERK': {
      const card = wallet.perkCards.find((c) => c.id === req.perkCardId && c.status === 'READY');
      if (!card) {
        throw Object.assign(new Error('Không tìm thấy Thẻ Đặc Quyền khả dụng.'), { statusCode: 404 });
      }
      if (card.perkKind === 'OFF_DAY' && island.emergencyOffCountToday >= 1) {
        throw Object.assign(
          new Error('Trần Shop: Mỗi chi nhánh chỉ kích hoạt tối đa 1 Thẻ Off Gấp trong cùng 1 ngày!'),
          { statusCode: 400 }
        );
      }
      if (card.perkKind === 'OFF_DAY') {
        island.emergencyOffCountToday += 1;
      }
      card.status = 'USED';
      card.activatedAt = new Date().toISOString();
      appendLedger(island, 'PERK_USED', `${actorName} kích hoạt "${card.title}" (0 khách book trùng · đã báo FM)`);
      message = `✅ Đã kích hoạt "${card.title}" & thông báo FM sắp lịch!`;
      break;
    }

    case 'DISPATCH_AIRSHIP': {
      const ordIdx = island.airshipOrders.findIndex((o) => o.id === req.airshipOrderId);
      if (ordIdx === -1) {
        throw Object.assign(new Error('Đơn Khinh Khí Cầu đã được giao trước đó.'), { statusCode: 404 });
      }
      const ord = island.airshipOrders[ordIdx];
      island.airshipOrders.splice(ordIdx, 1);
      island.comboCount += 1;
      island.lightHp = Math.min(100, island.lightHp + 3);
      appendLedger(
        island,
        'AIRSHIP',
        `${actorName} Quét Giao ⚡ "${ord.itemName}" cho ${ord.requesterName} (Combo x${island.comboCount})`
      );
      message = `🎈 Giao thần tốc Combo x${island.comboCount}! +3% Ánh Sáng Đảo.`;
      break;
    }

    case 'CREATE_AIRSHIP': {
      const sample = config.skus[Math.floor(Math.random() * Math.min(10, config.skus.length))];
      const now = Date.now();
      island.airshipOrders.unshift({
        id: `air-${now}`,
        requesterName: warehouseId === 3 ? 'Phương Nhi (CV)' : 'Minh Thư (CV)',
        skuId: sample.skuId,
        itemName: sample.name,
        warehouseId,
        createdAt: new Date(now).toISOString(),
        dueAt: new Date(now + 5 * 60000).toISOString(),
      });
      appendLedger(island, 'AIRSHIP_NEW', `Khinh Khí Cầu mới: ${sample.name}`);
      message = `🎈 Có đơn Khinh Khí Cầu mới: ${sample.name}!`;
      break;
    }

    case 'CREATE_CLOUD': {
      island.darkClouds.unshift({
        id: `cld-${Date.now()}`,
        warehouseId,
        text: 'Keo Đen (Wings SH) sắp chạm định mức tối thiểu tại kệ',
        kind: 'LOW_STOCK',
        createdAt: new Date().toISOString(),
      });
      island.lightHp = Math.max(40, island.lightHp - 7);
      appendLedger(island, 'CLOUD_ALERT', 'Xuất hiện Mây Đen cảnh báo tồn kho (-7% Ánh Sáng)');
      message = '🌩️ Mây Đen xuất hiện trên Đảo Kho Shop!';
      break;
    }

    case 'CLEAR_CLOUD': {
      const target = island.darkClouds.find((c) => c.id === req.cloudId);
      if (!target) {
        message = 'Mây Đen đã tan.';
        break;
      }
      if (target.kind === 'RIPE_SHELL' || target.kind === 'EXPIRED_GLUE') {
        throw Object.assign(new Error('Hãy quét vỏ rỗng sang USED trong Vườn để xua tan Mây Đen này!'), {
          statusCode: 400,
        });
      }
      island.darkClouds = island.darkClouds.filter((c) => c.id !== req.cloudId);
      island.lightHp = Math.min(100, island.lightHp + 6);
      appendLedger(island, 'CLOUD_CLEAR', 'FM/CVLL xác nhận bổ sung kệ → Xua tan Mây Đen (+6% Ánh Sáng)');
      message = '☀️ Đã xua tan Mây Đen (+6% Ánh Sáng)!';
      break;
    }

    case 'FM_INSURANCE_REFUND': {
      const amount = Math.max(5, Math.min(100, Number(req.amountFeathers || 28)));
      const reason = String(req.reason || 'Hỗ trợ keo lỗi NSX / vỡ ngoài ý muốn').trim();
      wallet.feathers += amount;
      appendLedger(island, 'FM_INSURANCE', `FM/Admin cấp Hoàn Lông Bảo Hiểm +${amount} Lông (${reason})`);
      message = `🛡️ Đã cấp +${amount} Lông Bảo Hiểm (${reason})!`;
      break;
    }

    case 'UPDATE_SKU_CONFIG': {
      const targetSku = config.skus.find((s) => s.skuId === req.skuId);
      if (!targetSku) {
        throw Object.assign(new Error('Không tìm thấy SKU để cập nhật.'), { statusCode: 404 });
      }
      if (typeof req.listedPriceVnd === 'number' && req.listedPriceVnd >= 1000) {
        targetSku.listedPriceVnd = Math.round(req.listedPriceVnd);
      }
      if (typeof req.costFeathers === 'number' && req.costFeathers >= 1) {
        targetSku.costFeathers = Math.round(req.costFeathers);
        targetSku.cashbackFeathers = Math.max(1, Math.round(targetSku.costFeathers * 0.15));
      }
      config.version += 1;
      config.updatedAt = new Date().toISOString();
      await store.set('WG_CFG', JSON.stringify(config));
      appendLedger(
        island,
        'CFG_UPDATE',
        `Admin cập nhật ${targetSku.name}: Niêm yết ${targetSku.listedPriceVnd.toLocaleString('vi-VN')}đ · ${targetSku.costFeathers} Lông`
      );
      message = `⚙️ Đã lưu cấu hình mới cho ${targetSku.name}!`;
      break;
    }

    case 'SCAN_IMPORT_QR': {
      const rawCode = String(req.scanCode || '').trim();
      if (!rawCode) {
        throw Object.assign(new Error('Vui lòng quét hoặc nhập mã QR để Scan Nhập kho.'), { statusCode: 400 });
      }
      const lookup = await legacy.lookupQr(rawCode, config);
      const displayCode = lookup.numericSerial && lookup.numericSerial > 0 ? `#${lookup.numericSerial}` : rawCode;
      const qrKey = normalizeUniqueQrKey(displayCode, lookup.inventoryWarehouseItemId);
      if (island.qrStageRewards?.[qrKey]?.importedAt) {
        throw Object.assign(
          new Error(`Tem ${displayCode} đã được quét Scan Nhập trước đó — mỗi Unique QR chỉ nhận thưởng Nhập 1 lần.`),
          { statusCode: 400 }
        );
      }
      const importReward = applyUniqueQrStageReward({
        config,
        wallet,
        island,
        role: previewRole,
        qrKey,
        displayCode,
        stage: 'IMPORT',
        actorName,
        todayDateKey,
      });
      const itemLabel = lookup.matchedSkuName || lookup.itemName || 'Sản phẩm kho Wings';
      const rewardNote = importReward.rewarded ? ` (+${importReward.feathers} Lông)` : '';
      appendLedger(island, 'SCAN_IMPORT', `${actorName} Scan Nhập ${displayCode} (${itemLabel}) vào kho${rewardNote}`);
      message = `📦 Đã Scan Nhập kho ${displayCode} (${itemLabel})${rewardNote}!`;
      break;
    }

    case 'TRIGGER_EARN_EVENT': {
      const trigger = req.earnTrigger || 'BOTTOM_LASH';
      const titleMap: Record<string, string> = {
        BOTTOM_LASH: 'Nối 1 Bộ Mi Dưới (Under)',
        SERUM_UPSELL: 'Bán 1 Cây Dưỡng Mi',
        CUSTOMER_COMBO_BUY: 'Khách Mới Nối Mi Mua Combo',
        CUSTOM: 'Hoàn thành nhiệm vụ tuỳ chỉnh',
      };
      const outcome = awardFeatherRuleEvent({
        config,
        wallet,
        role: previewRole,
        trigger,
        ruleId: req.ruleId,
        eventKey: `sim:${trigger}:${req.ruleId || 'sys'}:${Date.now()}:${Math.floor(Math.random() * 10000)}`,
        title: titleMap[trigger] || trigger,
        detail: `${actorName} (${previewRole})`,
        todayDateKey,
      });

      if (outcome.status === 'SKIPPED_RULE') {
        throw Object.assign(
          new Error(`Luật ${outcome.rule?.label || trigger} đang tắt hoặc không áp dụng cho vai trò ${previewRole}.`),
          { statusCode: 400 }
        );
      }

      if (wallet.dailyProgress) {
        if (trigger === 'BOTTOM_LASH') wallet.dailyProgress.bottomLashToday += 1;
        else if (trigger === 'SERUM_UPSELL') wallet.dailyProgress.serumSoldToday += 1;
        else if (trigger === 'CUSTOMER_COMBO_BUY') wallet.dailyProgress.comboConvertedToday += 1;
      }

      const labelText = outcome.rule?.label || titleMap[trigger] || trigger;
      if (outcome.status === 'PENDING_CLAIM') {
        appendLedger(
          island,
          'EARN_PENDING',
          `${actorName} mở khoá "${labelText}" → chờ bấm nhận +${outcome.feathers} Lông`
        );
        message = `🌟 Mở khoá "${labelText}"! Bấm nút "Nhận +${outcome.feathers} Lông ✨" để thu hoạch.`;
      } else {
        appendLedger(island, 'EARN_AUTO', `${actorName} hoàn tất "${labelText}" → +${outcome.feathers} Lông`);
        message = `✨ +${outcome.feathers} Lông Vàng từ "${labelText}"!`;
      }
      break;
    }

    case 'CLAIM_REWARD': {
      const pending = wallet.pendingClaims || [];
      const targets = req.claimAll
        ? pending.filter((c) => c.status === 'READY')
        : pending.filter((c) => c.status === 'READY' && c.id === req.claimId);

      if (targets.length === 0) {
        throw Object.assign(new Error('Không còn phần thưởng nào đang chờ nhận.'), { statusCode: 400 });
      }

      let totalGain = 0;
      let chestsGain = 0;
      const nowIso = new Date().toISOString();
      for (const cl of targets) {
        cl.status = 'CLAIMED';
        cl.claimedAt = nowIso;
        const f = Math.max(0, Number(cl.feathers || 0));
        wallet.feathers += f;
        totalGain += f;
        if (cl.bonusChest) {
          wallet.chests[cl.bonusChest] = (wallet.chests[cl.bonusChest] || 0) + 1;
          chestsGain += 1;
        }
      }

      const chestNote = chestsGain > 0 ? ` + ${chestsGain} Rương thưởng` : '';
      appendLedger(island, 'CLAIM_REWARD', `${actorName} bấm nhận +${totalGain} Lông${chestNote}`);
      message = `🎉 Đã thu hoạch +${totalGain} Lông Vàng${chestNote}!`;
      break;
    }

    case 'SYNC_LEGACY_TODAY': {
      const comboRule = config.featherRules.find((r) => r.trigger === 'CUSTOMER_COMBO_BUY');
      const comboWindowDays = comboRule?.comboAttributionWindowDays ?? 0;
      const syncRes = legacy.fetchStaffTodayEvents
        ? await legacy.fetchStaffTodayEvents(actor.legacyStaffId, todayDateKey, comboWindowDays)
        : { online: false, events: [] };

      let addedCount = 0;
      let creditedFeathers = 0;
      let pendingFeathers = 0;
      let hadLashSet = false;

      for (const ev of syncRes.events) {
        const res = awardFeatherRuleEvent({
          config,
          wallet,
          role: previewRole,
          trigger: ev.trigger,
          eventKey: ev.eventKey,
          title: ev.title,
          detail: ev.detail,
          todayDateKey,
        });
        if (res.status === 'CREDITED' || res.status === 'PENDING_CLAIM') {
          addedCount += 1;
          if (res.status === 'CREDITED') creditedFeathers += res.feathers;
          else pendingFeathers += res.feathers;

          if (wallet.dailyProgress) {
            if (ev.trigger === 'LASH_FULL_SET') {
              wallet.dailyProgress.fullSetsToday += 1;
              wallet.dailyProgress.lashSetsToday = Number((wallet.dailyProgress.lashSetsToday + 1).toFixed(2));
              hadLashSet = true;
            } else if (ev.trigger === 'LASH_REFILL') {
              wallet.dailyProgress.refillsToday += 1;
              const w = typeof res.rule?.refillSetWeight === 'number' ? res.rule.refillSetWeight : 0.5;
              wallet.dailyProgress.lashSetsToday = Number((wallet.dailyProgress.lashSetsToday + w).toFixed(2));
              hadLashSet = true;
            } else if (ev.trigger === 'BOTTOM_LASH') {
              wallet.dailyProgress.bottomLashToday += 1;
            } else if (ev.trigger === 'SERUM_UPSELL') {
              wallet.dailyProgress.serumSoldToday += 1;
            } else if (ev.trigger === 'CUSTOMER_COMBO_BUY') {
              wallet.dailyProgress.comboConvertedToday += 1;
            }
          }
        }
      }

      if (hadLashSet) {
        evaluateDailyLashMilestones({ config, wallet, role: previewRole, todayDateKey });
      }
      if (wallet.dailyProgress) {
        wallet.dailyProgress.lastLegacySyncAt = new Date().toISOString();
        wallet.dailyProgress.syncedLegacyEventsCount += addedCount;
      }

      if (!syncRes.online) {
        message = 'ℹ️ DB Legacy đang offline — dùng nút mô phỏng trong bảng Test để thử các luật.';
      } else if (addedCount === 0) {
        message = `🔄 Đã đồng bộ đơn thật hôm nay (không có sự kiện mới chưa cộng).`;
      } else {
        appendLedger(
          island,
          'LEGACY_SYNC',
          `Đồng bộ ${addedCount} sự kiện thật từ DB (${creditedFeathers} cộng thẳng, ${pendingFeathers} chờ bấm nhận)`
        );
        message = `🔄 Đồng bộ ${addedCount} sự kiện từ đơn thật: +${creditedFeathers} Lông thẳng, +${pendingFeathers} Lông chờ nhận!`;
      }
      break;
    }

    case 'SAVE_FEATHER_RULES': {
      const cleaned = sanitizeFeatherRules(req.featherRules || []);
      config.featherRules = cleaned;
      ensureConfigFeatherRules(config);
      config.version += 1;
      config.updatedAt = new Date().toISOString();
      await store.set('WG_CFG', JSON.stringify(config));
      appendLedger(island, 'CFG_RULES_UPDATE', `Admin lưu ${cleaned.length} luật lấy Lông (v${config.version})`);
      message = `⚙️ Đã lưu cấu hình ${cleaned.length} luật lấy Lông lên server (áp dụng ngay)!`;
      break;
    }

    default:
      throw Object.assign(new Error(`Action không hợp lệ: ${String(req.action)}`), { statusCode: 400 });
  }

  // Re-check expired glue alert sync
  if (hasExpiredGlueInItems(island.items) && !island.darkClouds.some((c) => c.kind === 'EXPIRED_GLUE')) {
    island.darkClouds.unshift({
      id: `cld-exp-${Date.now()}`,
      warehouseId,
      text: 'Phát hiện lọ Keo mở nắp quá 21 ngày — cần đổi keo tươi ngay!',
      kind: 'EXPIRED_GLUE',
      createdAt: new Date().toISOString(),
    });
  } else if (!hasExpiredGlueInItems(island.items)) {
    island.darkClouds = island.darkClouds.filter((c) => c.kind !== 'EXPIRED_GLUE');
  }

  wallet.updatedAt = new Date().toISOString();
  island.updatedAt = new Date().toISOString();

  await Promise.all([
    store.set(`WG_W:${staffId}`, JSON.stringify(wallet)),
    store.set(`WG_I:${warehouseId}`, JSON.stringify(island)),
  ]);

  const legacyCounts = await legacy.fetchSnapshot(warehouseId, config);
  const state = buildStateResponse({
    config,
    wallet,
    island,
    otherIsland,
    legacyCounts,
    previewRole,
    actor,
  });

  return {
    success: true,
    message,
    chestOutcome,
    state,
  };
}

export async function lookupWingsGardenQrWithOverlay(
  fastify: FastifyInstance,
  actor: IosAuthContext,
  rawCode: string,
  warehouseId: WingsGardenWarehouseId,
  deps?: { store?: WingsGardenStore; legacy?: WingsGardenLegacyAdapter }
): Promise<WingsGardenLegacyQrLookup> {
  const store = deps?.store || createPrismaWingsGardenStore(fastify);
  const legacy = deps?.legacy || createDefaultLegacyAdapter(fastify);
  const actorName = String(actor.displayName || 'Danny Do');

  const config = await loadOrInitConfig(store);
  const [lookup, island] = await Promise.all([
    legacy.lookupQr(rawCode, config),
    loadOrInitIsland(store, warehouseId, actorName),
  ]);

  const activeIdx = findMatchingActiveItem(island, rawCode);
  if (activeIdx !== -1) {
    const activeItem = island.items[activeIdx];
    return {
      ...lookup,
      found: true,
      matchedSkuId: activeItem.skuId,
      matchedSkuName: activeItem.name,
      overlayState: 'USING',
      overlayOwnerName: activeItem.ownerName,
      legacyTimeline: [...lookup.legacyTimeline, ...activeItem.timeline],
    };
  }

  const clean = rawCode.trim().replace(/^#/, '');
  const usedMatch = island.usedHistory.find((u) => u.scanCode.replace(/^#/, '') === clean);
  if (usedMatch) {
    return {
      ...lookup,
      found: true,
      matchedSkuId: usedMatch.skuId,
      matchedSkuName: usedMatch.name,
      overlayState: 'USED',
      overlayOwnerName: usedMatch.actorName,
    };
  }

  return lookup;
}

export { isWingsGardenGlueExpired };
