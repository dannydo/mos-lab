import type { FastifyInstance } from 'fastify';
import {
  hasExpiredGlueInItems,
  isWingsGardenGlueExpired,
  type WingsGardenActionRequest,
  type WingsGardenActionResponse,
  type WingsGardenLegacyQrLookup,
  type WingsGardenStateResponse,
  type WingsGardenWarehouseId,
} from '@mos-lab/shared';
import type { IosAuthContext } from '../ios/services/ios-auth.service.js';
import { createDefaultIslandState, createDefaultWallet, getTodayDateString } from './service/wings-garden-seeds.js';
import {
  buildStateResponse,
  createDefaultLegacyAdapter,
  createPrismaWingsGardenStore,
  findMatchingActiveItem,
  loadOrInitConfig,
  loadOrInitIsland,
  loadOrInitWallet,
  normalizePreviewRole,
  normalizeWarehouseId,
  type WingsGardenLegacyAdapter,
  type WingsGardenStore,
} from './service/wings-garden-state.js';
import {
  handleWingsGardenConsumeItemStep,
  handleWingsGardenScanImportQr,
  handleWingsGardenScanQr,
} from './service/wings-garden-scan-actions.js';
import {
  handleWingsGardenActivatePerk,
  handleWingsGardenBuyChest,
  handleWingsGardenClearCloud,
  handleWingsGardenCraftWing,
  handleWingsGardenCreateAirship,
  handleWingsGardenCreateCloud,
  handleWingsGardenDispatchAirship,
  handleWingsGardenInsuranceRefund,
  handleWingsGardenOpenChest,
  handleWingsGardenSaveFeatherRules,
  handleWingsGardenUpdateSkuConfig,
} from './service/wings-garden-progression-actions.js';
import {
  handleWingsGardenBonusFeathers,
  handleWingsGardenClaimReward,
  handleWingsGardenFastForwardDays,
  handleWingsGardenSimulateService,
  handleWingsGardenSyncLegacyToday,
  handleWingsGardenTriggerEarnEvent,
} from './service/wings-garden-earn-actions.js';

export {
  type WingsGardenLegacyAdapter,
  type WingsGardenStore,
  createDefaultLegacyAdapter,
  createPrismaWingsGardenStore,
  loadOrInitConfig,
  loadOrInitIsland,
  loadOrInitWallet,
} from './service/wings-garden-state.js';
export { createDefaultIslandState, createDefaultWallet } from './service/wings-garden-seeds.js';
export { isWingsGardenGlueExpired };

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
    case 'SIMULATE_SERVICE':
      message = handleWingsGardenSimulateService({
        req,
        config,
        wallet,
        island,
        actorName,
        previewRole,
        todayDateKey,
      });
      break;

    case 'BONUS_FEATHERS':
      message = handleWingsGardenBonusFeathers(req, wallet, island);
      break;

    case 'FAST_FORWARD_DAYS':
      message = handleWingsGardenFastForwardDays(req, island, warehouseId);
      break;

    case 'SCAN_QR':
      message = await handleWingsGardenScanQr({
        req,
        config,
        wallet,
        island,
        legacy,
        warehouseId,
        staffId,
        actorName,
        previewRole,
        todayDateKey,
      });
      break;

    case 'CONSUME_ITEM_STEP':
      message = handleWingsGardenConsumeItemStep(req, island);
      break;

    case 'CRAFT_WING':
      message = handleWingsGardenCraftWing(config, wallet, island);
      break;

    case 'BUY_CHEST':
      message = handleWingsGardenBuyChest(req, config, wallet, island);
      break;

    case 'OPEN_CHEST': {
      const outcome = handleWingsGardenOpenChest(req, config, wallet, island);
      message = outcome.message;
      chestOutcome = outcome.chestOutcome;
      break;
    }

    case 'ACTIVATE_PERK':
      message = handleWingsGardenActivatePerk(req, wallet, island, actorName);
      break;

    case 'DISPATCH_AIRSHIP':
      message = handleWingsGardenDispatchAirship(req, island, actorName);
      break;

    case 'CREATE_AIRSHIP':
      message = handleWingsGardenCreateAirship(config, island, warehouseId);
      break;

    case 'CREATE_CLOUD':
      message = handleWingsGardenCreateCloud(island, warehouseId);
      break;

    case 'CLEAR_CLOUD':
      message = handleWingsGardenClearCloud(req, island);
      break;

    case 'FM_INSURANCE_REFUND':
      message = handleWingsGardenInsuranceRefund(req, wallet, island);
      break;

    case 'UPDATE_SKU_CONFIG':
      message = await handleWingsGardenUpdateSkuConfig(req, config, island, store);
      break;

    case 'SCAN_IMPORT_QR':
      message = await handleWingsGardenScanImportQr({
        req,
        config,
        wallet,
        island,
        legacy,
        actorName,
        previewRole,
        todayDateKey,
      });
      break;

    case 'TRIGGER_EARN_EVENT':
      message = handleWingsGardenTriggerEarnEvent({
        req,
        config,
        wallet,
        island,
        actorName,
        previewRole,
        todayDateKey,
      });
      break;

    case 'CLAIM_REWARD':
      message = handleWingsGardenClaimReward(req, wallet, island, actorName);
      break;

    case 'SYNC_LEGACY_TODAY':
      message = await handleWingsGardenSyncLegacyToday({
        actor,
        config,
        wallet,
        island,
        legacy,
        previewRole,
        todayDateKey,
      });
      break;

    case 'SAVE_FEATHER_RULES':
      message = await handleWingsGardenSaveFeatherRules(req, config, island, store);
      break;

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
