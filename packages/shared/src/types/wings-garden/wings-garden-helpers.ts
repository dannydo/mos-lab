import {
  WINGS_GARDEN_GLUE_FRESHNESS_DAYS,
  type WingsGardenConfig,
  type WingsGardenEconomyPreview,
  type WingsGardenFeatherRule,
  type WingsGardenMandatoryCoverage,
  type WingsGardenMandatorySkuStatus,
  type WingsGardenOverlayItem,
  type WingsGardenSkuConfig,
} from './wings-garden.types.js';
import { DEFAULT_WINGS_GARDEN_CONFIG, DEFAULT_WINGS_GARDEN_FEATHER_RULES } from './wings-garden-defaults.js';

export function normalizeWingsGardenScanCode(raw: string): {
  cleaned: string;
  numericSerial: number | null;
} {
  const cleaned = String(raw || '').trim();
  if (!cleaned) return { cleaned: '', numericSerial: null };
  const stripped = cleaned.replace(/^#/, '').trim();
  const numericSerial = /^\d{4,12}$/.test(stripped) ? Number(stripped) : null;
  return { cleaned, numericSerial };
}

export function matchWingsGardenSku(
  legacyItemId: number | null | undefined,
  legacyItemName: string | null | undefined,
  config: WingsGardenConfig = DEFAULT_WINGS_GARDEN_CONFIG
): WingsGardenSkuConfig | null {
  const numId = Number(legacyItemId || 0);
  if (numId > 0) {
    const byId = config.skus.find((sku) => sku.legacyItemIds.includes(numId));
    if (byId) return byId;
  }
  const haystack = String(legacyItemName || '').toLowerCase();
  if (!haystack) return null;
  return config.skus.find((sku) => sku.keywords.some((kw) => haystack.includes(kw.toLowerCase()))) || null;
}

export function computeItemDaysOpened(item: WingsGardenOverlayItem, nowMs: number = Date.now()): number {
  const openedMs = Date.parse(item.openedAt);
  const baseDays = Number.isFinite(openedMs) ? Math.max(0, Math.floor((nowMs - openedMs) / 86400000)) : 0;
  return baseDays + Math.max(0, Number(item.daysOffset || 0));
}

export function isWingsGardenGlueExpired(item: WingsGardenOverlayItem, nowMs: number = Date.now()): boolean {
  if (item.state !== 'USING') return false;
  if (item.category !== 'GLUE') return false;
  const limit = item.freshLimitDays ?? WINGS_GARDEN_GLUE_FRESHNESS_DAYS;
  return computeItemDaysOpened(item, nowMs) > limit;
}

export function hasExpiredGlueInItems(items: WingsGardenOverlayItem[], nowMs: number = Date.now()): boolean {
  return items.some((item) => isWingsGardenGlueExpired(item, nowMs));
}

export function computeMandatoryKitCoverage(
  items: WingsGardenOverlayItem[],
  config: WingsGardenConfig = DEFAULT_WINGS_GARDEN_CONFIG,
  nowMs: number = Date.now()
): WingsGardenMandatoryCoverage {
  const mandatorySkus = config.skus.filter((s) => s.isMandatoryCvKit);
  let coveredCount = 0;
  let ripeCount = 0;
  let expiredCount = 0;

  const statuses: WingsGardenMandatorySkuStatus[] = mandatorySkus.map((sku) => {
    const active = items.filter((it) => it.state === 'USING' && it.skuId === sku.skuId);
    if (active.length === 0) {
      return { skuId: sku.skuId, name: sku.name, category: sku.category, status: 'MISSING', activeCount: 0 };
    }
    coveredCount += 1;
    const anyExpired = active.some((it) => isWingsGardenGlueExpired(it, nowMs));
    if (anyExpired) {
      expiredCount += 1;
      return {
        skuId: sku.skuId,
        name: sku.name,
        category: sku.category,
        status: 'EXPIRED',
        activeCount: active.length,
      };
    }
    const anyRipe = active.some((it) => it.remainingPct <= 0);
    if (anyRipe) {
      ripeCount += 1;
      return { skuId: sku.skuId, name: sku.name, category: sku.category, status: 'RIPE', activeCount: active.length };
    }
    return { skuId: sku.skuId, name: sku.name, category: sku.category, status: 'OK', activeCount: active.length };
  });

  return {
    totalRequired: mandatorySkus.length,
    coveredCount,
    ripeCount,
    expiredCount,
    items: statuses,
  };
}

export function computeWingsGardenEconomyPreview(config: WingsGardenConfig): WingsGardenEconomyPreview {
  const rules = Array.isArray(config.featherRules) ? config.featherRules : DEFAULT_WINGS_GARDEN_FEATHER_RULES;
  const findRule = (trigger: WingsGardenFeatherRule['trigger']) => rules.find((r) => r.trigger === trigger);

  const fullRule = findRule('LASH_FULL_SET');
  const refillRule = findRule('LASH_REFILL');
  const msRule = findRule('DAILY_LASH_MILESTONE');
  const bottomRule = findRule('BOTTOM_LASH');
  const serumRule = findRule('SERUM_UPSELL');
  const usingRule = findRule('SCAN_USING');
  const usedRule = findRule('SCAN_USED');

  const fullGain = fullRule?.enabled ? fullRule.feathers : 0;
  const refillGain = refillRule?.enabled ? refillRule.feathers : 0;
  const refillWeight = typeof refillRule?.refillSetWeight === 'number' ? refillRule.refillSetWeight : 0.5;
  const standardSets = 3 + refillWeight;

  const milestoneGain =
    msRule?.enabled && Array.isArray(msRule.milestoneTiers)
      ? msRule.milestoneTiers
          .filter((tier) => standardSets >= tier.thresholdSets)
          .reduce((sum, tier) => sum + tier.feathers, 0)
      : 0;

  const bottomGain = bottomRule?.enabled ? bottomRule.feathers : 0;
  const serumGain = serumRule?.enabled ? serumRule.feathers : 0;
  const scanGain = (usingRule?.enabled ? usingRule.feathers : 0) * 2 + (usedRule?.enabled ? usedRule.feathers : 0) * 2;

  const total = 3 * fullGain + refillGain + milestoneGain + bottomGain + serumGain + scanGain;
  const glueSku = config.skus.find((s) => s.skuId === 'keo-den') || config.skus[0];
  const glueCost = Math.max(1, glueSku?.costFeathers || 28);
  const glueBottleEquivalent = Number((total / glueCost).toFixed(1));
  const wing2Cost = config.wingTiers.find((w) => w.tier === 2)?.costFeathers || 120;
  const wing2Pct = Math.min(999, Math.round((total / Math.max(1, wing2Cost)) * 100));

  return {
    standardDayFeathers: total,
    glueBottleEquivalent,
    wing2Pct,
    breakdown: `3 nối mới + 1 dặm + mốc ${standardSets} bộ + 1 mi dưới + 1 dưỡng mi + quét 2 tem`,
  };
}
