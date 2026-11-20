import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import {
  DEFAULT_WINGS_GARDEN_CONFIG,
  resolveMenuKeysForApiPath,
  WingsGardenConfig,
  WingsGardenLegacyQrLookup,
  WingsGardenWarehouseId,
} from '@mos-lab/shared';
import type { IosAuthContext } from '../ios/services/ios-auth.service.js';
import {
  executeWingsGardenAction,
  getWingsGardenState,
  WingsGardenLegacyAdapter,
  WingsGardenStore,
} from './wings-garden.service.js';

function createMemoryStore(): WingsGardenStore {
  const map = new Map<string, string>();
  return {
    async get(key: string) {
      return map.get(key) ?? null;
    },
    async set(key: string, value: string) {
      map.set(key, value);
    },
  };
}

function createFakeLegacyAdapter(): WingsGardenLegacyAdapter {
  return {
    async lookupQr(rawCode: string, config: WingsGardenConfig): Promise<WingsGardenLegacyQrLookup> {
      const cleaned = rawCode.trim();
      const matchCode = cleaned === 'YZMv4r6iruIAv5xM' || cleaned === '#4509466';
      const sku = config.skus[0];
      return {
        found: matchCode,
        legacyOnline: true,
        rawCode,
        cleanedCode: cleaned,
        numericSerial: matchCode ? 4509466 : null,
        inventoryWarehouseItemId: matchCode ? 90999 : null,
        inventoryWarehouseId: 3,
        warehouseName: 'De Tham',
        inventoryItemId: matchCode ? 714 : null,
        itemCode: matchCode ? 'G-WS' : null,
        itemName: matchCode ? 'Glue - Wings SH' : null,
        itemUnit: 'Box',
        legacyState: matchCode ? 'New' : null,
        retailPriceVnd: matchCode ? 95000 : null,
        matchedSkuId: matchCode ? sku.skuId : null,
        matchedSkuName: matchCode ? sku.name : null,
        overlayState: null,
        overlayOwnerName: null,
        legacyTimeline: [{ time: '19/11/2026', actor: 'Wings-HQ', detail: 'Chuyển kho Đề Thám (New)' }],
      };
    },
    async fetchSnapshot(warehouseId: WingsGardenWarehouseId, config: WingsGardenConfig) {
      const bySkuNew: Record<string, number> = {};
      for (const s of config.skus) bySkuNew[s.skuId] = 15;
      return {
        warehouseId,
        legacyOnline: true,
        totalNew: 1402,
        totalUsing: 208,
        totalUsed: 26328,
        totalLost: 1106,
        bySkuNew,
        sampleNewStickers: [
          {
            scanCode: 'YZMv4r6iruIAv5xM',
            serialNumber: 4509466,
            legacyWarehouseItemId: 90999,
            legacyItemId: 714,
            legacyItemName: 'Glue - Wings SH',
            skuId: 'keo-den',
            skuName: 'Keo Đen (Wings SH)',
            retailPriceVnd: 95000,
            warehouseId,
            isLiveFromDb: true,
          },
        ],
      };
    },
  };
}

const adminActor: IosAuthContext = {
  id: 1,
  displayName: 'Danny Do',
  role: 'super_admin',
  careerTier: 'ADMIN',
};

test('UI-010: /api/wings-garden/* routes default to __ADMIN_ONLY_DEFAULT__', () => {
  assert.deepEqual(resolveMenuKeysForApiPath('/api/wings-garden/state'), ['__ADMIN_ONLY_DEFAULT__']);
  assert.deepEqual(resolveMenuKeysForApiPath('/api/wings-garden/actions'), ['__ADMIN_ONLY_DEFAULT__']);
  assert.equal(DEFAULT_WINGS_GARDEN_CONFIG.skus.filter((s) => s.isMandatoryCvKit).length, 24);
});

test('Mandatory 24-item CV/CVL coverage, Dual Payment & Harvest Cashback work cleanly', async () => {
  const app = Fastify();
  const store = createMemoryStore();
  const legacy = createFakeLegacyAdapter();
  const deps = { store, legacy };

  const initial = await getWingsGardenState(app, adminActor, 3, 'CVL', deps);
  assert.equal(initial.mandatoryCoverage.totalRequired, 24);
  assert.equal(initial.mandatoryCoverage.coveredCount, 3);
  assert.equal(initial.wallet.feathers, 34);
  assert.equal(initial.wallet.cashSpentVnd, 0);

  // Cash purchase keeps Lông untouched by price while granting +2 Lông from SCAN_USING rule
  const cashRes = await executeWingsGardenAction(
    app,
    adminActor,
    {
      action: 'SCAN_QR',
      warehouseId: 3,
      scanCode: 'YZMv4r6iruIAv5xM',
      payMethod: 'CASH',
    },
    deps
  );
  assert.equal(cashRes.state.wallet.feathers, 36);
  assert.equal(cashRes.state.wallet.cashSpentVnd, 95000);
  assert.equal(cashRes.state.wallet.cashOrdersCount, 1);
  const newItem = cashRes.state.island.items.find((i) => i.scanCode === '#4509466');
  assert.ok(newItem);

  // Harvest scanned item -> transitions USING -> USED and grants +4 Lông Tái Sinh +3 Lông SCAN_USED = 43
  const harvestRes = await executeWingsGardenAction(
    app,
    adminActor,
    {
      action: 'SCAN_QR',
      warehouseId: 3,
      scanCode: '#4509466',
    },
    deps
  );
  assert.equal(harvestRes.state.wallet.feathers, 43);
  assert.equal(harvestRes.state.wallet.streakDays, 8);
  assert.equal(
    harvestRes.state.island.items.some((i) => i.scanCode === '#4509466'),
    false
  );
  assert.equal(harvestRes.state.island.usedHistory[0]?.scanCode, '#4509466');

  // Feather overdraft guard down to -50 Lông
  await executeWingsGardenAction(
    app,
    adminActor,
    { action: 'SCAN_QR', warehouseId: 3, skuId: 'primer', payMethod: 'FEATHER', scanCode: '#TEST_PRIMER_1' },
    deps
  ); // 43 - 32 + 2 = 13
  await executeWingsGardenAction(
    app,
    adminActor,
    { action: 'SCAN_QR', warehouseId: 3, skuId: 'bang-keo-nhat', payMethod: 'FEATHER', scanCode: '#TEST_TAPE_1' },
    deps
  ); // 13 - 35 + 2 = -20 (within -50)
  await assert.rejects(
    executeWingsGardenAction(
      app,
      adminActor,
      { action: 'SCAN_QR', warehouseId: 3, skuId: 'bang-keo-nhat', payMethod: 'FEATHER', scanCode: '#TEST_TAPE_2' },
      deps
    ),
    /Vượt ngưỡng Ứng Âm/
  );
});

test('Expired glue (>21 days) blocks Wing Crafting & Silver/Gold Chests; Emergency Off caps at 1/day/shop', async () => {
  const app = Fastify();
  const store = createMemoryStore();
  const legacy = createFakeLegacyAdapter();
  const deps = { store, legacy };

  await executeWingsGardenAction(
    app,
    adminActor,
    { action: 'BONUS_FEATHERS', warehouseId: 3, amountFeathers: 300 },
    deps
  );
  await executeWingsGardenAction(
    app,
    adminActor,
    { action: 'FAST_FORWARD_DAYS', warehouseId: 3, amountFeathers: 7 },
    deps
  );

  // Glue is now 16 + 7 = 23 days (>21) -> blocks CRAFT_WING and silver/gold chests
  await assert.rejects(
    executeWingsGardenAction(app, adminActor, { action: 'CRAFT_WING', warehouseId: 3 }, deps),
    /Rào chắn Độ Tươi/
  );
  await assert.rejects(
    executeWingsGardenAction(app, adminActor, { action: 'OPEN_CHEST', warehouseId: 3, chestKind: 'gold' }, deps),
    /Rào chắn Độ Tươi/
  );

  // Bronze chest still opens -> drops Thẻ Đi Trễ <=30p
  const bronzeRes = await executeWingsGardenAction(
    app,
    adminActor,
    { action: 'OPEN_CHEST', warehouseId: 3, chestKind: 'bronze' },
    deps
  );
  assert.equal(bronzeRes.chestOutcome?.rewardType, 'PERK');
  assert.equal(bronzeRes.chestOutcome?.perkCard?.perkKind, 'LATE_30');

  // Harvest expired glue #4421750 -> unlocks CRAFT_WING & Gold Chest
  await executeWingsGardenAction(app, adminActor, { action: 'SCAN_QR', warehouseId: 3, scanCode: '#4421750' }, deps);
  const craftRes = await executeWingsGardenAction(app, adminActor, { action: 'CRAFT_WING', warehouseId: 3 }, deps);
  assert.equal(craftRes.state.wallet.wingTier, 2);

  // First gold chest guarantees OFF_DAY card; buying & opening a second one enforces 1/day/shop cap
  const gold1 = await executeWingsGardenAction(
    app,
    adminActor,
    { action: 'OPEN_CHEST', warehouseId: 3, chestKind: 'gold' },
    deps
  );
  const cardId1 = gold1.chestOutcome?.perkCard?.id;
  assert.ok(cardId1);
  const act1 = await executeWingsGardenAction(
    app,
    adminActor,
    { action: 'ACTIVATE_PERK', warehouseId: 3, perkCardId: cardId1 },
    deps
  );
  assert.equal(act1.state.island.emergencyOffCountToday, 1);

  // Manually inject a second OFF_DAY card by resetting chestOpenedCount or check 1/day cap cleanly via state mutation test
  const rawWallet = JSON.parse((await store.get('WG_W:1')) || '{}');
  rawWallet.perkCards.push({
    id: 'perk-second-off',
    chestKind: 'gold',
    perkKind: 'OFF_DAY',
    title: 'Thẻ Vàng Off Gấp 1 Ngày',
    rule: '1 ngày off gấp',
    validDays: 90,
    status: 'READY',
    createdAt: new Date().toISOString(),
  });
  await store.set('WG_W:1', JSON.stringify(rawWallet));
  await assert.rejects(
    executeWingsGardenAction(
      app,
      adminActor,
      { action: 'ACTIVATE_PERK', warehouseId: 3, perkCardId: 'perk-second-off' },
      deps
    ),
    /tối đa 1 Thẻ Off Gấp/
  );
});

test('Feather Rule Engine: 3/4/5 daily milestones, Claim & rollover, 3-stage Unique QR, Legacy Sync & Custom Config', async () => {
  const app = Fastify();
  const store = createMemoryStore();
  const baseLegacy = createFakeLegacyAdapter();
  const legacy: WingsGardenLegacyAdapter = {
    ...baseLegacy,
    async fetchStaffTodayEvents() {
      return {
        online: true,
        events: [
          {
            eventKey: 'leg:os:9001',
            trigger: 'LASH_FULL_SET',
            title: 'Nối Mi Mới · Đơn #9001',
            detail: 'Nối mi thiết kế',
          },
          {
            eventKey: 'leg:osc:77',
            trigger: 'CUSTOMER_COMBO_BUY',
            title: 'Khách Mua Combo · Đơn #9001',
            detail: 'Combo LashesTop',
          },
        ],
      };
    },
  };
  const deps = { store, legacy };

  // Backward-compatible migration: existing config without featherRules gets backfilled with 9 rules
  const legacyCfg = JSON.parse(JSON.stringify(DEFAULT_WINGS_GARDEN_CONFIG));
  delete legacyCfg.featherRules;
  await store.set('WG_CFG', JSON.stringify(legacyCfg));

  const init = await getWingsGardenState(app, adminActor, 3, 'CVL', deps);
  assert.equal(init.config.featherRules.length, 9);

  // Simulate 2 Full Sets + 2 Refills (= 2 + 1.0 = 3.0 sets) -> unlocks m3 (+15 CLAIM)
  await executeWingsGardenAction(
    app,
    adminActor,
    { action: 'SIMULATE_SERVICE', warehouseId: 3, serviceKind: 'FULL_SET' },
    deps
  );
  await executeWingsGardenAction(
    app,
    adminActor,
    { action: 'SIMULATE_SERVICE', warehouseId: 3, serviceKind: 'FULL_SET' },
    deps
  );
  await executeWingsGardenAction(
    app,
    adminActor,
    { action: 'SIMULATE_SERVICE', warehouseId: 3, serviceKind: 'REFILL' },
    deps
  );
  const at3 = await executeWingsGardenAction(
    app,
    adminActor,
    { action: 'SIMULATE_SERVICE', warehouseId: 3, serviceKind: 'REFILL' },
    deps
  );
  // 34 + 12 + 12 + 6 + 6 = 70 AUTO; m3 (+15) pending claim
  assert.equal(at3.state.wallet.feathers, 70);
  assert.equal(at3.state.wallet.dailyProgress?.lashSetsToday, 3);
  assert.equal(at3.state.wallet.pendingClaims?.filter((c) => c.status === 'READY').length, 1);

  // Reach 5 sets (2 more Full Sets) -> unlocks m4 (+20) and m5 (+30 + Bronze Chest)
  await executeWingsGardenAction(
    app,
    adminActor,
    { action: 'SIMULATE_SERVICE', warehouseId: 3, serviceKind: 'FULL_SET' },
    deps
  );
  const at5 = await executeWingsGardenAction(
    app,
    adminActor,
    { action: 'SIMULATE_SERVICE', warehouseId: 3, serviceKind: 'FULL_SET' },
    deps
  );
  assert.equal(at5.state.wallet.feathers, 94);
  const readyClaims = (at5.state.wallet.pendingClaims || []).filter((c) => c.status === 'READY');
  assert.equal(readyClaims.length, 3);

  // Bottom Lash (+8 CLAIM) & Serum (+15 CLAIM)
  await executeWingsGardenAction(
    app,
    adminActor,
    { action: 'TRIGGER_EARN_EVENT', warehouseId: 3, earnTrigger: 'BOTTOM_LASH' },
    deps
  );
  await executeWingsGardenAction(
    app,
    adminActor,
    { action: 'TRIGGER_EARN_EVENT', warehouseId: 3, earnTrigger: 'SERUM_UPSELL' },
    deps
  );

  // Claim all READY rewards (+15 + 20 + 30 + 8 + 15 = +88 feathers + 1 Bronze Chest)
  const claimed = await executeWingsGardenAction(
    app,
    adminActor,
    { action: 'CLAIM_REWARD', warehouseId: 3, claimAll: true },
    deps
  );
  assert.equal(claimed.state.wallet.feathers, 94 + 88);
  assert.equal(claimed.state.wallet.chests.bronze, 2);

  // 3-stage Unique QR idempotency: SCAN_IMPORT_QR (CVLL role eligible -> +1) works once and rejects duplicate
  const imp1 = await executeWingsGardenAction(
    app,
    adminActor,
    { action: 'SCAN_IMPORT_QR', warehouseId: 3, previewRole: 'CVLL', scanCode: 'YZMv4r6iruIAv5xM' },
    deps
  );
  assert.equal(imp1.state.wallet.feathers, 94 + 88 + 1);
  await assert.rejects(
    executeWingsGardenAction(
      app,
      adminActor,
      { action: 'SCAN_IMPORT_QR', warehouseId: 3, previewRole: 'CVLL', scanCode: '#4509466' },
      deps
    ),
    /chỉ nhận thưởng Nhập 1 lần/
  );

  // Sync legacy today idempotently: first sync adds 1 Full Set (+12) & 1 Combo (+25 CLAIM); second sync adds 0
  const sync1 = await executeWingsGardenAction(app, adminActor, { action: 'SYNC_LEGACY_TODAY', warehouseId: 3 }, deps);
  assert.equal(sync1.state.wallet.feathers, 94 + 88 + 1 + 12);
  assert.equal(sync1.state.wallet.pendingClaims?.filter((c) => c.status === 'READY').length, 1);
  const sync2 = await executeWingsGardenAction(app, adminActor, { action: 'SYNC_LEGACY_TODAY', warehouseId: 3 }, deps);
  assert.equal(sync2.state.wallet.feathers, 94 + 88 + 1 + 12);

  // Rollover auto-claim check: inject yesterday's READY claim and confirm loadOrInitWallet auto-credits it
  const storedWallet = JSON.parse((await store.get('WG_W:1')) || '{}');
  storedWallet.pendingClaims.push({
    id: 'clm-yesterday',
    eventKey: 'yesterday:combo',
    ruleId: 'rule-customer-combo',
    trigger: 'CUSTOMER_COMBO_BUY',
    title: 'Combo hôm qua',
    detail: 'Quên bấm',
    feathers: 25,
    bonusChest: null,
    dateKey: '2020-01-01',
    createdAt: '2020-01-01T10:00:00.000Z',
    status: 'READY',
  });
  await store.set('WG_W:1', JSON.stringify(storedWallet));
  const afterRollover = await getWingsGardenState(app, adminActor, 3, 'CVL', deps);
  assert.equal(afterRollover.wallet.feathers, 94 + 88 + 1 + 12 + 25);

  // Admin SAVE_FEATHER_RULES adds a CUSTOM rule and triggers it
  const updatedRules = [
    ...afterRollover.config.featherRules,
    {
      ruleId: 'custom-google-review',
      trigger: 'CUSTOM' as const,
      label: 'Review 5 sao Google',
      description: 'Khách chụp màn hình đánh giá 5 sao',
      enabled: true,
      feathers: 20,
      claimMode: 'AUTO' as const,
      roles: ['CV', 'CVL', 'CVLL', 'ADMIN'] as const,
    },
  ];
  const savedCfg = await executeWingsGardenAction(
    app,
    adminActor,
    { action: 'SAVE_FEATHER_RULES', warehouseId: 3, featherRules: JSON.parse(JSON.stringify(updatedRules)) },
    deps
  );
  assert.equal(
    savedCfg.state.config.featherRules.some((r) => r.ruleId === 'custom-google-review'),
    true
  );
  const customRes = await executeWingsGardenAction(
    app,
    adminActor,
    { action: 'TRIGGER_EARN_EVENT', warehouseId: 3, earnTrigger: 'CUSTOM', ruleId: 'custom-google-review' },
    deps
  );
  assert.equal(customRes.state.wallet.feathers, 94 + 88 + 1 + 12 + 25 + 20);
});
