import { CC_GAMIFICATION_SYSTEM_CONFIG, ReportComparisonMode, SafeAny } from '@mos-lab/shared';

export interface CcKpiFilters {
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
  consultantId?: string | number;
  page?: number;
  limit?: number;
  /** Internal report options used by Daily Bonus to build an aligned comparison. */
  comparisonMode?: ReportComparisonMode;
  includeComparison?: boolean;
  endAt?: string;
}

export const FAL_RULE_VALUES = ['Fix', 'Adjust', 'Log', 'Replace'] as const;
export type FalRule = (typeof FAL_RULE_VALUES)[number];

export const FAL_RULE_VALUES_SQL = FAL_RULE_VALUES.map((rule) => `'${rule}'`).join(', ');
export const FAL_TRACKING_KEY_SQL_CASES = FAL_RULE_VALUES.map(
  (rule) => `WHEN sb.tracking_key LIKE '%"next_service_type":"${rule}"%' THEN '${rule}'`
).join('\n');

/**
 * Legacy iOS draws the green customer ring from the immutable booking
 * snapshot `order.combo_sale_required`. Do not infer this from `is_new` or
 * from the customer's current combo balance because both can change later.
 */
export function buildGreenVisitEligibilitySql(orderAlias = 'o'): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(orderAlias)) {
    throw new Error('Invalid SQL alias for green-visit eligibility.');
  }

  return `COALESCE(${orderAlias}.combo_sale_required, 0) <> 0`;
}

export function resolveFalRule(input: {
  nextFixOrderServiceId?: number | null;
  nextAdjustOrderServiceId?: number | null;
  serviceType?: string | null;
  ruleValue?: string | null;
  trackingKey?: string | null;
}): FalRule | '' {
  if (Number(input.nextFixOrderServiceId) > 0) return 'Fix';
  if (Number(input.nextAdjustOrderServiceId) > 0) return 'Adjust';

  const directValue = FAL_RULE_VALUES.find((rule) => rule === input.serviceType || rule === input.ruleValue);
  if (directValue) return directValue;

  if (input.trackingKey) {
    try {
      const parsed = JSON.parse(input.trackingKey) as { next_service_type?: string };
      const trackedValue = FAL_RULE_VALUES.find((rule) => rule === parsed.next_service_type);
      if (trackedValue) return trackedValue;
    } catch {
      const trackedValue = FAL_RULE_VALUES.find((rule) => input.trackingKey?.includes(`"next_service_type":"${rule}"`));
      if (trackedValue) return trackedValue;
    }
  }

  return '';
}

export function parseDateRange(dateFrom?: string, dateTo?: string, defaultDaysStart = 30) {
  const startStr =
    dateFrom || new Date(Date.now() - defaultDaysStart * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
  const endStr = dateTo || new Date().toLocaleDateString('en-CA');

  const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
  const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

  return {
    startStr: startPart,
    endStr: endPart,
    start: new Date(startPart + 'T00:00:00.000Z'),
    end: new Date(endPart + 'T23:59:59.999Z'),
  };
}

export function formatStoreCode(store?: string | null): string {
  if (!store) return 'PXL';
  const s = String(store).toUpperCase().trim();
  if (s.includes('ESTELLA') || s.includes('EP')) return 'EP';
  if (s.includes('THAM') || s.includes('DE') || s.includes('DT')) return 'DT';
  if (s.includes('PXL') || s.includes('PHAN')) return 'PXL';
  return s;
}

export function filterActiveCcTargets<T extends { staffId: number }>(targets: T[], activeCcIds: number[]): T[] {
  const activeIds = new Set(activeCcIds.map(Number));
  return targets.filter((target) => activeIds.has(Number(target.staffId)));
}

export function splitCcShares(
  ccInRaw: SafeAny,
  ccOutRaw: SafeAny,
  allowedStaffIds: number[]
): Array<{ staffId: number; share: number }> {
  const allowedIds = new Set(allowedStaffIds.map(Number));
  const ccIn = ccInRaw ? Number(ccInRaw) : null;
  const ccOut = ccOutRaw ? Number(ccOutRaw) : null;

  if (!ccIn && !ccOut) return [];

  if (!ccIn || !ccOut) {
    const onlyCc = (ccOut || ccIn)!;
    return allowedIds.has(onlyCc) ? [{ staffId: onlyCc, share: 1 }] : [];
  }

  if (ccIn === ccOut) {
    return allowedIds.has(ccIn) ? [{ staffId: ccIn, share: 1 }] : [];
  }

  const result: Array<{ staffId: number; share: number }> = [];
  if (allowedIds.has(ccIn)) result.push({ staffId: ccIn, share: 0.5 });
  if (allowedIds.has(ccOut)) result.push({ staffId: ccOut, share: 0.5 });
  return result;
}

export function resolveCcCashBonus(input: { dbCashBonus: number; cashBonusRows: number }): number {
  // Payroll/reporting must never infer a cash amount from points or level.
  // A missing Cash ledger row is a data-quality exception, not earned money.
  if (input.cashBonusRows <= 0) return 0;
  return Number(input.dbCashBonus || 0);
}

/**
 * CC Xoay is a ledger report. If a service has no Cash row, report zero
 * rather than recreating a bonus from the current Level × 65đ formula.
 */
export function resolveCcLedgerCashBonus(input: { dbCashBonus: number; cashBonusRows: number }): number {
  return input.cashBonusRows > 0 ? Number(input.dbCashBonus || 0) : 0;
}

/**
 * Builds the CC Xoay figures used by the income/paystub report from the same
 * posted Cash Bonus rows as the Xoay detail report. Keep fractional shares
 * intact until each consultant's final total is rounded once.
 */
export function summarizeCcLedgerXoayForPaystub(
  records: ReadonlyArray<{ consultantId?: number; consultantBonus?: number; cashBonusRows?: number }>
): Map<number, { count: number; bonus: number }> {
  const totals = new Map<number, { count: number; bonus: number }>();

  for (const record of records) {
    const consultantId = Number(record.consultantId || 0);
    if (consultantId <= 0 || Number(record.cashBonusRows || 0) <= 0) continue;

    const total = totals.get(consultantId) || { count: 0, bonus: 0 };
    total.count += 1;
    total.bonus += Number(record.consultantBonus || 0);
    totals.set(consultantId, total);
  }

  for (const total of totals.values()) {
    total.bonus = Math.round(total.bonus);
  }

  return totals;
}

/**
 * Cash is the only tip currency that belongs in CC income and payroll views.
 * Other tip currencies remain visible in their own operational reporting but
 * must never be converted into VND income.
 */
export const CASH_TIP_CURRENCY_ID = 2;

export function buildCashTipCurrencyPredicate(tableAlias = 'st'): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(tableAlias)) {
    throw new Error('Invalid SQL table alias');
  }
  return `${tableAlias}.tip_currency_id = ${CASH_TIP_CURRENCY_ID}`;
}

const CC_DAILY_BONUS_TIER_RATES = [
  { minimumSales: 20_000_000, ratePercent: 2.5 },
  { minimumSales: 15_000_000, ratePercent: 2.0 },
  { minimumSales: 10_000_000, ratePercent: 1.5 },
  { minimumSales: 5_000_000, ratePercent: 1.0 },
] as const;

/**
 * Resolves the daily CC commission tier from bonus-eligible sales only.
 * Keep this separate from the 50/50 allocation: sales are split first,
 * then the tier is applied to each consultant's daily total.
 */
export function resolveCcDailyBonusTierRate(totalSales: number): number {
  return CC_DAILY_BONUS_TIER_RATES.find(({ minimumSales }) => totalSales >= minimumSales)?.ratePercent ?? 0.5;
}

export interface DailySalesBonusSummaryInput {
  combo_sales?: number | null;
  product_sales?: number | null;
  single_sales?: number | null;
  debt_collected?: number | null;
  daily_bonus?: number | null;
}

export function buildDailyBonusSummary(
  result: DailySalesBonusSummaryInput[],
  elapsedRatio: number,
  comparison?: {
    mode: 'month' | 'week' | 'day';
    dateFrom: string;
    dateTo: string;
    totalComboSales: number;
    totalProductSales: number;
    totalSingleSales: number;
    totalSales: number;
    totalCcBonus: number;
  }
) {
  const totalComboSales = Math.round(result.reduce((sum, r) => sum + (Number(r.combo_sales) || 0), 0));
  const totalProductSales = Math.round(result.reduce((sum, r) => sum + (Number(r.product_sales) || 0), 0));
  const totalSingleSales = Math.round(result.reduce((sum, r) => sum + (Number(r.single_sales) || 0), 0));
  const totalDebtCollected = Math.round(result.reduce((sum, r) => sum + (Number(r.debt_collected) || 0), 0));
  // Total sales for the top KPI summary includes all service categories (combo + product + single + debt)
  const totalSales = Math.round(totalComboSales + totalProductSales + totalSingleSales + totalDebtCollected);
  const totalCcBonus = Math.round(result.reduce((sum, r) => sum + (Number(r.daily_bonus) || 0), 0));

  const safeRatio = elapsedRatio > 0 ? elapsedRatio : 1;

  return {
    totalComboSales,
    totalProductSales,
    totalSingleSales,
    totalSales,
    totalCcBonus,
    projectedComboSales: Math.round(totalComboSales / safeRatio),
    projectedProductSales: Math.round(totalProductSales / safeRatio),
    projectedSingleSales: Math.round(totalSingleSales / safeRatio),
    projectedTotalSales: Math.round(totalSales / safeRatio),
    projectedCcBonus: Math.round(totalCcBonus / safeRatio),
    elapsedRatioPercent: Math.round(elapsedRatio * 1000) / 10,
    comparison,
  };
}

/**
 * Rule 1: CC Level Calculation Formula: Floor(prevPoints / 100) + 1
 */
export function calculateCcLevel(points: number): number {
  const validPts = Math.max(0, points || 0);
  return Math.floor(validPts / CC_GAMIFICATION_SYSTEM_CONFIG.POINTS_PER_LEVEL) + 1;
}

/**
 * Rule 2: CC Bonus Calculation Formula: Level * 65đ.
 * If CC In != CC Out, CC Bonus is split 50/50.
 */
export function calculateCcBonus(level: number, isSplit: boolean): number {
  const fullBonus = level * CC_GAMIFICATION_SYSTEM_CONFIG.BONUS_PER_LEVEL_VND;
  // Cash rows may legitimately hold a half-VND share. Keep that exact value
  // until the subject's settlement total is rounded once.
  return isSplit ? fullBonus / 2 : fullBonus;
}
