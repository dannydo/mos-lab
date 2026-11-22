import {
  hasExpiredGlueInItems,
  type WingsGardenActionRequest,
  type WingsGardenActionResponse,
  type WingsGardenChestKind,
  type WingsGardenConfig,
  type WingsGardenIslandState,
  type WingsGardenPerkCard,
  type WingsGardenWallet,
  type WingsGardenWarehouseId,
} from '@mos-lab/shared';
import { ensureConfigFeatherRules, sanitizeFeatherRules } from '../wings-garden-rules.service.js';
import { appendLedger, type WingsGardenStore } from './wings-garden-state.js';

export function handleWingsGardenCraftWing(
  config: WingsGardenConfig,
  wallet: WingsGardenWallet,
  island: WingsGardenIslandState
): string {
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
  return `🪽 Kết thành công "${nextTier.name}" & nhận thưởng 1 ${bonusChestName}!`;
}

export function handleWingsGardenBuyChest(
  req: WingsGardenActionRequest,
  config: WingsGardenConfig,
  wallet: WingsGardenWallet,
  island: WingsGardenIslandState
): string {
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
  return `🎁 Đã đổi thêm 1 ${cfg.name}!`;
}

export function handleWingsGardenOpenChest(
  req: WingsGardenActionRequest,
  config: WingsGardenConfig,
  wallet: WingsGardenWallet,
  island: WingsGardenIslandState
): { message: string; chestOutcome: WingsGardenActionResponse['chestOutcome'] } {
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
    appendLedger(island, 'OPEN_CHEST', `Mở ${cfg.name} → Trúng "${cfg.perkTitle}" (HSD ${cfg.perkValidDays} ngày)`);
    return {
      message: `🎉 Mở ${cfg.name} trúng ${cfg.perkTitle}!`,
      chestOutcome: { chestKind: kind, rewardType: 'PERK', perkCard },
    };
  }
  const span = Math.max(1, cfg.featherMax - cfg.featherMin + 1);
  const feathersAwarded = cfg.featherMin + Math.floor(Math.random() * span);
  wallet.feathers += feathersAwarded;
  appendLedger(island, 'OPEN_CHEST', `Mở ${cfg.name} → Nhận +${feathersAwarded} Lông Vàng thưởng thêm`);
  return {
    message: `✨ Mở ${cfg.name} nhận +${feathersAwarded} Lông Vàng!`,
    chestOutcome: { chestKind: kind, rewardType: 'FEATHERS', feathersAwarded },
  };
}

export function handleWingsGardenActivatePerk(
  req: WingsGardenActionRequest,
  wallet: WingsGardenWallet,
  island: WingsGardenIslandState,
  actorName: string
): string {
  const card = wallet.perkCards.find((c) => c.id === req.perkCardId && c.status === 'READY');
  if (!card) {
    throw Object.assign(new Error('Không tìm thấy Thẻ Đặc Quyền khả dụng.'), { statusCode: 404 });
  }
  if (card.perkKind === 'OFF_DAY' && island.emergencyOffCountToday >= 1) {
    throw Object.assign(new Error('Trần Shop: Mỗi chi nhánh chỉ kích hoạt tối đa 1 Thẻ Off Gấp trong cùng 1 ngày!'), {
      statusCode: 400,
    });
  }
  if (card.perkKind === 'OFF_DAY') {
    island.emergencyOffCountToday += 1;
  }
  card.status = 'USED';
  card.activatedAt = new Date().toISOString();
  appendLedger(island, 'PERK_USED', `${actorName} kích hoạt "${card.title}" (0 khách book trùng · đã báo FM)`);
  return `✅ Đã kích hoạt "${card.title}" & thông báo FM sắp lịch!`;
}

export function handleWingsGardenDispatchAirship(
  req: WingsGardenActionRequest,
  island: WingsGardenIslandState,
  actorName: string
): string {
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
  return `🎈 Giao thần tốc Combo x${island.comboCount}! +3% Ánh Sáng Đảo.`;
}

export function handleWingsGardenCreateAirship(
  config: WingsGardenConfig,
  island: WingsGardenIslandState,
  warehouseId: WingsGardenWarehouseId
): string {
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
  return `🎈 Có đơn Khinh Khí Cầu mới: ${sample.name}!`;
}

export function handleWingsGardenCreateCloud(
  island: WingsGardenIslandState,
  warehouseId: WingsGardenWarehouseId
): string {
  island.darkClouds.unshift({
    id: `cld-${Date.now()}`,
    warehouseId,
    text: 'Keo Đen (Wings SH) sắp chạm định mức tối thiểu tại kệ',
    kind: 'LOW_STOCK',
    createdAt: new Date().toISOString(),
  });
  island.lightHp = Math.max(40, island.lightHp - 7);
  appendLedger(island, 'CLOUD_ALERT', 'Xuất hiện Mây Đen cảnh báo tồn kho (-7% Ánh Sáng)');
  return '🌩️ Mây Đen xuất hiện trên Đảo Kho Shop!';
}

export function handleWingsGardenClearCloud(req: WingsGardenActionRequest, island: WingsGardenIslandState): string {
  const target = island.darkClouds.find((c) => c.id === req.cloudId);
  if (!target) {
    return 'Mây Đen đã tan.';
  }
  if (target.kind === 'RIPE_SHELL' || target.kind === 'EXPIRED_GLUE') {
    throw Object.assign(new Error('Hãy quét vỏ rỗng sang USED trong Vườn để xua tan Mây Đen này!'), {
      statusCode: 400,
    });
  }
  island.darkClouds = island.darkClouds.filter((c) => c.id !== req.cloudId);
  island.lightHp = Math.min(100, island.lightHp + 6);
  appendLedger(island, 'CLOUD_CLEAR', 'FM/CVLL xác nhận bổ sung kệ → Xua tan Mây Đen (+6% Ánh Sáng)');
  return '☀️ Đã xua tan Mây Đen (+6% Ánh Sáng)!';
}

export function handleWingsGardenInsuranceRefund(
  req: WingsGardenActionRequest,
  wallet: WingsGardenWallet,
  island: WingsGardenIslandState
): string {
  const amount = Math.max(5, Math.min(100, Number(req.amountFeathers || 28)));
  const reason = String(req.reason || 'Hỗ trợ keo lỗi NSX / vỡ ngoài ý muốn').trim();
  wallet.feathers += amount;
  appendLedger(island, 'FM_INSURANCE', `FM/Admin cấp Hoàn Lông Bảo Hiểm +${amount} Lông (${reason})`);
  return `🛡️ Đã cấp +${amount} Lông Bảo Hiểm (${reason})!`;
}

export async function handleWingsGardenUpdateSkuConfig(
  req: WingsGardenActionRequest,
  config: WingsGardenConfig,
  island: WingsGardenIslandState,
  store: WingsGardenStore
): Promise<string> {
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
  return `⚙️ Đã lưu cấu hình mới cho ${targetSku.name}!`;
}

export async function handleWingsGardenSaveFeatherRules(
  req: WingsGardenActionRequest,
  config: WingsGardenConfig,
  island: WingsGardenIslandState,
  store: WingsGardenStore
): Promise<string> {
  const cleaned = sanitizeFeatherRules(req.featherRules || []);
  config.featherRules = cleaned;
  ensureConfigFeatherRules(config);
  config.version += 1;
  config.updatedAt = new Date().toISOString();
  await store.set('WG_CFG', JSON.stringify(config));
  appendLedger(island, 'CFG_RULES_UPDATE', `Admin lưu ${cleaned.length} luật lấy Lông (v${config.version})`);
  return `⚙️ Đã lưu cấu hình ${cleaned.length} luật lấy Lông lên server (áp dụng ngay)!`;
}
