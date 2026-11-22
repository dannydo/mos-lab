import { FastifyInstance } from 'fastify';
import { CcXoayReportResponse, DailySalesBonusConsultantResponse, SafeAny } from '@mos-lab/shared';
import { CvlTrainingMentorshipService } from './cvl-training-mentorship.service.js';
import { getCcDailySalesBonus, getCcDailySalesBonusCanonical } from './cc-kpi/cc-kpi-daily-sales.service.js';
import {
  CASH_TIP_CURRENCY_ID,
  CcKpiFilters,
  DailySalesBonusSummaryInput,
  FAL_RULE_VALUES,
  FAL_RULE_VALUES_SQL,
  FAL_TRACKING_KEY_SQL_CASES,
  FalRule,
  buildCashTipCurrencyPredicate,
  buildDailyBonusSummary,
  buildGreenVisitEligibilitySql,
  calculateCcBonus,
  calculateCcLevel,
  filterActiveCcTargets,
  formatStoreCode,
  parseDateRange,
  resolveCcCashBonus,
  resolveCcDailyBonusTierRate,
  resolveCcLedgerCashBonus,
  resolveFalRule,
  splitCcShares,
  summarizeCcLedgerXoayForPaystub,
} from './cc-kpi/cc-kpi-helpers.js';
import { buildCcLeaderboard, parseServiceSpecs } from './cc-kpi/cc-kpi-specs-and-leaderboard.js';
import { getActiveCcStaffIds, getCcTipReport } from './cc-kpi/cc-kpi-staff-and-tip.service.js';
import { getCcXoayReport } from './cc-kpi/cc-kpi-xoay.service.js';

export type { CcKpiFilters, FalRule, DailySalesBonusSummaryInput };
export {
  FAL_RULE_VALUES,
  FAL_RULE_VALUES_SQL,
  FAL_TRACKING_KEY_SQL_CASES,
  CASH_TIP_CURRENCY_ID,
  buildGreenVisitEligibilitySql,
  resolveFalRule,
  parseDateRange,
  formatStoreCode,
  filterActiveCcTargets,
  splitCcShares,
  resolveCcCashBonus,
  resolveCcLedgerCashBonus,
  summarizeCcLedgerXoayForPaystub,
  buildCashTipCurrencyPredicate,
  resolveCcDailyBonusTierRate,
  buildDailyBonusSummary,
  buildCcLeaderboard,
  parseServiceSpecs,
};

export class CcKpiService {
  /**
   * Helper: Get configured active CC staff IDs from crmConfig (ACTIVE_CC_STAFF_CONFIG)
   */
  public static getActiveCcStaffIds(fastify: FastifyInstance): Promise<number[]> {
    return getActiveCcStaffIds(fastify);
  }

  /**
   * Rule 1: CC Level Calculation Formula: Floor(prevPoints / 100) + 1
   */
  public static calculateCcLevel(points: number): number {
    return calculateCcLevel(points);
  }

  /**
   * Rule 2: CC Bonus Calculation Formula: Level * 65đ.
   * If CC In != CC Out, CC Bonus is split 50/50.
   */
  public static calculateCcBonus(level: number, isSplit: boolean): number {
    return calculateCcBonus(level, isSplit);
  }

  /**
   * 1. GET CC Xoay Report Data
   */
  public static getCcXoayReport(fastify: FastifyInstance, filters: CcKpiFilters): Promise<CcXoayReportResponse> {
    return getCcXoayReport(fastify, filters);
  }

  private static leaderboardCache = new Map<string, { data: SafeAny[]; timestamp: number }>();

  /**
   * 2. GET Realtime CC Leaderboard rankings
   */
  public static async getCcLeaderboard(fastify: FastifyInstance, filters: CcKpiFilters) {
    const { dateFrom, dateTo, storeId = 'ALL' } = filters;
    const { startStr: startDateStr, endStr: endDateStr } = parseDateRange(dateFrom, dateTo);
    const monthStart = `${startDateStr.substring(0, 7)}-01`;
    const [activeCcIds, activeTrainingPairs] = await Promise.all([
      this.getActiveCcStaffIds(fastify),
      CvlTrainingMentorshipService.getActivePairsForRange(fastify, monthStart, endDateStr),
    ]);
    const normalizedStoreId = storeId && storeId !== 'ALL' ? String(storeId) : 'ALL';
    const trainingKey = activeTrainingPairs
      .map((p) => `${p.menteeLegacyStaffId}:${p.startDate}:${p.endDate}`)
      .join('|');
    const cacheKey = `${startDateStr}_${endDateStr}_${normalizedStoreId}_${activeCcIds.join(',')}_${trainingKey}`;
    const cached = this.leaderboardCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 20000) {
      return { data: cached.data, total: cached.data.length };
    }

    const selectedReportPromise = this.getCcXoayReport(fastify, {
      dateFrom: startDateStr,
      dateTo: endDateStr,
      storeId: normalizedStoreId,
      page: 1,
      limit: 100000,
    });
    const monthlyReportPromise =
      startDateStr === monthStart
        ? selectedReportPromise
        : this.getCcXoayReport(fastify, {
            dateFrom: monthStart,
            dateTo: endDateStr,
            storeId: normalizedStoreId,
            page: 1,
            limit: 100000,
          });
    const selectedDailySalesPromise = this.getCcDailySalesBonus(fastify, {
      dateFrom: startDateStr,
      dateTo: endDateStr,
      storeId: normalizedStoreId,
    });
    const monthlyDailySalesPromise = this.getCcDailySalesBonus(fastify, {
      dateFrom: monthStart,
      dateTo: endDateStr,
      storeId: normalizedStoreId,
    });

    const [selectedReport, monthlyReport, selectedDailySales, monthlyDailySales] = await Promise.all([
      selectedReportPromise,
      monthlyReportPromise,
      selectedDailySalesPromise,
      monthlyDailySalesPromise,
    ]);
    const leaderboard = buildCcLeaderboard({
      selectedRecords: selectedReport.data,
      monthlyRecords: monthlyReport.data,
      selectedDailySales: selectedDailySales.data,
      monthlyDailySales: monthlyDailySales.data,
    });

    this.leaderboardCache.set(cacheKey, { data: leaderboard, timestamp: Date.now() });

    return {
      data: leaderboard,
      total: leaderboard.length,
    };
  }

  /**
   * 3. GET Daily Sales Bonus for Consultants
   */
  public static getCcDailySalesBonus(
    fastify: FastifyInstance,
    filters: CcKpiFilters
  ): Promise<DailySalesBonusConsultantResponse> {
    return getCcDailySalesBonus(fastify, filters);
  }

  /** Exact Legacy calculation used for projection rebuild and safe fallback. */
  public static getCcDailySalesBonusCanonical(
    fastify: FastifyInstance,
    filters: CcKpiFilters
  ): Promise<DailySalesBonusConsultantResponse> {
    return getCcDailySalesBonusCanonical(fastify, filters);
  }

  /**
   * 4. GET CC Tip Report Data (20% Tip share with 50/50 split when CC In != CC Out)
   */
  public static getCcTipReport(fastify: FastifyInstance, filters: CcKpiFilters) {
    return getCcTipReport(fastify, filters);
  }
}
