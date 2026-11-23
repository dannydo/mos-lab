import {
  hasExpiredGlueInItems,
  type WingsGardenActionRequest,
  type WingsGardenConfig,
  type WingsGardenIslandState,
  type WingsGardenPreviewRole,
  type WingsGardenSkuConfig,
  type WingsGardenWallet,
  type WingsGardenWarehouseId,
} from '@mos-lab/shared';
import { applyUniqueQrStageReward, normalizeUniqueQrKey } from '../wings-garden-rules.service.js';
import { getTimeLabel } from './wings-garden-seeds.js';
import { appendLedger, findMatchingActiveItem, type WingsGardenLegacyAdapter } from './wings-garden-state.js';

export function harvestOverlayItem(params: {
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

export async function handleWingsGardenScanQr(params: {
  req: WingsGardenActionRequest;
  config: WingsGardenConfig;
  wallet: WingsGardenWallet;
  island: WingsGardenIslandState;
  legacy: WingsGardenLegacyAdapter;
  warehouseId: WingsGardenWarehouseId;
  staffId: number;
  actorName: string;
  previewRole: WingsGardenPreviewRole;
  todayDateKey: string;
}): Promise<string> {
  const { req, config, wallet, island, legacy, warehouseId, staffId, actorName, previewRole, todayDateKey } = params;
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
    return res.message;
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
  return `✨ Đã mở ${displayCode} (${sku.name}) vào Vườn (${payLabel})${usingNote}${overdraftNote}`;
}

export function handleWingsGardenConsumeItemStep(
  req: WingsGardenActionRequest,
  island: WingsGardenIslandState
): string {
  const idx = findMatchingActiveItem(island, '', req.itemUid);
  if (idx === -1) {
    throw Object.assign(new Error('Không tìm thấy vật tư đang dùng.'), { statusCode: 404 });
  }
  const item = island.items[idx];
  item.remainingPct = Math.max(0, item.remainingPct - 35);
  appendLedger(island, 'CONSUME', `Cập nhật ${item.scanCode} (${item.name}): còn ${item.remainingPct}%`);
  return item.remainingPct === 0
    ? `✨ ${item.scanCode} đã chín vàng (0%)! Hãy quét vỏ USED để nhận +${item.cashbackFeathers} Lông Tái Sinh.`
    : `🪄 Đã cập nhật ${item.name} còn ${item.remainingPct}%.`;
}

export async function handleWingsGardenScanImportQr(params: {
  req: WingsGardenActionRequest;
  config: WingsGardenConfig;
  wallet: WingsGardenWallet;
  island: WingsGardenIslandState;
  legacy: WingsGardenLegacyAdapter;
  actorName: string;
  previewRole: WingsGardenPreviewRole;
  todayDateKey: string;
}): Promise<string> {
  const { req, config, wallet, island, legacy, actorName, previewRole, todayDateKey } = params;
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
  return `📦 Đã Scan Nhập kho ${displayCode} (${itemLabel})${rewardNote}!`;
}
