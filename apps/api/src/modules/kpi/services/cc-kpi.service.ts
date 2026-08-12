import { FastifyInstance } from 'fastify';
import { SafeAny, CC_GAMIFICATION_SYSTEM_CONFIG, calculateWheelBonusCap } from '@mos-lab/shared';
import { TeamService } from '../../teams/team.service.js';

export interface CcKpiFilters {
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
  consultantId?: string | number;
  page?: number;
  limit?: number;
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

export function parseServiceSpecs(
  serviceName: string,
  serviceKey?: string,
  durationMinute?: number,
  rawServiceType?: string,
  realAttrMap?: Map<number, number>,
  cvBenchmarkList: SafeAny[] = [],
  serviceId?: number
) {
  const sLower = (serviceName || '').toLowerCase();
  const kLower = (serviceKey || '').toLowerCase();
  const combined = `${kLower} ${sLower}`;

  let className = 'classic-440';
  let classPts = 0;
  if (combined.includes('flawless-1110') || combined.includes('flawless 1110')) {
    className = 'flawless-1110';
    classPts = 5;
  } else if (combined.includes('flawless-880') || combined.includes('flawless 880')) {
    className = 'flawless-880';
    classPts = 5;
  } else if (combined.includes('flawless-770') || combined.includes('flawless 770')) {
    className = 'flawless-770';
    classPts = 5;
  } else if (combined.includes('flawless-390') || combined.includes('flawless 390')) {
    className = 'flawless-390';
    classPts = 5;
  } else if (combined.includes('hyperlight-990') || combined.includes('hyperlight 990')) {
    className = 'hyperlight-990';
    classPts = 4;
  } else if (combined.includes('classic-440') || combined.includes('classic 440')) {
    className = 'classic-440';
    classPts = 0;
  }

  let fan = '3D';
  let fanPts = 1;
  if (combined.includes('5d')) {
    fan = '5D';
    fanPts = 3;
  } else if (combined.includes('4d')) {
    fan = '4D';
    fanPts = 2;
  } else if (combined.includes('3d')) {
    fan = '3D';
    fanPts = 1;
  }

  let serviceType: 'Refill' | 'Retain' | 'New Set';
  let typePts: number;
  if (
    combined.includes('refill') ||
    combined.includes('dặm') ||
    combined.includes('dam') ||
    rawServiceType === 'Retain'
  ) {
    serviceType = 'Refill';
    typePts = 0;
  } else {
    serviceType = 'New Set';
    typePts = 1;
  }

  // Determine Lash Style for benchmark lookup
  let lashStyle = 'Classic';
  if (combined.includes('ivylight')) lashStyle = 'Ivylight';
  else if (combined.includes('flawless')) lashStyle = 'Flawless';
  else if (combined.includes('mink')) lashStyle = 'Mink';
  else if (combined.includes('hyperlight')) lashStyle = 'Hyperlight';
  else if (combined.includes('ultralight') || combined.includes('ultra light')) lashStyle = 'Ultralight';
  else if (combined.includes('volume')) lashStyle = 'Volume 3D';
  else if (combined.includes('under')) lashStyle = 'Under Mink';

  // Resolve real lash count from Single Source of Truth
  let lashCount = 100;
  let resolvedFromRealData = false;

  // Source 1: Real DB item_attribute_value
  if (serviceId && realAttrMap && realAttrMap.has(serviceId)) {
    lashCount = realAttrMap.get(serviceId)!;
    resolvedFromRealData = true;
  }
  // Source 2: CV Xoay Speed Model Benchmarks matching
  else if (cvBenchmarkList && cvBenchmarkList.length > 0 && durationMinute && durationMinute > 0) {
    const normType = rawServiceType === 'Retain' || serviceType === 'Refill' ? 'Retain' : 'Normal';
    const matchedBm = cvBenchmarkList.find(
      (b: SafeAny) =>
        (b.lashStyle === lashStyle ||
          (b.lashStyle === 'Mink' && lashStyle === 'Flawless') ||
          (b.lashStyle === 'Volume 3D' && lashStyle === 'Volume')) &&
        b.serviceType === normType &&
        b.lashCount !== null &&
        Math.abs(b.benchmarkMinutes - durationMinute) <= 5
    );
    if (matchedBm && matchedBm.lashCount) {
      lashCount = matchedBm.lashCount;
      resolvedFromRealData = true;
    }
  }

  // Source 3: Explicit name regex ("100 sợi")
  if (!resolvedFromRealData) {
    const countMatch = combined.match(/(\d+)\s*(sợi|soi|lashes)/);
    if (countMatch) {
      lashCount = parseInt(countMatch[1], 10);
    }
  }

  let lashPts = 0;
  if (lashCount >= 160) lashPts = 3;
  else if (lashCount >= 140) lashPts = 2;
  else if (lashCount >= 120) lashPts = 1;

  let design = 'Tự nhiên';
  let designPts = 0;
  if (combined.includes('mắt mèo') || combined.includes('cat eye')) {
    design = 'Mắt Mèo';
    designPts = 1;
  } else if (combined.includes('búp bê') || combined.includes('doll eye')) {
    design = 'Búp Bê';
    designPts = 1;
  }

  let color = 'Đen';
  let colorPts = 0;
  if (combined.includes('màu') || combined.includes('nâu') || combined.includes('omber')) {
    color = 'Nâu / Thiết kế';
    colorPts = 1;
  }

  return {
    className,
    classPts,
    fan,
    fanPts,
    serviceType,
    typePts,
    lashCount,
    lashPts,
    design,
    designPts,
    color,
    colorPts,
  };
}

export class CcKpiService {
  /**
   * Helper: Get configured active CC staff IDs from crmConfig (ACTIVE_CC_STAFF_CONFIG)
   */
  public static async getActiveCcStaffIds(fastify: FastifyInstance): Promise<number[]> {
    const ids = await TeamService.getActiveStaffIdsWithFallback(fastify, 'CC', 'ACTIVE_CC_STAFF_CONFIG');
    if (ids.length > 0) return ids;

    // Ultimate fallback: query legacy DB for Client Consultant staff
    try {
      const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT DISTINCT up.user_id
        FROM \`user_profile\` up
        LEFT JOIN \`user_group\` ug ON ug.id = up.user_group_id
        LEFT JOIN \`user_group_language\` ugl ON ugl.user_group_id = ug.id AND ugl.language_id = 1
        WHERE up.provider = 'Staff' AND up.is_disabled = 0 
          AND (
            up.user_group_id = 5 
            OR ugl.user_group_name LIKE '%Client Consultant%' 
            OR ugl.user_group_name LIKE '%Tư vấn viên%'
            OR up.user_id IN (SELECT DISTINCT user_id FROM \`staff_payroll_client_consultant\`)
          )
      `);
      if (rows && rows.length > 0) {
        return rows.map((r) => Number(r.user_id)).filter((id) => !isNaN(id) && id > 0);
      }
    } catch (err) {
      fastify.log.error(err as Error, 'Error querying Client Consultant staff roles from legacy DB');
    }

    // Default fallback list of active CC staff IDs
    return [...CC_GAMIFICATION_SYSTEM_CONFIG.FALLBACK_ACTIVE_CC_STAFF_IDS];
  }

  /**
   * Rule 1: CC Level Calculation Formula: Floor(prevPoints / 100) + 1
   */
  public static calculateCcLevel(points: number): number {
    const validPts = Math.max(0, points || 0);
    return Math.floor(validPts / CC_GAMIFICATION_SYSTEM_CONFIG.POINTS_PER_LEVEL) + 1;
  }

  /**
   * Rule 2: CC Bonus Calculation Formula: Level * 65đ.
   * If CC In != CC Out, CC Bonus is split 50/50.
   */
  public static calculateCcBonus(level: number, isSplit: boolean): number {
    const fullBonus = level * CC_GAMIFICATION_SYSTEM_CONFIG.BONUS_PER_LEVEL_VND;
    return isSplit ? Math.round(fullBonus / 2) : fullBonus;
  }

  /**
   * 1. GET CC Xoay Report Data
   */
  public static async getCcXoayReport(fastify: FastifyInstance, filters: CcKpiFilters) {
    const { dateFrom, dateTo, storeId, consultantId, page = 1, limit = 100 } = filters;
    const { startStr, endStr } = parseDateRange(dateFrom, dateTo);
    const monthStartStr = `${startStr.substring(0, 7)}-01`;
    const activeCcIds = await this.getActiveCcStaffIds(fastify);

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
        os.id AS order_service_id,
        s.id AS service_id,
        s.duration_minute AS durationMinute,
        s.service_type AS rawServiceType,
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
        checkin_p.avatar AS checkinAvatar,
        checkout_p.avatar AS checkoutAvatar,
        os.quantity AS lashCount,
        CASE 
            WHEN os.next_fix_order_service_id > 0 THEN 'Fix'
            WHEN os.next_adjust_order_service_id > 0 THEN 'Adjust'
            WHEN s.service_type IN ('Fix', 'Adjust', 'Log') THEN s.service_type
            ELSE '' 
        END AS falRule
      FROM order_service os
      JOIN \`order\` o ON os.order_id = o.id
      JOIN report_order ro ON o.id = ro.order_id
      LEFT JOIN user_profile client_p ON o.user_id = client_p.user_id
      LEFT JOIN client_store cs ON o.client_store_id = cs.id
      LEFT JOIN service s ON os.service_id = s.id
      LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
      LEFT JOIN user_profile checkin_p ON os.check_in_staff_id = checkin_p.user_id
      LEFT JOIN user_profile checkout_p ON os.check_out_staff_id = checkout_p.user_id
      WHERE ro.date BETWEEN '${monthStartStr}' AND '${endStr}' 
        AND o.order_state = 'Completed'
        ${activeCcFilter}
        ${consultantFilter}
        ${storeFilter}
      ORDER BY ro.actual_booking_date_start ASC, os.id ASC
    `);

    if (!rows || rows.length === 0) {
      return {
        data: [],
        total: 0,
        summary: { totalCheckins: 0, totalBonus: 0, totalPoints: 0 },
      };
    }

    // Batch-fetch real DB attributes & CV benchmarks for accurate Lash Count resolution
    const serviceIds = Array.from(new Set(rows.map((r) => Number(r.service_id)).filter((id) => id > 0)));
    const [realAttrMap, cvBenchmarks] = await Promise.all([
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
    ]);

    // Query staff_bonus grouped by order_service_id and user_id for fast lookup via direct JOIN
    const bonusRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT 
        sb.order_service_id,
        sb.user_id,
        SUM(CASE WHEN sb.bonus_type = 'BonusPoint' THEN sb.bonus_amount ELSE 0 END) AS consultantPoints,
        SUM(CASE WHEN sb.bonus_type = 'Cash' THEN sb.bonus_amount ELSE 0 END) AS dbCashBonus,
        SUM(CASE WHEN sbr.type = 'OrderServiceClass' AND sb.bonus_type = 'BonusPoint' THEN sb.bonus_amount ELSE 0 END) AS classPts,
        SUM(CASE WHEN sbr.type = 'OrderServiceAttributeFan' AND sb.bonus_type = 'BonusPoint' THEN sb.bonus_amount ELSE 0 END) AS fanPts,
        SUM(CASE WHEN sbr.type = 'OrderServiceType' AND sb.bonus_type = 'BonusPoint' THEN sb.bonus_amount ELSE 0 END) AS typePts,
        SUM(CASE WHEN sbr.type = 'OrderServiceAttributeLashes' AND sb.bonus_type = 'BonusPoint' THEN sb.bonus_amount ELSE 0 END) AS lashPts,
        SUM(CASE WHEN sbr.type = 'OrderServiceAttributeDesign' AND sb.bonus_type = 'BonusPoint' THEN sb.bonus_amount ELSE 0 END) AS designPts,
        SUM(CASE WHEN sbr.type = 'OrderServiceAttributeColor' AND sb.bonus_type = 'BonusPoint' THEN sb.bonus_amount ELSE 0 END) AS colorPts,
        MAX(CASE 
            WHEN sbr.type IN ('OrderServiceType', 'OrderServicePrice') AND sbr.value_required IN ('Log', 'Fix', 'Adjust') THEN sbr.value_required
            WHEN sb.tracking_key LIKE '%"next_service_type":"Fix"%' THEN 'Fix'
            WHEN sb.tracking_key LIKE '%"next_service_type":"Adjust"%' THEN 'Adjust'
            WHEN sb.tracking_key LIKE '%"next_service_type":"Log"%' THEN 'Log'
            ELSE ''
        END) AS falRule
      FROM staff_bonus sb
      JOIN staff_bonus_rule sbr ON sb.staff_bonus_rule_id = sbr.id
      JOIN order_service os ON sb.order_service_id = os.id
      JOIN \`order\` o ON os.order_id = o.id
      JOIN report_order ro ON o.id = ro.order_id
      WHERE ro.date BETWEEN '${monthStartStr}' AND '${endStr}'
        AND o.order_state = 'Completed'
        ${activeCcFilter}
        ${storeFilter}
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

      for (const target of staffTargets) {
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
        const calculatedLevel = this.calculateCcLevel(prevPoints);

        const ccInName = String(row.ccInName || '');
        const ccOutName = String(row.ccOutName || '');
        const isSplit = Boolean(ccInName && ccOutName && ccInName !== ccOutName);

        const dbCash = Math.round(Number(sbData.dbCashBonus || 0));
        const consultantBonus = dbCash > 0 ? dbCash : this.calculateCcBonus(calculatedLevel, isSplit);

        const dateOnly = String(row.dateOnlyStr || '').substring(0, 10);
        if (dateOnly >= startStr && dateOnly <= endStr) {
          filteredRecords.push({
            consultantId: targetStaffId,
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
            pointsAccu: Math.round(newTotal * 10) / 10,
            consultantPoints,
            ccInName,
            ccOutName,
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
            falRule: String(row.falRule || sbData.falRule || ''),
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

    return {
      data: paginatedRecords,
      total,
      summary: {
        totalCheckins: total,
        totalBonus,
        totalPoints,
      },
    };
  }

  private static leaderboardCache = new Map<string, { data: SafeAny[]; timestamp: number }>();

  /**
   * 2. GET Realtime CC Leaderboard rankings
   */
  public static async getCcLeaderboard(fastify: FastifyInstance, filters: CcKpiFilters) {
    const { dateFrom, dateTo } = filters;
    const { startStr: startDateStr, endStr: endDateStr } = parseDateRange(dateFrom, dateTo);
    const activeCcIds = await this.getActiveCcStaffIds(fastify);

    const startStr = `${startDateStr} 00:00:00`;
    const endStr = `${endDateStr} 23:59:59`;

    const cacheKey = `${startStr}_${endStr}_${activeCcIds.join(',')}`;
    const cached = this.leaderboardCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 20000) {
      return { data: cached.data };
    }

    let activeCcFilter = '';
    if (activeCcIds && activeCcIds.length > 0) {
      activeCcFilter = ` AND sb.user_id IN (${activeCcIds.join(',')})`;
    }

    const staffStats = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `
      SELECT 
        sb.user_id as staffId,
        up.full_name as displayName,
        up.avatar as avatar,
        COUNT(DISTINCT sb.order_id) as totalCheckins,
        COUNT(DISTINCT sb.order_service_id) as totalServices,
        SUM(CASE WHEN sb.bonus_type = 'BonusPoint' THEN sb.bonus_amount ELSE 0 END) as totalPointsAccu,
        FLOOR(SUM(CASE WHEN sb.bonus_type = 'BonusPoint' THEN sb.bonus_amount ELSE 0 END) / 100) + 1 as level,
        SUM(CASE WHEN sb.bonus_type = 'Cash' AND sb.order_service_id IS NOT NULL THEN sb.bonus_amount ELSE 0 END) as totalConsultantBonus,
        COALESCE(combo.combo_revenue, 0) as comboRevenue,
        COALESCE(combo.combo_count, 0) as comboCount
      FROM \`staff_bonus\` sb
      JOIN \`user_profile\` up ON up.user_id = sb.user_id
      LEFT JOIN (
        SELECT 
          COALESCE(
            osc.check_in_staff_id,
            osc.check_out_staff_id,
            o.assigned_staff_id,
            o.created_staff_id
          ) as staff_id,
          SUM(COALESCE(NULLIF(osc.total_price - osc.tax_amount, 0), osc.service_price - osc.discount_amount - osc.tax_amount, 0)) as combo_revenue,
          SUM(COALESCE(osc.quantity, 1)) as combo_count
        FROM \`order\` o
        JOIN \`order_service_combo\` osc ON osc.order_id = o.id
        WHERE o.order_state = 'Completed'
          AND o.booking_date_start >= ?
          AND o.booking_date_start <= ?
        GROUP BY staff_id
      ) combo ON combo.staff_id = sb.user_id
      WHERE sb.date_created >= ? AND sb.date_created <= ? ${activeCcFilter}
      GROUP BY sb.user_id, up.full_name, up.avatar
      ORDER BY totalPointsAccu DESC
      LIMIT 30
    `,
      startStr,
      endStr,
      startStr,
      endStr
    );

    const leaderboard = staffStats.map((s, index) => {
      const staffId = Number(s.staffId);
      const displayName = String(s.displayName || `CC ${staffId}`);
      const totalCheckins = Number(s.totalCheckins || 0);
      const totalServices = Number(s.totalServices || 0);
      const comboRevenue = Number(s.comboRevenue || 0);
      const comboCount = Number(s.comboCount || 0);
      const totalPointsAccu = Math.round(Number(s.totalPointsAccu || 0) * 10) / 10;
      const level = Number(s.level || 1);
      let totalConsultantBonus = Math.round(Number(s.totalConsultantBonus || 0));
      // Formula Fallback: If DB bonus is 0 but staff has points/services, verify/fallback with calculateCcBonus(level)
      if (totalConsultantBonus === 0 && totalServices > 0 && level > 0) {
        totalConsultantBonus = this.calculateCcBonus(level, false) * totalServices;
      }
      const targetCompletionRate = Math.min(100, Math.round((totalCheckins / 200) * 100));

      return {
        rank: index + 1,
        consultantId: staffId,
        displayName,
        avatar: s.avatar ? String(s.avatar) : null,
        store: 'MOS-LAB',
        totalCheckins,
        totalServices,
        comboRevenue,
        comboCount,
        totalPointsAccu,
        level,
        totalConsultantBonus,
        targetCompletionRate,
      };
    });

    // === ENRICH LEADERBOARD WITH 1.5x HARDCAP DATA ===
    // Get full-month daily bonus totals per staff to calculate wheel cap
    try {
      const monthStart = `${startDateStr.substring(0, 7)}-01`;
      const dailyBonusResult = await this.getCcDailySalesBonus(fastify, {
        dateFrom: monthStart,
        dateTo: endDateStr,
      });

      // Aggregate monthly daily bonus per staff
      const staffDailyBonusMap = new Map<number, number>();
      if (dailyBonusResult?.data) {
        for (const rec of dailyBonusResult.data) {
          const uid = Number(rec.user_id);
          const prev = staffDailyBonusMap.get(uid) || 0;
          staffDailyBonusMap.set(uid, prev + Math.round(Number(rec.daily_bonus) || 0));
        }
      }

      // Enrich each leaderboard entry with cap info
      for (const entry of leaderboard) {
        const monthlyDaily = staffDailyBonusMap.get(Number(entry.consultantId)) || 0;
        const monthlyWheel = entry.totalConsultantBonus; // CC Xoay bonus = wheel bonus
        const capResult = calculateWheelBonusCap(monthlyDaily, monthlyWheel);

        (entry as SafeAny).monthlyDailyBonus = capResult.monthlyDailyBonus;
        (entry as SafeAny).monthlyWheelBonus = capResult.rawWheelBonus;
        (entry as SafeAny).maxWheelBonusAllowed = capResult.maxWheelBonusAllowed;
        (entry as SafeAny).wheelCapPercent = capResult.wheelCapPercent;
        (entry as SafeAny).capStatus = capResult.capStatus;
      }
    } catch (capErr) {
      fastify.log.warn(capErr as Error, 'Failed to enrich leaderboard with wheel cap data (non-blocking)');
    }

    this.leaderboardCache.set(cacheKey, { data: leaderboard, timestamp: Date.now() });

    return {
      data: leaderboard,
      total: leaderboard.length,
    };
  }

  /**
   * 3. GET Daily Sales Bonus for Consultants
   */
  public static async getCcDailySalesBonus(fastify: FastifyInstance, filters: CcKpiFilters) {
    const { dateFrom, dateTo, storeId, consultantId } = filters;
    const activeCcIds = await this.getActiveCcStaffIds(fastify);

    const { startStr, endStr } = parseDateRange(dateFrom, dateTo);

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
      SELECT 
        DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%Y-%m-%d') as sale_date,
        COALESCE(osc.check_in_staff_id,
          (SELECT os2.check_in_staff_id FROM \`order_service\` os2 WHERE os2.order_id = osc.order_id AND os2.check_in_staff_id IS NOT NULL LIMIT 1)
        ) as cc_in_id,
        COALESCE(osc.check_out_staff_id,
          (SELECT os2.check_out_staff_id FROM \`order_service\` os2 WHERE os2.order_id = osc.order_id AND os2.check_out_staff_id IS NOT NULL LIMIT 1)
        ) as cc_out_id,
        GREATEST(0, (COALESCE(NULLIF(osc.total_price - osc.tax_amount, 0), osc.service_price - osc.discount_amount - osc.tax_amount, 0) - COALESCE(ud.debt_amount, 0))) as combo_sales,
        COALESCE(osc.quantity, 1) as combo_count,
        UPPER(cs.client_store_key) as store_code
      FROM \`order\` o
      JOIN \`order_service_combo\` osc ON osc.order_id = o.id
      LEFT JOIN \`user_debt\` ud ON ud.order_id = o.id AND ud.debt_amount > 0
      LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
      LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
      WHERE o.order_state = 'Completed'
        AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${startStr} 00:00:00'
        AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${endStr} 23:59:59'
        ${storeFilterClause}
    `;

    const upgradeSalesQuery = `
      SELECT 
        DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%Y-%m-%d') as sale_date,
        os.check_in_staff_id as cc_in_id,
        os.check_out_staff_id as cc_out_id,
        os.upgrade_price as combo_sales,
        0 as combo_count,
        UPPER(cs.client_store_key) as store_code
      FROM \`order\` o
      JOIN \`order_service\` os ON os.order_id = o.id
      LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
      LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
      WHERE o.order_state = 'Completed'
        AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${startStr} 00:00:00'
        AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${endStr} 23:59:59'
        AND os.upgrade_price > 0
        ${storeFilterClause}
    `;

    const productSalesQuery = `
      SELECT 
        DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%Y-%m-%d') as sale_date,
        (SELECT os2.check_in_staff_id FROM \`order_service\` os2 WHERE os2.order_id = op.order_id AND os2.check_in_staff_id IS NOT NULL LIMIT 1) as cc_in_id,
        (SELECT os2.check_out_staff_id FROM \`order_service\` os2 WHERE os2.order_id = op.order_id AND os2.check_out_staff_id IS NOT NULL LIMIT 1) as cc_out_id,
        op.total_price as product_sales,
        op.quantity as product_count,
        UPPER(cs.client_store_key) as store_code
      FROM \`order\` o
      JOIN \`order_product\` op ON op.order_id = o.id
      LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
      LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
      WHERE o.order_state = 'Completed'
        AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${startStr} 00:00:00'
        AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${endStr} 23:59:59'
        ${storeFilterClause}
    `;

    const singleSalesQuery = `
      SELECT 
        DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%Y-%m-%d') as sale_date,
        os.check_in_staff_id as cc_in_id,
        os.check_out_staff_id as cc_out_id,
        os.total_price as single_sales,
        UPPER(cs.client_store_key) as store_code
      FROM \`order\` o
      JOIN \`order_service\` os ON os.order_id = o.id
      LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
      LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
      WHERE o.order_state = 'Completed'
        AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${startStr} 00:00:00'
        AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${endStr} 23:59:59'
        AND LOWER(COALESCE(os.service_group, '')) NOT LIKE '%combo%'
        AND LOWER(COALESCE(os.service_type, '')) NOT LIKE '%combo%'
        AND LOWER(COALESCE(os.service_group, '')) NOT LIKE '%product%'
        ${storeFilterClause}
    `;

    const [comboRows, upgradeRows, productRows, singleRows] = await Promise.all([
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(comboSalesQuery),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(upgradeSalesQuery),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(productSalesQuery),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(singleSalesQuery),
    ]);

    // === 50/50 SPLIT LOGIC: Split doanh số TRƯỚC → Gom theo NGÀY → Tra Tier Rate ===
    // CC owner = COALESCE(check_out_staff_id, check_in_staff_id)
    // If CC IN == CC OUT (or only 1 CC): that CC gets 100%
    // If CC IN != CC OUT: each CC gets 50%

    interface DailySalesAccum {
      combo_sales: number;
      combo_count: number;
      product_sales: number;
      product_count: number;
      single_sales: number;
      debt_collected: number;
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
          product_sales: 0,
          product_count: 0,
          single_sales: 0,
          debt_collected: 0,
          store_code: storeCode,
        };
        salesMap.set(key, entry);
      }
      return entry;
    };

    /**
     * Apply 50/50 split: returns array of { staffId, share } tuples.
     * - CC owner = COALESCE(check_out, check_in) — if both null, skip.
     * - If CC IN == CC OUT (or one is null): 1 entry with share = 1.0
     * - If CC IN != CC OUT: 2 entries each with share = 0.5
     */
    const splitForCcs = (ccInRaw: SafeAny, ccOutRaw: SafeAny): Array<{ staffId: number; share: number }> => {
      const ccIn = ccInRaw ? Number(ccInRaw) : null;
      const ccOut = ccOutRaw ? Number(ccOutRaw) : null;

      if (!ccIn && !ccOut) return [];

      // Only one CC exists
      if (!ccIn || !ccOut) {
        const singleCc = (ccOut || ccIn)!;
        if (!targetStaffIds.includes(singleCc)) return [];
        return [{ staffId: singleCc, share: 1.0 }];
      }

      // CC IN == CC OUT: 100% to that CC
      if (ccIn === ccOut) {
        if (!targetStaffIds.includes(ccIn)) return [];
        return [{ staffId: ccIn, share: 1.0 }];
      }

      // CC IN != CC OUT: 50/50 split
      const result: Array<{ staffId: number; share: number }> = [];
      if (targetStaffIds.includes(ccIn)) result.push({ staffId: ccIn, share: 0.5 });
      if (targetStaffIds.includes(ccOut)) result.push({ staffId: ccOut, share: 0.5 });
      return result;
    };

    // Process combo rows (per-order, not aggregated)
    comboRows.forEach((r) => {
      const splits = splitForCcs(r.cc_in_id, r.cc_out_id);
      const sales = Math.round(Number(r.combo_sales) || 0);
      const count = Number(r.combo_count) || 0;
      const dateStr = String(r.sale_date);
      const storeCode = String(r.store_code || 'MOS');

      splits.forEach(({ staffId, share }) => {
        const entry = getOrCreate(dateStr, staffId, storeCode);
        entry.combo_sales += Math.round(sales * share);
        entry.combo_count += Math.round(count * share);
      });
    });

    // Process upgrade rows (per-order)
    upgradeRows.forEach((r) => {
      const splits = splitForCcs(r.cc_in_id, r.cc_out_id);
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
      const splits = splitForCcs(r.cc_in_id, r.cc_out_id);
      const sales = Math.round(Number(r.product_sales) || 0);
      const count = Number(r.product_count) || 0;
      const dateStr = String(r.sale_date);
      const storeCode = String(r.store_code || 'MOS');

      splits.forEach(({ staffId, share }) => {
        const entry = getOrCreate(dateStr, staffId, storeCode);
        entry.product_sales += Math.round(sales * share);
        entry.product_count += Math.round(count * share);
      });
    });

    // Process single service rows (per-order, for display only — NOT in bonus calculation)
    singleRows.forEach((r) => {
      const splits = splitForCcs(r.cc_in_id, r.cc_out_id);
      const sales = Math.round(Number(r.single_sales) || 0);
      const dateStr = String(r.sale_date);
      const storeCode = String(r.store_code || 'MOS');

      splits.forEach(({ staffId, share }) => {
        const entry = getOrCreate(dateStr, staffId, storeCode);
        entry.single_sales += Math.round(sales * share);
      });
    });

    // === BUILD RESULT: Aggregate per-day, apply Tier Rate ===
    const result = Array.from(salesMap.entries()).map(([key, rec]) => {
      const [dateStr, staffIdStr] = key.split('_');
      const sId = Number(staffIdStr);
      const prof = staffProfileMap.get(sId);

      // Total Sales for CC Bonus: Combo Sales + Product Sales + Debt Collected (EXCLUDES single_sales)
      const total_sales = rec.combo_sales + rec.product_sales + (rec.debt_collected || 0);

      let matchedTierRate: number;
      if (total_sales >= 20000000) {
        matchedTierRate = 2.5;
      } else if (total_sales >= 15000000) {
        matchedTierRate = 2.0;
      } else if (total_sales >= 10000000) {
        matchedTierRate = 1.5;
      } else if (total_sales >= 5000000) {
        matchedTierRate = 1.0;
      } else {
        matchedTierRate = 0.5;
      }

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
        product_sales: rec.product_sales,
        product_count: rec.product_count,
        single_sales: rec.single_sales,
        debt_collected: rec.debt_collected,
        vat: 0,
        debt: 0,
        total_sales,
        commission_rate_percent: matchedTierRate,
        daily_bonus,
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

    const totalComboSales = Math.round(result.reduce((sum, r) => sum + (r.combo_sales || 0), 0));
    const totalProductSales = Math.round(result.reduce((sum, r) => sum + (r.product_sales || 0), 0));
    const totalSingleSales = Math.round(result.reduce((sum, r) => sum + (r.single_sales || 0), 0));
    // totalSales = bonus-eligible sales only (combo + product + debt), excludes single_sales
    const totalSales = Math.round(
      result.reduce((sum, r) => sum + (r.combo_sales || 0) + (r.product_sales || 0) + (r.debt_collected || 0), 0)
    );
    const totalCcBonus = Math.round(result.reduce((sum, r) => sum + (r.daily_bonus || 0), 0));

    const summary = {
      totalComboSales,
      totalProductSales,
      totalSingleSales,
      totalSales,
      totalCcBonus,
      projectedComboSales: Math.round(totalComboSales / elapsedRatio),
      projectedProductSales: Math.round(totalProductSales / elapsedRatio),
      projectedTotalSales: Math.round(totalSales / elapsedRatio),
      projectedCcBonus: Math.round(totalCcBonus / elapsedRatio),
      elapsedRatioPercent: Math.round(elapsedRatio * 1000) / 10,
    };

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

  /**
   * 4. GET CC Tip Report Data (20% Tip share with 50/50 split when CC In != CC Out)
   */
  public static async getCcTipReport(fastify: FastifyInstance, filters: CcKpiFilters) {
    const { dateFrom, dateTo, storeId } = filters;
    const activeCcIds = await this.getActiveCcStaffIds(fastify);

    const { startStr: startDateStr, endStr: endDateStr } = parseDateRange(dateFrom, dateTo);
    const startStr = `${startDateStr} 00:00:00`;
    const endStr = `${endDateStr} 23:59:59`;

    let activeCcFilter = '';
    if (activeCcIds && activeCcIds.length > 0) {
      activeCcFilter = ` AND st.user_id IN (${activeCcIds.join(',')})`;
    }

    let storeFilterClause = '';
    if (storeId && storeId !== 'ALL') {
      const numericStoreId = parseInt(storeId, 10);
      if (!isNaN(numericStoreId)) {
        storeFilterClause = ` AND o.client_store_id = ${numericStoreId}`;
      }
    }

    const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT 
        st.user_id as staffId,
        up.full_name as displayName,
        up.avatar as avatar,
        COUNT(DISTINCT st.order_id) as tipOrderCount,
        SUM(st.tip_amount) as totalTipAmount,
        SUM(st.tip_amount * (st.tip_percentage / 100)) as totalCcTipBonus
      FROM \`staff_tip\` st
      JOIN \`order\` o ON st.order_id = o.id
      LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
      JOIN \`user_profile\` up ON up.user_id = st.user_id
      WHERE o.order_state = 'Completed'
        AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${startStr}'
        AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${endStr}'
        ${activeCcFilter}
        ${storeFilterClause}
      GROUP BY st.user_id, up.full_name, up.avatar
      ORDER BY totalCcTipBonus DESC
    `);

    const result = rows.map((r, index) => ({
      rank: index + 1,
      staffId: Number(r.staffId),
      displayName: String(r.displayName || `CC ${r.staffId}`),
      avatar: r.avatar ? String(r.avatar) : null,
      tipOrderCount: Number(r.tipOrderCount || 0),
      totalTipAmount: Math.round(Number(r.totalTipAmount || 0)),
      totalCcTipBonus: Math.round(Number(r.totalCcTipBonus || 0)),
    }));

    const totalTipBonusSum = result.reduce((sum, r) => sum + r.totalCcTipBonus, 0);

    return {
      data: result,
      total: result.length,
      summary: {
        totalTipBonusSum,
      },
    };
  }
}
