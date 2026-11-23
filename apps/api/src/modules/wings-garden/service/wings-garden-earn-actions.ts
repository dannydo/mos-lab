import {
  hasExpiredGlueInItems,
  type WingsGardenActionRequest,
  type WingsGardenConfig,
  type WingsGardenIslandState,
  type WingsGardenPreviewRole,
  type WingsGardenWallet,
  type WingsGardenWarehouseId,
} from '@mos-lab/shared';
import type { IosAuthContext } from '../../ios/services/ios-auth.service.js';
import { awardFeatherRuleEvent, evaluateDailyLashMilestones } from '../wings-garden-rules.service.js';
import { appendLedger, type WingsGardenLegacyAdapter } from './wings-garden-state.js';

export function handleWingsGardenSimulateService(params: {
  req: WingsGardenActionRequest;
  config: WingsGardenConfig;
  wallet: WingsGardenWallet;
  island: WingsGardenIslandState;
  actorName: string;
  previewRole: WingsGardenPreviewRole;
  todayDateKey: string;
}): string {
  const { req, config, wallet, island, actorName, previewRole, todayDateKey } = params;
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
  return `✨ +${gain} Lông Vàng từ ca ${label}!${extraNote}`;
}

export function handleWingsGardenBonusFeathers(
  req: WingsGardenActionRequest,
  wallet: WingsGardenWallet,
  island: WingsGardenIslandState
): string {
  const bonus = Math.max(1, Math.min(500, Number(req.amountFeathers || 60)));
  wallet.feathers += bonus;
  appendLedger(island, 'BONUS_FEATHERS', `Cộng thử +${bonus} Lông Vàng để test Kết Cánh & Rương`);
  return `🎁 Đã cộng +${bonus} Lông Vàng vào ví!`;
}

export function handleWingsGardenFastForwardDays(
  req: WingsGardenActionRequest,
  island: WingsGardenIslandState,
  warehouseId: WingsGardenWarehouseId
): string {
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
  return `⏩ Đã tua +${days} ngày — kiểm tra vỏ chín vàng & hạn tươi keo!`;
}

export function handleWingsGardenTriggerEarnEvent(params: {
  req: WingsGardenActionRequest;
  config: WingsGardenConfig;
  wallet: WingsGardenWallet;
  island: WingsGardenIslandState;
  actorName: string;
  previewRole: WingsGardenPreviewRole;
  todayDateKey: string;
}): string {
  const { req, config, wallet, island, actorName, previewRole, todayDateKey } = params;
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
    return `🌟 Mở khoá "${labelText}"! Bấm nút "Nhận +${outcome.feathers} Lông ✨" để thu hoạch.`;
  }
  appendLedger(island, 'EARN_AUTO', `${actorName} hoàn tất "${labelText}" → +${outcome.feathers} Lông`);
  return `✨ +${outcome.feathers} Lông Vàng từ "${labelText}"!`;
}

export function handleWingsGardenClaimReward(
  req: WingsGardenActionRequest,
  wallet: WingsGardenWallet,
  island: WingsGardenIslandState,
  actorName: string
): string {
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
  return `🎉 Đã thu hoạch +${totalGain} Lông Vàng${chestNote}!`;
}

export async function handleWingsGardenSyncLegacyToday(params: {
  actor: IosAuthContext;
  config: WingsGardenConfig;
  wallet: WingsGardenWallet;
  island: WingsGardenIslandState;
  legacy: WingsGardenLegacyAdapter;
  previewRole: WingsGardenPreviewRole;
  todayDateKey: string;
}): Promise<string> {
  const { actor, config, wallet, island, legacy, previewRole, todayDateKey } = params;
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
    return 'ℹ️ DB Legacy đang offline — dùng nút mô phỏng trong bảng Test để thử các luật.';
  }
  if (addedCount === 0) {
    return `🔄 Đã đồng bộ đơn thật hôm nay (không có sự kiện mới chưa cộng).`;
  }
  appendLedger(
    island,
    'LEGACY_SYNC',
    `Đồng bộ ${addedCount} sự kiện thật từ DB (${creditedFeathers} cộng thẳng, ${pendingFeathers} chờ bấm nhận)`
  );
  return `🔄 Đồng bộ ${addedCount} sự kiện từ đơn thật: +${creditedFeathers} Lông thẳng, +${pendingFeathers} Lông chờ nhận!`;
}
