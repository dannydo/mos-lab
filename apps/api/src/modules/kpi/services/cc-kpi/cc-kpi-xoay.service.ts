import { FastifyInstance } from 'fastify';
import { CcXoayReportResponse, SafeAny } from '@mos-lab/shared';
import { getFalReadModelMap } from '../../../fal/fal.service.js';
import { buildExcludeTrainingCvlOrderSql, CvlTrainingMentorshipService } from '../cvl-training-mentorship.service.js';
import { getPreviousReportPeriod } from '../report-period-comparison.js';
import {
  CcKpiFilters,
  FAL_RULE_VALUES_SQL,
  FAL_TRACKING_KEY_SQL_CASES,
  calculateCcLevel,
  filterActiveCcTargets,
  formatStoreCode,
  parseDateRange,
  resolveCcLedgerCashBonus,
} from './cc-kpi-helpers.js';
import { parseServiceSpecs } from './cc-kpi-specs-and-leaderboard.js';
import { getActiveCcStaffIds } from './cc-kpi-staff-and-tip.service.js';

/**
 * 1. GET CC Xoay Report Data
 */
export async function getCcXoayReport(fastify: FastifyInstance, filters: CcKpiFilters): Promise<CcXoayReportResponse> {
  const {
    dateFrom,
    dateTo,
    storeId,
    consultantId,
    page = 1,
    limit = 100,
    comparisonMode,
    includeComparison = false,
    endAt,
  } = filters;
  const { startStr, endStr } = parseDateRange(dateFrom, dateTo);
  const comparisonWindow =
    includeComparison && comparisonMode ? getPreviousReportPeriod(startStr, endStr, comparisonMode) : null;
  const comparisonPromise: Promise<CcXoayReportResponse> | null = comparisonWindow
    ? getCcXoayReport(fastify, {
        dateFrom: comparisonWindow.dateFrom,
        dateTo: comparisonWindow.dateTo,
        storeId,
        consultantId,
        page: 1,
        limit: 1,
        endAt: comparisonWindow.endAt,
      })
    : null;
  const monthStartStr = `${startStr.substring(0, 7)}-01`;
  const queryEndAt = endAt || `${endStr} 23:59:59`;
  const [activeCcIds, activeTrainingPairs] = await Promise.all([
    getActiveCcStaffIds(fastify),
    CvlTrainingMentorshipService.getActivePairsForRange(fastify, monthStartStr, endStr),
  ]);
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const cacheTtlMs = endStr < todayStr ? 300_000 : 30_000;
  const trainingKey = activeTrainingPairs.map((p) => `${p.menteeLegacyStaffId}:${p.startDate}:${p.endDate}`).join('|');
  const cacheKey = `kpi:cc-xoay:${startStr}:${endStr}:${queryEndAt}:${storeId || 'ALL'}:${consultantId || 'ALL'}:${page}:${limit}:${includeComparison ? 1 : 0}:${comparisonMode || ''}:${activeCcIds.join(',')}:${trainingKey}`;
  const cached = fastify.cache?.get<CcXoayReportResponse>(cacheKey);
  if (cached) {
    return cached;
  }
  const excludeTrainingXoaySql = buildExcludeTrainingCvlOrderSql(activeTrainingPairs, 'o.id', 'ro.date');

  let activeCcFilter = '';
  if (activeCcIds && activeCcIds.length > 0) {
    activeCcFilter = ` AND (os.check_in_staff_id IN (${activeCcIds.join(',')}) OR os.check_out_staff_id IN (${activeCcIds.join(',')}))`;
  }

  let consultantFilter = '';
  if (consultantId && consultantId !== 'ALL') {
    const parsedId = Number(consultantId);
    if (!isNaN(parsedId)) {
      consultantFilter = ` AND (os.check_in_staff_id = ${parsedId} OR os.check_out_staff_id = ${parsedId})`;
    } else {
      const escapedName = String(consultantId).replace(/'/g, "''");
      consultantFilter = ` AND (checkin_p.full_name LIKE '%${escapedName}%' OR checkout_p.full_name LIKE '%${escapedName}%')`;
    }
  }

  let storeFilter = '';
  if (storeId && storeId !== 'ALL') {
    const numericStoreId = parseInt(storeId, 10);
    if (!isNaN(numericStoreId)) {
      storeFilter = ` AND o.client_store_id = ${numericStoreId}`;
    }
  }

  // Determine filter staff ID and filter staff Name if specified
  const parsedId = consultantId && consultantId !== 'ALL' ? Number(consultantId) : 0;
  const filterStaffId = !isNaN(parsedId) && parsedId > 0 ? parsedId : 0;
  const filterStaffName =
    consultantId && consultantId !== 'ALL' && isNaN(parsedId) ? String(consultantId).toLowerCase().trim() : '';

  // Query from beginning of the month (monthStartStr) to endStr to build accurate MTD points & Level
  const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT 
        o.id AS order_id,
        os.id AS order_service_id,
        s.id AS service_id,
        s.duration_minute AS durationMinute,
        s.service_type AS rawServiceType,
        COALESCE(ros.service_type, s.service_type, 'Normal') AS effectiveServiceType,
        ros.servicing_minute AS servicingMinutes,
        ros.cleaning_minute AS cleaningMinutes,
        os.next_fix_order_service_id AS nextFixOrderServiceId,
        os.next_adjust_order_service_id AS nextAdjustOrderServiceId,
        os.next_log_order_service_id AS nextLogOrderServiceId,
        CAST(ro.date AS CHAR) AS dateOnlyStr,
        CAST(ro.actual_booking_date_start AS CHAR) AS checkinStr,
        TIME_FORMAT(ro.actual_booking_date_start, '%H:%i') AS checkinTimeStr,
        COALESCE(client_p.full_name, '') AS clientName,
        cs.client_store_key AS store,
        sl.service_name AS serviceName,
        s.service_key AS serviceType,
        os.check_in_staff_id,
        os.check_out_staff_id,
        checkin_p.full_name AS ccInName,
        checkout_p.full_name AS ccOutName,
        COALESCE(NULLIF(checkin_p.avatar, ''), NULLIF(checkin_p.avatar_internal, '')) AS checkinAvatar,
        COALESCE(NULLIF(checkout_p.avatar, ''), NULLIF(checkout_p.avatar_internal, '')) AS checkoutAvatar,
        os.quantity AS lashCount,
        CASE 
            WHEN os.next_fix_order_service_id > 0 THEN 'Fix'
            WHEN os.next_adjust_order_service_id > 0 THEN 'Adjust'
            WHEN os.next_log_order_service_id > 0 THEN 'Log'
            WHEN ros.service_type IN (${FAL_RULE_VALUES_SQL}) THEN ros.service_type
            WHEN s.service_type IN (${FAL_RULE_VALUES_SQL}) THEN s.service_type
            ELSE '' 
        END AS falRule
      FROM order_service os
      JOIN \`order\` o ON os.order_id = o.id
      JOIN report_order ro ON o.id = ro.order_id
      LEFT JOIN report_order_service ros ON ros.order_service_id = os.id
      LEFT JOIN user_profile client_p ON o.user_id = client_p.user_id
      LEFT JOIN client_store cs ON o.client_store_id = cs.id
      LEFT JOIN service s ON os.service_id = s.id
      LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
      LEFT JOIN user_profile checkin_p ON os.check_in_staff_id = checkin_p.user_id
      LEFT JOIN user_profile checkout_p ON os.check_out_staff_id = checkout_p.user_id
      WHERE ro.date BETWEEN '${monthStartStr}' AND '${endStr}' 
        AND ro.actual_booking_date_start <= '${queryEndAt}'
        AND o.order_state = 'Completed'
        ${activeCcFilter}
        ${consultantFilter}
        ${storeFilter}
        ${excludeTrainingXoaySql}
      ORDER BY ro.actual_booking_date_start ASC, os.id ASC
    `);

  if (!rows || rows.length === 0) {
    const comparisonResult = comparisonPromise ? await comparisonPromise.catch(() => null) : null;
    return {
      data: [],
      total: 0,
      summary: {
        totalCheckins: 0,
        totalBonus: 0,
        totalPoints: 0,
        comparison:
          comparisonResult?.summary && comparisonWindow && comparisonMode
            ? {
                mode: comparisonMode,
                dateFrom: comparisonWindow.dateFrom,
                dateTo: comparisonWindow.dateTo,
                totalCheckins: comparisonResult.summary.totalCheckins,
                totalBonus: comparisonResult.summary.totalBonus,
                totalPoints: comparisonResult.summary.totalPoints,
              }
            : undefined,
      },
    };
  }

  // Batch-fetch real DB attributes & CV benchmarks for accurate Lash Count resolution
  const serviceIds = Array.from(new Set(rows.map((r) => Number(r.service_id)).filter((id) => id > 0)));
  const [falMap, [realAttrMap, cvBenchmarks]] = await Promise.all([
    getFalReadModelMap(
      fastify,
      rows.map((row) => ({
        orderServiceId: Number(row.order_service_id),
        effectiveServiceType: String(row.effectiveServiceType || ''),
        nextFixOrderServiceId: Number(row.nextFixOrderServiceId || 0),
        nextAdjustOrderServiceId: Number(row.nextAdjustOrderServiceId || 0),
        nextLogOrderServiceId: Number(row.nextLogOrderServiceId || 0),
        servicingMinutes: row.servicingMinutes == null ? null : Number(row.servicingMinutes),
        cleaningMinutes: row.cleaningMinutes == null ? null : Number(row.cleaningMinutes),
      }))
    ),
    Promise.all([
      fastify.prisma.legacy
        .$queryRawUnsafe<SafeAny[]>(
          `
          SELECT s.id as service_id, aol.attribute_option_value as count
          FROM service s
          JOIN item_attribute_value iav ON s.id = iav.item_id AND iav.type = 'service-attribute'
          JOIN attribute a ON iav.attribute_id = a.id AND a.attribute_key = 'extension-lash-count'
          JOIN attribute_option ao ON iav.attribute_option_id = ao.id
          JOIN attribute_option_language aol ON ao.id = aol.attribute_option_id
          WHERE s.id IN (${serviceIds.length > 0 ? serviceIds.join(',') : '0'})
        `
        )
        .then((attrRows) => {
          const map = new Map<number, number>();
          (attrRows || []).forEach((r) => {
            const num = parseInt(r.count, 10);
            if (!isNaN(num) && num > 0) map.set(Number(r.service_id), num);
          });
          return map;
        })
        .catch(() => new Map<number, number>()),
      fastify.prisma.crm.crmLashTypeBenchmark.findMany().catch(() => []),
    ]),
  ]);

  // Query staff_bonus grouped by order_service_id and user_id for fast lookup via direct JOIN
  const bonusRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT 
        sb.order_service_id,
        sb.user_id,
        SUM(CASE WHEN sb.bonus_type = 'BonusPoint' THEN sb.bonus_amount ELSE 0 END) AS consultantPoints,
        SUM(CASE WHEN sb.bonus_type = 'Cash' THEN sb.bonus_amount ELSE 0 END) AS dbCashBonus,
        SUM(CASE WHEN sb.bonus_type = 'Cash' THEN 1 ELSE 0 END) AS cashBonusRows,
        SUM(CASE WHEN sbr.type = 'OrderServiceClass' AND sb.bonus_type = 'BonusPoint' THEN sb.bonus_amount ELSE 0 END) AS classPts,
        SUM(CASE WHEN sbr.type = 'OrderServiceAttributeFan' AND sb.bonus_type = 'BonusPoint' THEN sb.bonus_amount ELSE 0 END) AS fanPts,
        SUM(CASE WHEN sbr.type = 'OrderServiceType' AND sb.bonus_type = 'BonusPoint' THEN sb.bonus_amount ELSE 0 END) AS typePts,
        SUM(CASE WHEN sbr.type = 'OrderServiceAttributeLashes' AND sb.bonus_type = 'BonusPoint' THEN sb.bonus_amount ELSE 0 END) AS lashPts,
        SUM(CASE WHEN sbr.type = 'OrderServiceAttributeDesign' AND sb.bonus_type = 'BonusPoint' THEN sb.bonus_amount ELSE 0 END) AS designPts,
        SUM(CASE WHEN sbr.type = 'OrderServiceAttributeColor' AND sb.bonus_type = 'BonusPoint' THEN sb.bonus_amount ELSE 0 END) AS colorPts,
        MAX(CASE 
            WHEN sbr.type IN ('OrderServiceType', 'OrderServicePrice') AND sbr.value_required IN (${FAL_RULE_VALUES_SQL}) THEN sbr.value_required
            ${FAL_TRACKING_KEY_SQL_CASES}
            ELSE ''
        END) AS falRule
      FROM staff_bonus sb
      JOIN staff_bonus_rule sbr ON sb.staff_bonus_rule_id = sbr.id
      JOIN order_service os ON sb.order_service_id = os.id
      JOIN \`order\` o ON os.order_id = o.id
      JOIN report_order ro ON o.id = ro.order_id
      WHERE ro.date BETWEEN '${monthStartStr}' AND '${endStr}'
        AND ro.actual_booking_date_start <= '${queryEndAt}'
        AND o.order_state = 'Completed'
        ${activeCcFilter}
        ${storeFilter}
        ${excludeTrainingXoaySql}
      GROUP BY sb.order_service_id, sb.user_id
    `);

  const bonusMap = new Map<string, SafeAny>();
  for (const b of bonusRows) {
    bonusMap.set(`${b.order_service_id}_${b.user_id}`, b);
  }

  // Accumulate points per staff chronologically ASC from 1st of the month
  const staffPointsAccu: Record<string, number> = {};
  const filteredRecords: SafeAny[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Determine staff targets for this row
    const staffTargets: Array<{ staffId: number; staffName: string; avatar: string }> = [];
    const checkInId = Number(row.check_in_staff_id || 0);
    const checkOutId = Number(row.check_out_staff_id || 0);

    if (filterStaffId > 0) {
      if (checkInId === filterStaffId) {
        staffTargets.push({
          staffId: checkInId,
          staffName: String(row.ccInName || row.ccOutName || 'N/A'),
          avatar: String(row.checkinAvatar || row.checkoutAvatar || ''),
        });
      } else if (checkOutId === filterStaffId) {
        staffTargets.push({
          staffId: checkOutId,
          staffName: String(row.ccOutName || row.ccInName || 'N/A'),
          avatar: String(row.checkoutAvatar || row.checkinAvatar || ''),
        });
      }
    } else if (filterStaffName) {
      if (
        String(row.ccInName || '')
          .toLowerCase()
          .includes(filterStaffName)
      ) {
        staffTargets.push({
          staffId: checkInId || checkOutId,
          staffName: String(row.ccInName || row.ccOutName || 'N/A'),
          avatar: String(row.checkinAvatar || row.checkoutAvatar || ''),
        });
      } else if (
        String(row.ccOutName || '')
          .toLowerCase()
          .includes(filterStaffName)
      ) {
        staffTargets.push({
          staffId: checkOutId || checkInId,
          staffName: String(row.ccOutName || row.ccInName || 'N/A'),
          avatar: String(row.checkoutAvatar || row.checkinAvatar || ''),
        });
      }
    } else {
      if (checkInId > 0) {
        staffTargets.push({
          staffId: checkInId,
          staffName: String(row.ccInName || 'N/A'),
          avatar: String(row.checkinAvatar || ''),
        });
      }
      if (checkOutId > 0 && checkOutId !== checkInId) {
        staffTargets.push({
          staffId: checkOutId,
          staffName: String(row.ccOutName || 'N/A'),
          avatar: String(row.checkoutAvatar || ''),
        });
      }
    }

    for (const target of filterActiveCcTargets(staffTargets, activeCcIds)) {
      const targetStaffId = target.staffId;
      const targetStaffName = target.staffName;
      const targetAvatar = target.avatar;

      const bKey = `${row.order_service_id}_${targetStaffId}`;
      const sbData = bonusMap.get(bKey) || {};

      const consultantPoints = Number(sbData.consultantPoints) || 0;
      const staffKey = String(targetStaffId);
      const prevPoints = staffPointsAccu[staffKey] || 0;
      const newTotal = prevPoints + consultantPoints;
      staffPointsAccu[staffKey] = newTotal;

      const specs = parseServiceSpecs(
        row.serviceName || '',
        row.serviceType || '',
        Number(row.durationMinute || 0),
        String(row.rawServiceType || ''),
        realAttrMap,
        cvBenchmarks,
        Number(row.service_id || 0)
      );
      const calculatedLevel = calculateCcLevel(prevPoints);

      const ccInName = String(row.ccInName || '');
      const ccOutName = String(row.ccOutName || '');
      const fal = falMap.get(Number(row.order_service_id)) || null;

      const cashBonusRows = Number(sbData.cashBonusRows || 0);
      const consultantBonus = resolveCcLedgerCashBonus({
        dbCashBonus: Number(sbData.dbCashBonus || 0),
        cashBonusRows,
      });

      const dateOnly = String(row.dateOnlyStr || '').substring(0, 10);
      // A Xoay detail row is an earned-bonus row. Services without a posted
      // Cash Bonus ledger entry stay available for data-quality audit, but
      // must not appear as a zero-value payout in the payroll-facing report.
      if (dateOnly >= startStr && dateOnly <= endStr && cashBonusRows > 0) {
        filteredRecords.push({
          consultantId: targetStaffId,
          orderId: Number(row.order_id),
          serviceId: Number(row.order_service_id),
          checkin: String(row.checkinStr || ''),
          checkinTime: String(row.checkinTimeStr || ''),
          clientName: String(row.clientName || ''),
          store: formatStoreCode(row.store),
          serviceName: String(row.serviceName || ''),
          serviceType: String(row.serviceType || 'Normal'),
          consultantName: targetStaffName,
          avatar: targetAvatar || null,
          consultantLevel: calculatedLevel,
          consultantBonus,
          cashBonusRows,
          pointsAccu: Math.round(newTotal * 10) / 10,
          consultantPoints,
          ccInName,
          ccOutName,
          ccInAvatar: String(row.checkinAvatar || '') || null,
          ccOutAvatar: String(row.checkoutAvatar || '') || null,
          class: specs.className,
          classPts: Number(sbData.classPts) || specs.classPts,
          fan:
            Number(sbData.fanPts) === 3
              ? '5D'
              : Number(sbData.fanPts) === 2
                ? '4D'
                : Number(sbData.fanPts) === 1
                  ? '3D'
                  : specs.fan,
          fanPts: Number(sbData.fanPts) || specs.fanPts,
          type: specs.serviceType,
          typePts: Number(sbData.typePts) || specs.typePts,
          lashCount: specs.lashCount,
          lashPts: Number(sbData.lashPts) || specs.lashPts,
          design: specs.design,
          designPts: Number(sbData.designPts) || specs.designPts,
          color: specs.color,
          colorPts: Number(sbData.colorPts) || specs.colorPts,
          falRule: fal?.rule || String(row.falRule || sbData.falRule || ''),
          fal,
        });
      }
    }
  }

  // Sort final records DESC (newest checkin at top) for UI presentation
  filteredRecords.reverse();

  const total = filteredRecords.length;
  const paginatedRecords = filteredRecords.slice((page - 1) * limit, page * limit);
  const totalBonus = filteredRecords.reduce((sum, r) => sum + r.consultantBonus, 0);
  const totalPoints = filteredRecords.reduce((sum, r) => sum + r.consultantPoints, 0);
  const comparisonResult = comparisonPromise
    ? await comparisonPromise.catch((error: unknown) => {
        fastify.log.warn(error, 'Unable to load CC Xoay comparison period');
        return null;
      })
    : null;

  const result: CcXoayReportResponse = {
    data: paginatedRecords,
    total,
    summary: {
      totalCheckins: total,
      // Cash Bonus rows can include half-đồng shares. Round the total once,
      // never individual rows, so reporting matches the posted ledger.
      totalBonus: Math.round(totalBonus),
      totalPoints,
      comparison:
        comparisonResult?.summary && comparisonWindow && comparisonMode
          ? {
              mode: comparisonMode,
              dateFrom: comparisonWindow.dateFrom,
              dateTo: comparisonWindow.dateTo,
              totalCheckins: comparisonResult.summary.totalCheckins,
              totalBonus: comparisonResult.summary.totalBonus,
              totalPoints: comparisonResult.summary.totalPoints,
            }
          : undefined,
    },
  };
  fastify.cache?.set(cacheKey, result, cacheTtlMs);
  return result;
}
