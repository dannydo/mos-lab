import { FastifyInstance } from 'fastify';
import { DailySalesBonusConsultantResponse, SafeAny } from '@mos-lab/shared';
import { buildComboBalanceExistsSql } from '../../../customers/services/combo-recognition.service.js';
import { CcKpiDailyProjectionService } from '../../../projections/cc-kpi-daily-projection.service.js';
import { buildExcludeTrainingCvlOrderSql, CvlTrainingMentorshipService } from '../cvl-training-mentorship.service.js';
import { getPreviousReportPeriod } from '../report-period-comparison.js';
import {
  CcKpiFilters,
  buildDailyBonusSummary,
  parseDateRange,
  resolveCcDailyBonusTierRate,
  splitCcShares,
} from './cc-kpi-helpers.js';
import { getActiveCcStaffIds } from './cc-kpi-staff-and-tip.service.js';

/**
 * 3. GET Daily Sales Bonus for Consultants
 * Read projection only after a separate shadow rollout has explicitly enabled
 * it. Any missing coverage, changed active-CC configuration, store-specific
 * filter, or comparison request falls back to the canonical Legacy query.
 */
export async function getCcDailySalesBonus(
  fastify: FastifyInstance,
  filters: CcKpiFilters
): Promise<DailySalesBonusConsultantResponse> {
  const { dateFrom, dateTo, storeId, consultantId, includeComparison = false } = filters;
  const canUseProjection =
    process.env.CC_KPI_DAILY_PROJECTION_READ_ENABLED === 'true' &&
    !includeComparison &&
    (!storeId || storeId === 'ALL');
  if (canUseProjection) {
    const { startStr, endStr } = parseDateRange(dateFrom, dateTo);
    const [activeCcIds, activeTrainingPairs] = await Promise.all([
      getActiveCcStaffIds(fastify),
      CvlTrainingMentorshipService.getActivePairsForRange(fastify, startStr, endStr),
    ]);
    if (activeTrainingPairs.length === 0) {
      const parsedConsultantId = consultantId && consultantId !== 'ALL' ? Number(consultantId) : undefined;
      const projected = await CcKpiDailyProjectionService.readRange(
        fastify,
        startStr,
        endStr,
        'ALL',
        activeCcIds,
        Number.isSafeInteger(parsedConsultantId) && Number(parsedConsultantId) > 0
          ? Number(parsedConsultantId)
          : undefined
      );
      if (projected) return projected as unknown as DailySalesBonusConsultantResponse;
    }
  }
  return getCcDailySalesBonusCanonical(fastify, filters);
}

/** Exact Legacy calculation used for projection rebuild and safe fallback. */
export async function getCcDailySalesBonusCanonical(
  fastify: FastifyInstance,
  filters: CcKpiFilters
): Promise<DailySalesBonusConsultantResponse> {
  const { dateFrom, dateTo, storeId, consultantId, comparisonMode, includeComparison = false, endAt } = filters;
  const activeCcIds = await getActiveCcStaffIds(fastify);

  const { startStr, endStr } = parseDateRange(dateFrom, dateTo);
  const activeTrainingPairs = await CvlTrainingMentorshipService.getActivePairsForRange(fastify, startStr, endStr);
  const excludeTrainingActualSql = buildExcludeTrainingCvlOrderSql(
    activeTrainingPairs,
    'o.id',
    'ro.actual_booking_date_start'
  );
  const excludeTrainingBookingSql = buildExcludeTrainingCvlOrderSql(
    activeTrainingPairs,
    'o.id',
    'o.booking_date_start'
  );
  const excludeTrainingDebtSql = buildExcludeTrainingCvlOrderSql(
    activeTrainingPairs,
    'COALESCE(udp.order_id, ud.order_id)',
    'COALESCE(ro.actual_booking_date_start, o.booking_date_start, udp.date_created)'
  );
  const comparisonWindow =
    includeComparison && comparisonMode ? getPreviousReportPeriod(startStr, endStr, comparisonMode) : null;
  const comparisonPromise: Promise<DailySalesBonusConsultantResponse> | null = comparisonWindow
    ? getCcDailySalesBonusCanonical(fastify, {
        dateFrom: comparisonWindow.dateFrom,
        dateTo: comparisonWindow.dateTo,
        storeId,
        consultantId,
        endAt: comparisonWindow.endAt,
      })
    : null;

  let targetStaffIds: number[] = activeCcIds;
  if (consultantId && consultantId !== 'ALL') {
    const parsedId = Number(consultantId);
    if (!isNaN(parsedId)) {
      targetStaffIds = [parsedId];
    }
  }
  const staffIdsListStr = targetStaffIds.join(',');

  let storeFilterClause = '';
  if (storeId && storeId !== 'ALL') {
    const numericStoreId = parseInt(storeId, 10);
    if (!isNaN(numericStoreId)) {
      storeFilterClause = ` AND o.client_store_id = ${numericStoreId}`;
    }
  }

  // Keep Rule #15 actual-check-in semantics while leaving both date columns sargable.
  // `endAt` is internal-only and lets an active period compare against the
  // exact same clock time in the matching previous period.
  const queryEndAt = endAt || `${endStr} 23:59:59`;
  // The two branches are mutually exclusive. Querying either indexed date
  // directly is cheaper than repeatedly applying COALESCE/OR to each
  // Order/Service category query below.
  const eligibleOrdersCte = `
      WITH eligible_orders AS (
        SELECT o.id AS order_id, o.user_id, o.client_store_id, o.combo_sale_required,
               o.date_created, o.booking_date_start, ro.actual_booking_date_start AS sale_at
        FROM report_order ro
        INNER JOIN \`order\` o ON o.id = ro.order_id
        WHERE o.order_state = 'Completed'
          AND ro.actual_booking_date_start >= '${startStr} 00:00:00'
          AND ro.actual_booking_date_start <= '${queryEndAt}'
          ${storeFilterClause}
          ${excludeTrainingActualSql}
        UNION ALL
        SELECT o.id AS order_id, o.user_id, o.client_store_id, o.combo_sale_required,
               o.date_created, o.booking_date_start, o.booking_date_start AS sale_at
        FROM \`order\` o
        LEFT JOIN report_order ro ON ro.order_id = o.id
        WHERE o.order_state = 'Completed'
          AND ro.actual_booking_date_start IS NULL
          AND o.booking_date_start >= '${startStr} 00:00:00'
          AND o.booking_date_start <= '${queryEndAt}'
          ${storeFilterClause}
          ${excludeTrainingBookingSql}
      )`;

  const staffProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT 
        u.id as userId,
        up.full_name as displayName,
        up.avatar as avatar
      FROM \`user\` u
      JOIN \`user_profile\` up ON up.user_id = u.id
      WHERE u.id IN (${staffIdsListStr})
    `);
  const staffProfileMap = new Map<number, { displayName: string; avatar: string | null }>();
  staffProfiles.forEach((s) => {
    staffProfileMap.set(Number(s.userId), {
      displayName: String(s.displayName || `CC ${s.userId}`),
      avatar: s.avatar ? String(s.avatar) : null,
    });
  });

  // === RAW PER-ORDER QUERIES: Return both check_in & check_out staff IDs for 50/50 split ===

  const comboSalesQuery = `
      ${eligibleOrdersCte}
      SELECT 
        DATE_FORMAT(eo.sale_at, '%Y-%m-%d') as sale_date,
        COALESCE(osc.check_in_staff_id,
          (SELECT os2.check_in_staff_id FROM \`order_service\` os2 WHERE os2.order_id = osc.order_id AND os2.check_in_staff_id IS NOT NULL LIMIT 1)
        ) as cc_in_id,
        COALESCE(osc.check_out_staff_id,
          (SELECT os2.check_out_staff_id FROM \`order_service\` os2 WHERE os2.order_id = osc.order_id AND os2.check_out_staff_id IS NOT NULL LIMIT 1)
        ) as cc_out_id,
        GREATEST(0, (COALESCE(NULLIF(osc.total_price - osc.tax_amount, 0), osc.service_price - osc.discount_amount - osc.tax_amount, 0) - COALESCE(ud.debt_amount, 0))) as combo_sales,
        COALESCE(osc.quantity, 1) as combo_count,
        CASE WHEN COALESCE(eo.combo_sale_required, 0) <> 0 THEN 1 ELSE 0 END as is_green_visit,
        UPPER(cs.client_store_key) as store_code
      FROM eligible_orders eo
      JOIN \`order_service_combo\` osc ON osc.order_id = eo.order_id
      LEFT JOIN \`service_price\` sp ON sp.id = osc.service_price_id
      LEFT JOIN \`service_language\` sl ON sl.service_id = osc.service_id AND sl.language_id = 1
      LEFT JOIN \`user_debt\` ud ON ud.order_id = eo.order_id AND ud.debt_amount > 0
      LEFT JOIN \`client_store\` cs ON cs.id = eo.client_store_id
      WHERE ${buildComboBalanceExistsSql('eo')}
        AND (sp.service_price_package_key IS NULL OR (
          LOWER(sp.service_price_package_key) NOT LIKE '%single%'
          AND LOWER(sp.service_price_package_key) NOT LIKE '%refill%'
          AND LOWER(sp.service_price_package_key) NOT LIKE '%balance%'
        ))
        AND (sl.service_name IS NULL OR (
          LOWER(sl.service_name) NOT LIKE '%single%'
          AND LOWER(sl.service_name) NOT LIKE '%refill%'
          AND LOWER(sl.service_name) NOT LIKE '%balance%'
        ))
    `;

  const upgradeSalesQuery = `
      ${eligibleOrdersCte}
      SELECT 
        DATE_FORMAT(eo.sale_at, '%Y-%m-%d') as sale_date,
        os.check_in_staff_id as cc_in_id,
        os.check_out_staff_id as cc_out_id,
        os.upgrade_price as combo_sales,
        0 as combo_count,
        UPPER(cs.client_store_key) as store_code
      FROM eligible_orders eo
      JOIN \`order_service\` os ON os.order_id = eo.order_id
      LEFT JOIN \`client_store\` cs ON cs.id = eo.client_store_id
      WHERE os.upgrade_price > 0
    `;

  const productSalesQuery = `
      ${eligibleOrdersCte}
      SELECT 
        DATE_FORMAT(eo.sale_at, '%Y-%m-%d') as sale_date,
        (SELECT os2.check_in_staff_id FROM \`order_service\` os2 WHERE os2.order_id = op.order_id AND os2.check_in_staff_id IS NOT NULL LIMIT 1) as cc_in_id,
        (SELECT os2.check_out_staff_id FROM \`order_service\` os2 WHERE os2.order_id = op.order_id AND os2.check_out_staff_id IS NOT NULL LIMIT 1) as cc_out_id,
        op.total_price as product_sales,
        op.quantity as product_count,
        UPPER(cs.client_store_key) as store_code
      FROM eligible_orders eo
      JOIN \`order_product\` op ON op.order_id = eo.order_id
      LEFT JOIN \`client_store\` cs ON cs.id = eo.client_store_id
    `;

  const singleSalesQuery = `
      ${eligibleOrdersCte}
      SELECT 
        DATE_FORMAT(eo.sale_at, '%Y-%m-%d') as sale_date,
        os.check_in_staff_id as cc_in_id,
        os.check_out_staff_id as cc_out_id,
        os.total_price as single_sales,
        UPPER(cs.client_store_key) as store_code
      FROM eligible_orders eo
      JOIN \`order_service\` os ON os.order_id = eo.order_id
      LEFT JOIN \`client_store\` cs ON cs.id = eo.client_store_id
      WHERE LOWER(COALESCE(os.service_group, '')) NOT LIKE '%combo%'
        AND LOWER(COALESCE(os.service_type, '')) NOT LIKE '%combo%'
        AND LOWER(COALESCE(os.service_group, '')) NOT LIKE '%product%'
    `;

  // A "Vòng Xanh" appointment uses the same combo-sale eligibility snapshot
  // persisted by Legacy when the booking was created. Completion and report
  // date still follow the actual check-in window (Rule #15).
  const visitMetricsQuery = `
      ${eligibleOrdersCte}
      SELECT
        DATE_FORMAT(eo.sale_at, '%Y-%m-%d') as visit_date,
        MAX(os.check_in_staff_id) as cc_in_id,
        MAX(os.check_out_staff_id) as cc_out_id,
        UPPER(cs.client_store_key) as store_code,
        CASE WHEN COALESCE(eo.combo_sale_required, 0) <> 0 THEN 1 ELSE 0 END as is_green_visit
      FROM eligible_orders eo
      JOIN \`order_service\` os ON os.order_id = eo.order_id
      LEFT JOIN \`client_store\` cs ON cs.id = eo.client_store_id
      GROUP BY
        eo.order_id,
        eo.user_id,
        eo.date_created,
        eo.sale_at,
        eo.booking_date_start,
        cs.client_store_key
    `;

  let storeFilterClauseDebt = '';
  if (storeId && storeId !== 'ALL') {
    const numericStoreId = parseInt(storeId, 10);
    if (!isNaN(numericStoreId)) {
      storeFilterClauseDebt = ` AND COALESCE(o.client_store_id, ud.client_store_id) = ${numericStoreId}`;
    }
  }

  const debtPaymentSalesQuery = `
      SELECT 
        DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start, udp.date_created), '%Y-%m-%d') as sale_date,
        COALESCE(
          (SELECT os.check_in_staff_id FROM \`order_service\` os WHERE os.order_id = udp.order_id AND os.check_in_staff_id IS NOT NULL LIMIT 1),
          udp.created_staff_id
        ) as cc_in_id,
        COALESCE(
          (SELECT os.check_out_staff_id FROM \`order_service\` os WHERE os.order_id = udp.order_id AND os.check_out_staff_id IS NOT NULL LIMIT 1),
          udp.created_staff_id
        ) as cc_out_id,
        udp.paid_amount as debt_collected,
        UPPER(COALESCE(cs_order.client_store_key, cs_debt.client_store_key, 'MOS')) as store_code
      FROM \`user_debt_payment\` udp
      JOIN \`user_debt\` ud ON ud.id = udp.user_debt_id
      LEFT JOIN \`order\` o ON o.id = udp.order_id
      LEFT JOIN report_order ro ON ro.order_id = o.id
      LEFT JOIN \`client_store\` cs_order ON cs_order.id = o.client_store_id
      LEFT JOIN \`client_store\` cs_debt ON cs_debt.id = ud.client_store_id
      WHERE udp.paid_amount > 0
        AND udp.is_completed = 1
        AND COALESCE(udp.is_cancelled, 0) = 0
        AND COALESCE(ro.actual_booking_date_start, o.booking_date_start, udp.date_created) >= '${startStr} 00:00:00'
        AND COALESCE(ro.actual_booking_date_start, o.booking_date_start, udp.date_created) <= '${queryEndAt}'
        ${storeFilterClauseDebt}
        ${excludeTrainingDebtSql}
    `;

  const [comboRows, upgradeRows, productRows, singleRows, visitRows, debtRows] = await Promise.all([
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(comboSalesQuery),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(upgradeSalesQuery),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(productSalesQuery),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(singleSalesQuery),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(visitMetricsQuery),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(debtPaymentSalesQuery),
  ]);

  // === 50/50 SPLIT LOGIC: Split doanh số TRƯỚC → Gom theo NGÀY → Tra Tier Rate ===
  // CC owner = COALESCE(check_out_staff_id, check_in_staff_id)
  // If CC IN == CC OUT (or only 1 CC): that CC gets 100%
  // If CC IN != CC OUT: each CC gets 50%

  interface DailySalesAccum {
    combo_sales: number;
    combo_count: number;
    green_combo_count: number;
    product_sales: number;
    product_count: number;
    single_sales: number;
    debt_collected: number;
    total_visits: number;
    green_visits: number;
    store_code: string;
  }

  const salesMap = new Map<string, DailySalesAccum>();
  const getMapKey = (dateStr: string, sId: number) => `${dateStr}_${sId}`;

  const getOrCreate = (dateStr: string, sId: number, storeCode: string): DailySalesAccum => {
    const key = getMapKey(dateStr, sId);
    let entry = salesMap.get(key);
    if (!entry) {
      entry = {
        combo_sales: 0,
        combo_count: 0,
        green_combo_count: 0,
        product_sales: 0,
        product_count: 0,
        single_sales: 0,
        debt_collected: 0,
        total_visits: 0,
        green_visits: 0,
        store_code: storeCode,
      };
      salesMap.set(key, entry);
    }
    return entry;
  };

  // Process combo rows (per-order, not aggregated)
  comboRows.forEach((r) => {
    const splits = splitCcShares(r.cc_in_id, r.cc_out_id, targetStaffIds);
    const sales = Math.round(Number(r.combo_sales) || 0);
    const count = Number(r.combo_count) || 0;
    const dateStr = String(r.sale_date);
    const storeCode = String(r.store_code || 'MOS');

    splits.forEach(({ staffId, share }) => {
      const entry = getOrCreate(dateStr, staffId, storeCode);
      entry.combo_sales += Math.round(sales * share);
      entry.combo_count += count * share;
      if (Number(r.is_green_visit) === 1) {
        entry.green_combo_count += count * share;
      }
    });
  });

  // Process upgrade rows (per-order)
  upgradeRows.forEach((r) => {
    const splits = splitCcShares(r.cc_in_id, r.cc_out_id, targetStaffIds);
    const sales = Math.round(Number(r.combo_sales) || 0);
    const dateStr = String(r.sale_date);
    const storeCode = String(r.store_code || 'MOS');

    splits.forEach(({ staffId, share }) => {
      const entry = getOrCreate(dateStr, staffId, storeCode);
      entry.combo_sales += Math.round(sales * share);
    });
  });

  // Process product rows (per-order)
  productRows.forEach((r) => {
    const splits = splitCcShares(r.cc_in_id, r.cc_out_id, targetStaffIds);
    const sales = Math.round(Number(r.product_sales) || 0);
    const count = Number(r.product_count) || 0;
    const dateStr = String(r.sale_date);
    const storeCode = String(r.store_code || 'MOS');

    splits.forEach(({ staffId, share }) => {
      const entry = getOrCreate(dateStr, staffId, storeCode);
      entry.product_sales += Math.round(sales * share);
      entry.product_count += count * share;
    });
  });

  // Process single service rows (per-order, for display only — NOT in bonus calculation)
  singleRows.forEach((r) => {
    const splits = splitCcShares(r.cc_in_id, r.cc_out_id, targetStaffIds);
    const sales = Math.round(Number(r.single_sales) || 0);
    const dateStr = String(r.sale_date);
    const storeCode = String(r.store_code || 'MOS');

    splits.forEach(({ staffId, share }) => {
      const entry = getOrCreate(dateStr, staffId, storeCode);
      entry.single_sales += Math.round(sales * share);
    });
  });

  // Process debt collection rows (per-payment, 50/50 split if CC IN != CC OUT)
  debtRows.forEach((r) => {
    const splits = splitCcShares(r.cc_in_id, r.cc_out_id, targetStaffIds);
    const sales = Math.round(Number(r.debt_collected) || 0);
    const dateStr = String(r.sale_date);
    const storeCode = String(r.store_code || 'MOS');

    splits.forEach(({ staffId, share }) => {
      const entry = getOrCreate(dateStr, staffId, storeCode);
      entry.debt_collected += Math.round(sales * share);
    });
  });

  // One completed order is one customer visit. Use the same CC IN/OUT
  // allocation as sales so a split handoff cannot inflate the denominator
  // or distort the Vòng Xanh conversion rate.
  visitRows.forEach((r) => {
    const splits = splitCcShares(r.cc_in_id, r.cc_out_id, targetStaffIds);
    const dateStr = String(r.visit_date);
    const storeCode = String(r.store_code || 'MOS');
    const isGreenVisit = Number(r.is_green_visit) === 1;

    splits.forEach(({ staffId, share }) => {
      const entry = getOrCreate(dateStr, staffId, storeCode);
      entry.total_visits += share;
      if (isGreenVisit) entry.green_visits += share;
    });
  });

  // === BUILD RESULT: Aggregate per-day, apply Tier Rate ===
  const result = Array.from(salesMap.entries()).map(([key, rec]) => {
    const [dateStr, staffIdStr] = key.split('_');
    const sId = Number(staffIdStr);
    const prof = staffProfileMap.get(sId);

    // Total Sales for CC Bonus: Combo Sales + Product Sales + Debt Collected (EXCLUDES single_sales)
    const total_sales = rec.combo_sales + rec.product_sales + (rec.debt_collected || 0);

    const matchedTierRate = resolveCcDailyBonusTierRate(total_sales);

    // Daily Bonus: % Tier Rate on Qualifying Total Sales (Rule #15 actual_booking_date_start)
    const daily_bonus = Math.round((total_sales * matchedTierRate) / 100);

    return {
      id: `${key}_${rec.store_code}`,
      date: dateStr,
      user_id: sId,
      consultant_name: prof?.displayName || `CC ${sId}`,
      avatar: prof?.avatar || null,
      store_code: rec.store_code,
      combo_sales: rec.combo_sales,
      combo_count: rec.combo_count,
      green_combo_count: rec.green_combo_count,
      product_sales: rec.product_sales,
      product_count: rec.product_count,
      single_sales: rec.single_sales,
      debt_collected: rec.debt_collected,
      vat: 0,
      debt: 0,
      total_sales,
      commission_rate_percent: matchedTierRate,
      daily_bonus,
      total_visits: rec.total_visits,
      green_visits: rec.green_visits,
    };
  });

  // Calculate Real-time Run-rate Elapsed Ratio (11:00 AM - 23:00 PM shift formula)
  const now = new Date();
  const currentHour = now.getHours();
  const fractionToday = currentHour < 11 ? 0 : currentHour > 22 ? 1 : (currentHour - 11 + 1) / 12;

  const sDate = new Date(startStr);
  const eDate = new Date(endStr);
  const tDate = new Date(now.toISOString().slice(0, 10));

  const totalDays = Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const elapsedRatio =
    tDate < sDate
      ? 0.001
      : tDate > eDate
        ? 1.0
        : Math.min(
            1.0,
            Math.max(
              0.001,
              (Math.max(0, Math.round((tDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24))) + fractionToday) /
                totalDays
            )
          );

  const comparisonResult = comparisonPromise
    ? await comparisonPromise.catch((error: unknown) => {
        fastify.log.warn(error, 'Unable to load Daily Bonus comparison period');
        return null;
      })
    : null;
  const comparison =
    comparisonResult?.summary && comparisonWindow && comparisonMode
      ? {
          mode: comparisonMode,
          dateFrom: comparisonWindow.dateFrom,
          dateTo: comparisonWindow.dateTo,
          totalComboSales: Math.round(comparisonResult.summary.totalComboSales || 0),
          totalProductSales: Math.round(comparisonResult.summary.totalProductSales || 0),
          totalSingleSales: Math.round(comparisonResult.summary.totalSingleSales || 0),
          totalSales: Math.round(comparisonResult.summary.totalSales || 0),
          totalCcBonus: Math.round(comparisonResult.summary.totalCcBonus || 0),
        }
      : undefined;

  const summary = buildDailyBonusSummary(result, elapsedRatio, comparison);

  return {
    data: result,
    total: result.length,
    summary,
    activeStaff: staffProfiles.map((s) => ({
      userId: Number(s.userId),
      displayName: s.displayName,
      avatar: s.avatar ? String(s.avatar) : null,
    })),
  };
}
