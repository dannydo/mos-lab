import {
  DEFAULT_WINGS_GARDEN_FEATHER_RULES,
  WingsGardenChestKind,
  WingsGardenConfig,
  WingsGardenDailyQuestProgress,
  WingsGardenFeatherRule,
  WingsGardenFeatherRuleTrigger,
  WingsGardenIslandState,
  WingsGardenMilestoneTier,
  WingsGardenPendingClaim,
  WingsGardenPreviewRole,
  WingsGardenWallet,
} from '@mos-lab/shared';

const VALID_TRIGGERS = new Set<WingsGardenFeatherRuleTrigger>([
  'LASH_FULL_SET',
  'LASH_REFILL',
  'DAILY_LASH_MILESTONE',
  'BOTTOM_LASH',
  'SERUM_UPSELL',
  'CUSTOMER_COMBO_BUY',
  'SCAN_IMPORT',
  'SCAN_USING',
  'SCAN_USED',
  'CUSTOM',
]);

const VALID_ROLES = new Set<WingsGardenPreviewRole>(['CV', 'CVL', 'CVLL', 'FM', 'ADMIN']);

export function createEmptyDailyProgress(dateKey: string): WingsGardenDailyQuestProgress {
  return {
    dateKey,
    lashSetsToday: 0,
    fullSetsToday: 0,
    refillsToday: 0,
    bottomLashToday: 0,
    serumSoldToday: 0,
    comboConvertedToday: 0,
    scanImportToday: 0,
    scanUsingToday: 0,
    scanUsedToday: 0,
    claimedMilestoneIds: [],
    lastLegacySyncAt: null,
    syncedLegacyEventsCount: 0,
  };
}

export function ensureConfigFeatherRules(config: WingsGardenConfig): WingsGardenConfig {
  if (!Array.isArray(config.featherRules) || config.featherRules.length === 0) {
    config.featherRules = JSON.parse(JSON.stringify(DEFAULT_WINGS_GARDEN_FEATHER_RULES)) as WingsGardenFeatherRule[];
  } else {
    const existingTriggers = new Set(config.featherRules.map((r) => r.trigger));
    for (const defRule of DEFAULT_WINGS_GARDEN_FEATHER_RULES) {
      if (!existingTriggers.has(defRule.trigger)) {
        config.featherRules.push(JSON.parse(JSON.stringify(defRule)) as WingsGardenFeatherRule);
      }
    }
  }

  const fullRule = config.featherRules.find((r) => r.trigger === 'LASH_FULL_SET');
  const refillRule = config.featherRules.find((r) => r.trigger === 'LASH_REFILL');
  if (fullRule) config.serviceEarn.fullSet = fullRule.feathers;
  if (refillRule) config.serviceEarn.refill = refillRule.feathers;
  return config;
}

export function ensureWalletQuestState(
  wallet: WingsGardenWallet,
  todayDateKey: string
): { changed: boolean; autoClaimedCount: number; autoClaimedFeathers: number } {
  let changed = false;
  let autoClaimedCount = 0;
  let autoClaimedFeathers = 0;

  if (!Array.isArray(wallet.processedEventKeys)) {
    wallet.processedEventKeys = [];
    changed = true;
  }
  if (!Array.isArray(wallet.pendingClaims)) {
    wallet.pendingClaims = [];
    changed = true;
  }

  const nowIso = new Date().toISOString();
  for (const claim of wallet.pendingClaims) {
    if (claim.status === 'READY' && claim.dateKey < todayDateKey) {
      claim.status = 'AUTO_CLAIMED';
      claim.claimedAt = nowIso;
      wallet.feathers += Math.max(0, Number(claim.feathers || 0));
      if (claim.bonusChest) {
        wallet.chests[claim.bonusChest] = (wallet.chests[claim.bonusChest] || 0) + 1;
      }
      autoClaimedCount += 1;
      autoClaimedFeathers += Math.max(0, Number(claim.feathers || 0));
      changed = true;
    }
  }

  if (wallet.pendingClaims.length > 50) {
    wallet.pendingClaims = wallet.pendingClaims.slice(0, 50);
    changed = true;
  }

  if (!wallet.dailyProgress || wallet.dailyProgress.dateKey !== todayDateKey) {
    wallet.dailyProgress = createEmptyDailyProgress(todayDateKey);
    changed = true;
  }

  return { changed, autoClaimedCount, autoClaimedFeathers };
}

export function normalizeUniqueQrKey(rawCode: string, legacyWarehouseItemId?: number | null): string {
  const numId = Number(legacyWarehouseItemId || 0);
  if (Number.isFinite(numId) && numId > 0) {
    return `leg:${Math.round(numId)}`;
  }
  const clean = String(rawCode || '')
    .trim()
    .replace(/^#/, '')
    .toUpperCase();
  return clean ? `qr:${clean}` : `qr:ANON-${Date.now()}`;
}

export function isRuleApplicable(rule: WingsGardenFeatherRule | undefined, role: WingsGardenPreviewRole): boolean {
  if (!rule || !rule.enabled) return false;
  if (role === 'ADMIN') return true;
  return Array.isArray(rule.roles) && rule.roles.includes(role);
}

export function recordProcessedEventKey(wallet: WingsGardenWallet, eventKey: string): boolean {
  if (!Array.isArray(wallet.processedEventKeys)) {
    wallet.processedEventKeys = [];
  }
  if (wallet.processedEventKeys.includes(eventKey)) {
    return false;
  }
  wallet.processedEventKeys.unshift(eventKey);
  if (wallet.processedEventKeys.length > 400) {
    wallet.processedEventKeys = wallet.processedEventKeys.slice(0, 400);
  }
  return true;
}

export function awardFeatherRuleEvent(params: {
  config: WingsGardenConfig;
  wallet: WingsGardenWallet;
  role: WingsGardenPreviewRole;
  trigger: WingsGardenFeatherRuleTrigger;
  ruleId?: string;
  eventKey: string;
  title: string;
  detail: string;
  todayDateKey: string;
  overrideFeathers?: number;
  bonusChest?: WingsGardenChestKind | null;
}): {
  status: 'CREDITED' | 'PENDING_CLAIM' | 'SKIPPED_DUPLICATE' | 'SKIPPED_RULE';
  feathers: number;
  rule: WingsGardenFeatherRule | null;
  claim?: WingsGardenPendingClaim;
} {
  const { config, wallet, role, trigger, ruleId, eventKey, title, detail, todayDateKey, overrideFeathers, bonusChest } =
    params;
  const rules = config.featherRules || DEFAULT_WINGS_GARDEN_FEATHER_RULES;
  const rule =
    (ruleId ? rules.find((r) => r.ruleId === ruleId) : undefined) || rules.find((r) => r.trigger === trigger) || null;

  if (!rule || !isRuleApplicable(rule, role)) {
    return { status: 'SKIPPED_RULE', feathers: 0, rule };
  }

  const gain = Math.max(0, Math.round(overrideFeathers ?? rule.feathers ?? 0));
  if (gain <= 0 && !bonusChest) {
    return { status: 'SKIPPED_RULE', feathers: 0, rule };
  }

  if (!recordProcessedEventKey(wallet, eventKey)) {
    return { status: 'SKIPPED_DUPLICATE', feathers: 0, rule };
  }

  if (rule.claimMode === 'CLAIM') {
    if (!Array.isArray(wallet.pendingClaims)) wallet.pendingClaims = [];
    const claim: WingsGardenPendingClaim = {
      id: `clm-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      eventKey,
      ruleId: rule.ruleId,
      trigger: rule.trigger,
      title,
      detail,
      feathers: gain,
      bonusChest: bonusChest ?? null,
      dateKey: todayDateKey,
      createdAt: new Date().toISOString(),
      status: 'READY',
    };
    wallet.pendingClaims.unshift(claim);
    return { status: 'PENDING_CLAIM', feathers: gain, rule, claim };
  }

  wallet.feathers += gain;
  if (bonusChest) {
    wallet.chests[bonusChest] = (wallet.chests[bonusChest] || 0) + 1;
  }
  return { status: 'CREDITED', feathers: gain, rule };
}

export function evaluateDailyLashMilestones(params: {
  config: WingsGardenConfig;
  wallet: WingsGardenWallet;
  role: WingsGardenPreviewRole;
  todayDateKey: string;
}): Array<{ tierId: string; thresholdSets: number; feathers: number; status: 'CREDITED' | 'PENDING_CLAIM' }> {
  const { config, wallet, role, todayDateKey } = params;
  const msRule = (config.featherRules || []).find((r) => r.trigger === 'DAILY_LASH_MILESTONE');
  if (!msRule || !isRuleApplicable(msRule, role)) return [];
  const progress = wallet.dailyProgress;
  if (!progress || !Array.isArray(msRule.milestoneTiers)) return [];

  const unlocked: Array<{
    tierId: string;
    thresholdSets: number;
    feathers: number;
    status: 'CREDITED' | 'PENDING_CLAIM';
  }> = [];

  const sortedTiers = [...msRule.milestoneTiers].sort((a, b) => a.thresholdSets - b.thresholdSets);
  for (const tier of sortedTiers) {
    if (progress.lashSetsToday + 1e-6 < tier.thresholdSets) continue;
    if (progress.claimedMilestoneIds.includes(tier.id)) continue;

    const chestLabel = tier.bonusChest ? ` + 1 Rương` : '';
    const outcome = awardFeatherRuleEvent({
      config,
      wallet,
      role,
      trigger: 'DAILY_LASH_MILESTONE',
      ruleId: msRule.ruleId,
      eventKey: `ms:${todayDateKey}:${tier.id}`,
      title: `Đạt mốc ${tier.thresholdSets} bộ mi hôm nay!`,
      detail: `Nhận +${tier.feathers} Lông${chestLabel} từ mốc ngày`,
      todayDateKey,
      overrideFeathers: tier.feathers,
      bonusChest: tier.bonusChest ?? null,
    });

    if (outcome.status === 'CREDITED' || outcome.status === 'PENDING_CLAIM') {
      progress.claimedMilestoneIds.push(tier.id);
      unlocked.push({
        tierId: tier.id,
        thresholdSets: tier.thresholdSets,
        feathers: outcome.feathers,
        status: outcome.status,
      });
    }
  }

  return unlocked;
}

export function applyUniqueQrStageReward(params: {
  config: WingsGardenConfig;
  wallet: WingsGardenWallet;
  island: WingsGardenIslandState;
  role: WingsGardenPreviewRole;
  qrKey: string;
  displayCode: string;
  stage: 'IMPORT' | 'USING' | 'USED';
  actorName: string;
  todayDateKey: string;
}): { rewarded: boolean; feathers: number; status: 'CREDITED' | 'PENDING_CLAIM' | 'NONE' } {
  const { config, wallet, island, role, qrKey, displayCode, stage, actorName, todayDateKey } = params;
  if (!island.qrStageRewards) {
    island.qrStageRewards = {};
  }
  const existing = island.qrStageRewards[qrKey] || {};

  if (stage === 'IMPORT' && existing.importedAt) {
    return { rewarded: false, feathers: 0, status: 'NONE' };
  }
  if (stage === 'USING' && existing.usingRewarded) {
    return { rewarded: false, feathers: 0, status: 'NONE' };
  }
  if (stage === 'USED' && existing.usedRewarded) {
    return { rewarded: false, feathers: 0, status: 'NONE' };
  }

  const trigger: WingsGardenFeatherRuleTrigger =
    stage === 'IMPORT' ? 'SCAN_IMPORT' : stage === 'USING' ? 'SCAN_USING' : 'SCAN_USED';
  const stageLabel = stage === 'IMPORT' ? 'Scan Nhập Kho' : stage === 'USING' ? 'Scan Bắt Đầu Dùng' : 'Scan Kết Thúc';

  const res = awardFeatherRuleEvent({
    config,
    wallet,
    role,
    trigger,
    eventKey: `qr:${stage}:${qrKey}`,
    title: `${stageLabel} · ${displayCode}`,
    detail: `Unique QR ${qrKey}`,
    todayDateKey,
  });

  if (stage === 'IMPORT') {
    existing.importedAt = new Date().toISOString();
    existing.importedBy = actorName;
    if (wallet.dailyProgress) wallet.dailyProgress.scanImportToday += 1;
  } else if (stage === 'USING') {
    existing.usingRewarded = true;
    if (wallet.dailyProgress) wallet.dailyProgress.scanUsingToday += 1;
  } else {
    existing.usedRewarded = true;
    if (wallet.dailyProgress) wallet.dailyProgress.scanUsedToday += 1;
  }

  island.qrStageRewards[qrKey] = existing;
  const keys = Object.keys(island.qrStageRewards);
  if (keys.length > 600) {
    const pruneCount = keys.length - 600;
    for (let i = 0; i < pruneCount; i += 1) {
      delete island.qrStageRewards[keys[i]];
    }
  }

  if (res.status === 'CREDITED' || res.status === 'PENDING_CLAIM') {
    return { rewarded: true, feathers: res.feathers, status: res.status };
  }
  return { rewarded: false, feathers: 0, status: 'NONE' };
}

function sanitizeMilestoneTiers(tiers: WingsGardenMilestoneTier[] | undefined): WingsGardenMilestoneTier[] {
  if (!Array.isArray(tiers) || tiers.length === 0) {
    return JSON.parse(
      JSON.stringify(
        DEFAULT_WINGS_GARDEN_FEATHER_RULES.find((r) => r.trigger === 'DAILY_LASH_MILESTONE')?.milestoneTiers || []
      )
    ) as WingsGardenMilestoneTier[];
  }
  const seenThresholds = new Set<number>();
  const cleaned: WingsGardenMilestoneTier[] = [];
  for (let i = 0; i < Math.min(10, tiers.length); i += 1) {
    const t = tiers[i];
    const thresholdSets = Math.max(1, Math.min(20, Math.round(Number(t.thresholdSets || 3))));
    if (seenThresholds.has(thresholdSets)) continue;
    seenThresholds.add(thresholdSets);
    const feathers = Math.max(0, Math.min(500, Math.round(Number(t.feathers || 0))));
    const chest: WingsGardenChestKind | null =
      t.bonusChest === 'bronze' || t.bonusChest === 'silver' || t.bonusChest === 'gold' ? t.bonusChest : null;
    cleaned.push({
      id: String(t.id || `m${thresholdSets}`).slice(0, 24),
      thresholdSets,
      feathers,
      bonusChest: chest,
    });
  }
  cleaned.sort((a, b) => a.thresholdSets - b.thresholdSets);
  return cleaned;
}

export function sanitizeFeatherRules(incoming: WingsGardenFeatherRule[]): WingsGardenFeatherRule[] {
  const byTrigger = new Map<string, WingsGardenFeatherRule>();
  const customRules: WingsGardenFeatherRule[] = [];

  for (const raw of incoming.slice(0, 30)) {
    if (!raw || typeof raw !== 'object') continue;
    const trigger: WingsGardenFeatherRuleTrigger = VALID_TRIGGERS.has(raw.trigger) ? raw.trigger : 'CUSTOM';
    const roles = Array.isArray(raw.roles)
      ? Array.from(new Set(raw.roles.filter((r): r is WingsGardenPreviewRole => VALID_ROLES.has(r))))
      : (['CV', 'CVL', 'CVLL', 'ADMIN'] as WingsGardenPreviewRole[]);
    const cleanRule: WingsGardenFeatherRule = {
      ruleId: String(raw.ruleId || `rule-${Date.now()}-${customRules.length}`).slice(0, 64),
      trigger,
      label:
        String(raw.label || 'Luật mới')
          .trim()
          .slice(0, 80) || 'Luật mới',
      description: String(raw.description || '')
        .trim()
        .slice(0, 180),
      enabled: Boolean(raw.enabled),
      feathers: Math.max(0, Math.min(500, Math.round(Number(raw.feathers || 0)))),
      claimMode: raw.claimMode === 'CLAIM' ? 'CLAIM' : 'AUTO',
      roles: roles.length > 0 ? roles : ['ADMIN'],
      isSystem: trigger !== 'CUSTOM',
    };

    if (trigger === 'LASH_REFILL') {
      const w = Number(raw.refillSetWeight);
      cleanRule.refillSetWeight = w === 0 || w === 1 ? w : 0.5;
    }
    if (trigger === 'DAILY_LASH_MILESTONE') {
      cleanRule.milestoneTiers = sanitizeMilestoneTiers(raw.milestoneTiers);
    }
    if (trigger === 'CUSTOMER_COMBO_BUY') {
      const win = Math.round(Number(raw.comboAttributionWindowDays ?? 0));
      cleanRule.comboAttributionWindowDays = Math.max(0, Math.min(30, win));
    }

    if (trigger === 'CUSTOM') {
      customRules.push(cleanRule);
    } else if (!byTrigger.has(trigger)) {
      byTrigger.set(trigger, cleanRule);
    }
  }

  const orderedSystem: WingsGardenFeatherRule[] = [];
  for (const defRule of DEFAULT_WINGS_GARDEN_FEATHER_RULES) {
    const edited = byTrigger.get(defRule.trigger);
    orderedSystem.push(edited || (JSON.parse(JSON.stringify(defRule)) as WingsGardenFeatherRule));
  }

  return [...orderedSystem, ...customRules];
}
