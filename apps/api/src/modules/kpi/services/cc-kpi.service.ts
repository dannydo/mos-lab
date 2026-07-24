import { FastifyInstance } from 'fastify';

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

export function parseServiceSpecs(serviceName: string) {
  const sLower = (serviceName || '').toLowerCase();
  let className = 'classic-440';
  let classPts = 0;
  if (sLower.includes('flawless-1110')) {
    className = 'flawless-1110';
    classPts = 5;
  } else if (sLower.includes('flawless-880')) {
    className = 'flawless-880';
    classPts = 5;
  } else if (sLower.includes('flawless-770')) {
    className = 'flawless-770';
    classPts = 5;
  } else if (sLower.includes('flawless-390')) {
    className = 'flawless-390';
    classPts = 5;
  } else if (sLower.includes('hyperlight-990')) {
    className = 'hyperlight-990';
    classPts = 4;
  } else if (sLower.includes('classic-440')) {
    className = 'classic-440';
    classPts = 0;
  }

  let fan = '3D';
  let fanPts = 1;
  if (sLower.includes('5d')) {
    fan = '5D';
    fanPts = 3;
  } else if (sLower.includes('4d')) {
    fan = '4D';
    fanPts = 2;
  } else if (sLower.includes('3d')) {
    fan = '3D';
    fanPts = 1;
  }

  let serviceType: 'Refill' | 'Retain' | 'New Set' = 'New Set';
  let typePts = 0;
  if (sLower.includes('refill') || sLower.includes('dặm') || sLower.includes('dam')) {
    serviceType = 'Refill';
    typePts = 0;
  } else {
    serviceType = 'New Set';
    typePts = 1;
  }

  let lashCount = 100;
  let lashPts = 0;
  const countMatch = sLower.match(/(\d+)\s*(sợi|soi|lashes)/);
  if (countMatch) {
    lashCount = parseInt(countMatch[1], 10);
    if (lashCount >= 160) lashPts = 3;
    else if (lashCount >= 140) lashPts = 2;
    else if (lashCount >= 120) lashPts = 1;
  }

  let design = 'Tự nhiên';
  let designPts = 0;
  if (sLower.includes('mắt mèo') || sLower.includes('cat eye')) {
    design = 'Mắt Mèo';
    designPts = 1;
  } else if (sLower.includes('búp bê') || sLower.includes('doll eye')) {
    design = 'Búp Bê';
    designPts = 1;
  }

  let color = 'Đen';
  let colorPts = 0;
  if (sLower.includes('màu') || sLower.includes('nâu') || sLower.includes('omber')) {
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
    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'ACTIVE_CC_STAFF_CONFIG' },
      });
      if (config && config.value) {
        const parsed = JSON.parse(config.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const ids = parsed.map((item) => Number(item.id || item)).filter((id) => !isNaN(id) && id > 0);
          if (ids.length > 0) return ids;
        }
      }
    } catch (err) {
      fastify.log.error(err as Error, 'Error reading ACTIVE_CC_STAFF_CONFIG');
    }

    // Query legacy DB for staff members with Client Consultant role or payroll
    try {
      const rows = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
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
    return [37790, 34295, 46092, 48026, 51659];
  }

  /**
   * Rule 1: CC Level Calculation Formula: Floor(prevPoints / 100) + 1
   */
  public static calculateCcLevel(points: number): number {
    const validPts = Math.max(0, points || 0);
    return Math.floor(validPts / 100) + 1;
  }

  /**
   * Rule 2: CC Bonus Calculation Formula: Level * 65đ.
   * If CC In != CC Out, CC Bonus is split 50/50.
   */
  public static calculateCcBonus(level: number, isSplit: boolean): number {
    const fullBonus = level * 65;
    return isSplit ? Math.round(fullBonus / 2) : fullBonus;
  }

  /**
   * 1. GET CC Xoay Report Data
   */
  public static async getCcXoayReport(fastify: FastifyInstance, filters: CcKpiFilters) {
    const { dateFrom, dateTo, storeId, consultantId, page = 1, limit = 3000 } = filters;
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
      consultantId && consultantId !== 'ALL' && isNaN(parsedId)
        ? String(consultantId).toLowerCase().trim()
        : '';

    // Query from beginning of the month (monthStartStr) to endStr to build accurate MTD points & Level
    const rows = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
      SELECT 
        os.id AS order_service_id,
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

    // Query staff_bonus grouped by order_service_id and user_id for fast lookup
    const osIds = rows.map((r) => r.order_service_id);
    const bonusRows = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
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
      WHERE sb.order_service_id IN (${osIds.join(',')})
      GROUP BY sb.order_service_id, sb.user_id
    `);

    const bonusMap = new Map<string, any>();
    for (const b of bonusRows) {
      bonusMap.set(`${b.order_service_id}_${b.user_id}`, b);
    }

    // Accumulate points per staff chronologically ASC from 1st of the month
    const staffPointsAccu: Record<string, number> = {};
    const filteredRecords: any[] = [];

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
        if (String(row.ccInName || '').toLowerCase().includes(filterStaffName)) {
          staffTargets.push({
            staffId: checkInId || checkOutId,
            staffName: String(row.ccInName || row.ccOutName || 'N/A'),
            avatar: String(row.checkinAvatar || row.checkoutAvatar || ''),
          });
        } else if (String(row.ccOutName || '').toLowerCase().includes(filterStaffName)) {
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

        const specs = parseServiceSpecs(row.serviceName || '');
        const calculatedLevel = this.calculateCcLevel(prevPoints);

        const ccInName = String(row.ccInName || '');
        const ccOutName = String(row.ccOutName || '');
        const isSplit = Boolean(ccInName && ccOutName && ccInName !== ccOutName);

        const dbCash = Number(sbData.dbCashBonus || 0);
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

  /**
   * 2. GET Realtime CC Leaderboard rankings
   */
  public static async getCcLeaderboard(fastify: FastifyInstance, filters: CcKpiFilters) {
    const { dateFrom, dateTo } = filters;
    const { start, end } = parseDateRange(dateFrom, dateTo);
    const activeCcIds = await this.getActiveCcStaffIds(fastify);

    const pad = (n: number) => String(n).padStart(2, '0');
    const startStr = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())} ${pad(start.getHours())}:${pad(start.getMinutes())}:${pad(start.getSeconds())}`;
    const endStr = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())} ${pad(end.getHours())}:${pad(end.getMinutes())}:${pad(end.getSeconds())}`;

    let activeCcFilter = '';
    if (activeCcIds && activeCcIds.length > 0) {
      activeCcFilter = ` AND sb.user_id IN (${activeCcIds.join(',')})`;
    }

    const staffStats = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
      `
      SELECT 
        sb.user_id as staffId,
        up.full_name as displayName,
        up.avatar as avatar,
        COUNT(DISTINCT sb.order_id) as totalCheckins,
        COUNT(DISTINCT sb.order_service_id) as totalServices,
        SUM(CASE WHEN sb.bonus_type = 'BonusPoint' THEN sb.bonus_amount ELSE 0 END) as totalPointsAccu,
        FLOOR(SUM(CASE WHEN sb.bonus_type = 'BonusPoint' THEN sb.bonus_amount ELSE 0 END) / 100) + 1 as level,
        SUM(CASE WHEN sb.bonus_type = 'Cash' THEN sb.bonus_amount ELSE 0 END) as totalConsultantBonus,
        COALESCE(combo.combo_revenue, 0) as comboRevenue,
        COALESCE(combo.combo_count, 0) as comboCount
      FROM \`staff_bonus\` sb
      JOIN \`user_profile\` up ON up.user_id = sb.user_id
      LEFT JOIN (
        SELECT 
          COALESCE(
            osc.check_in_staff_id,
            osc.check_out_staff_id,
            (SELECT os2.check_in_staff_id FROM \`order_service\` os2 WHERE os2.order_id = osc.order_id AND os2.check_in_staff_id IS NOT NULL LIMIT 1),
            (SELECT os2.check_out_staff_id FROM \`order_service\` os2 WHERE os2.order_id = osc.order_id AND os2.check_out_staff_id IS NOT NULL LIMIT 1),
            (SELECT os2.assigned_staff_id FROM \`order_service\` os2 WHERE os2.order_id = osc.order_id AND os2.assigned_staff_id IS NOT NULL LIMIT 1),
            o.assigned_staff_id,
            o.created_staff_id
          ) as staff_id,
          SUM(COALESCE(NULLIF(osc.total_price - osc.tax_amount, 0), osc.service_price - osc.discount_amount - osc.tax_amount, 0)) as combo_revenue,
          SUM(COALESCE(osc.quantity, 1)) as combo_count
        FROM \`order\` o
        JOIN \`order_service_combo\` osc ON osc.order_id = o.id
        WHERE o.order_state = 'Completed'
          AND o.booking_date_start >= '${startStr} 00:00:00'
          AND o.booking_date_start <= '${endStr} 23:59:59'
        GROUP BY staff_id
      ) combo ON combo.staff_id = sb.user_id
      WHERE sb.date_created >= ? AND sb.date_created <= ? ${activeCcFilter}
      GROUP BY sb.user_id, up.full_name, up.avatar
      ORDER BY totalPointsAccu DESC
      LIMIT 30
    `,
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

    const { start: startDate, end: endDate } = parseDateRange(dateFrom, dateTo);
    const pad = (n: number) => String(n).padStart(2, '0');
    const startStr = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`;
    const endStr = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`;

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

    const staffProfiles = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
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

    const staffExprOsc = `COALESCE(
      osc.check_in_staff_id,
      osc.check_out_staff_id,
      (SELECT os2.check_in_staff_id FROM \`order_service\` os2 WHERE os2.order_id = osc.order_id AND os2.check_in_staff_id IS NOT NULL LIMIT 1),
      (SELECT os2.check_out_staff_id FROM \`order_service\` os2 WHERE os2.order_id = osc.order_id AND os2.check_out_staff_id IS NOT NULL LIMIT 1),
      (SELECT os2.assigned_staff_id FROM \`order_service\` os2 WHERE os2.order_id = osc.order_id AND os2.assigned_staff_id IS NOT NULL LIMIT 1),
      o.assigned_staff_id,
      o.created_staff_id
    )`;

    const comboSalesQuery = `
      SELECT 
        DATE_FORMAT(o.booking_date_start, '%Y-%m-%d') as sale_date,
        ${staffExprOsc} as staff_id,
        SUM(COALESCE(NULLIF(osc.total_price - osc.tax_amount, 0), osc.service_price - osc.discount_amount - osc.tax_amount, 0)) as combo_sales,
        SUM(COALESCE(osc.quantity, 1)) as combo_count,
        UPPER(cs.client_store_key) as store_code
      FROM \`order\` o
      JOIN \`order_service_combo\` osc ON osc.order_id = o.id
      LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
      WHERE o.order_state = 'Completed'
        AND o.booking_date_start >= '${startStr} 00:00:00'
        AND o.booking_date_start <= '${endStr} 23:59:59'
        AND ${staffExprOsc} IN (${staffIdsListStr})
        ${storeFilterClause}
      GROUP BY sale_date, staff_id, store_code
    `;

    const staffExprOp = `COALESCE(
      op.created_staff_id,
      (SELECT os2.check_in_staff_id FROM \`order_service\` os2 WHERE os2.order_id = op.order_id AND os2.check_in_staff_id IS NOT NULL LIMIT 1),
      o.assigned_staff_id,
      o.created_staff_id
    )`;

    const productSalesQuery = `
      SELECT 
        DATE_FORMAT(o.booking_date_start, '%Y-%m-%d') as sale_date,
        ${staffExprOp} as staff_id,
        SUM(op.total_price) as product_sales,
        SUM(op.quantity) as product_count,
        UPPER(cs.client_store_key) as store_code
      FROM \`order\` o
      JOIN \`order_product\` op ON op.order_id = o.id
      LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
      WHERE o.order_state = 'Completed'
        AND o.booking_date_start >= '${startStr} 00:00:00'
        AND o.booking_date_start <= '${endStr} 23:59:59'
        AND ${staffExprOp} IN (${staffIdsListStr})
        ${storeFilterClause}
      GROUP BY sale_date, staff_id, store_code
    `;

    const staffExprOsSingle = `COALESCE(
      os.check_in_staff_id,
      os.check_out_staff_id,
      os.assigned_staff_id,
      o.assigned_staff_id,
      o.created_staff_id
    )`;

    const singleSalesQuery = `
      SELECT 
        DATE_FORMAT(o.booking_date_start, '%Y-%m-%d') as sale_date,
        ${staffExprOsSingle} as staff_id,
        SUM(os.total_price) as single_sales,
        UPPER(cs.client_store_key) as store_code
      FROM \`order\` o
      JOIN \`order_service\` os ON os.order_id = o.id
      LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
      WHERE o.order_state = 'Completed'
        AND o.booking_date_start >= '${startStr} 00:00:00'
        AND o.booking_date_start <= '${endStr} 23:59:59'
        AND ${staffExprOsSingle} IN (${staffIdsListStr})
        AND LOWER(COALESCE(os.service_group, '')) NOT LIKE '%combo%'
        AND LOWER(COALESCE(os.service_type, '')) NOT LIKE '%combo%'
        AND LOWER(COALESCE(os.service_group, '')) NOT LIKE '%product%'
        ${storeFilterClause}
      GROUP BY sale_date, staff_id, store_code
    `;

    const [comboRows, productRows, singleRows] = await Promise.all([
      fastify.prisma.legacy.$queryRawUnsafe<any[]>(comboSalesQuery),
      fastify.prisma.legacy.$queryRawUnsafe<any[]>(productSalesQuery),
      fastify.prisma.legacy.$queryRawUnsafe<any[]>(singleSalesQuery),
    ]);

    const salesMap = new Map<string, any>();
    const getMapKey = (dateStr: string, sId: number) => `${dateStr}_${sId}`;

    comboRows.forEach((r) => {
      const sId = Number(r.staff_id);
      const key = getMapKey(String(r.sale_date), sId);
      const prof = staffProfileMap.get(sId);
      salesMap.set(key, {
        id: `${key}_${r.store_code || 'MOS'}`,
        date: String(r.sale_date),
        user_id: sId,
        consultant_name: prof?.displayName || `CC ${sId}`,
        avatar: prof?.avatar || null,
        store_code: String(r.store_code || 'MOS'),
        combo_sales: Math.round(Number(r.combo_sales) || 0),
        combo_count: Number(r.combo_count) || 0,
        product_sales: 0,
        product_count: 0,
        single_sales: 0,
        debt_collected: 0,
        vat: 0,
        debt: 0,
        total_sales: 0,
        commission_rate_percent: 0,
        daily_bonus: 0,
      });
    });

    productRows.forEach((r) => {
      const sId = Number(r.staff_id);
      const key = getMapKey(String(r.sale_date), sId);
      const prof = staffProfileMap.get(sId);
      const existing = salesMap.get(key) || {
        id: `${key}_${r.store_code || 'MOS'}`,
        date: String(r.sale_date),
        user_id: sId,
        consultant_name: prof?.displayName || `CC ${sId}`,
        avatar: prof?.avatar || null,
        store_code: String(r.store_code || 'MOS'),
        combo_sales: 0,
        combo_count: 0,
        product_sales: 0,
        product_count: 0,
        single_sales: 0,
        debt_collected: 0,
        vat: 0,
        debt: 0,
        total_sales: 0,
        commission_rate_percent: 0,
        daily_bonus: 0,
      };
      existing.product_sales = Math.round(Number(r.product_sales) || 0);
      existing.product_count = Number(r.product_count) || 0;
      salesMap.set(key, existing);
    });

    singleRows.forEach((r) => {
      const sId = Number(r.staff_id);
      const key = getMapKey(String(r.sale_date), sId);
      const prof = staffProfileMap.get(sId);
      const existing = salesMap.get(key) || {
        id: `${key}_${r.store_code || 'MOS'}`,
        date: String(r.sale_date),
        user_id: sId,
        consultant_name: prof?.displayName || `CC ${sId}`,
        avatar: prof?.avatar || null,
        store_code: String(r.store_code || 'MOS'),
        combo_sales: 0,
        combo_count: 0,
        product_sales: 0,
        product_count: 0,
        single_sales: 0,
        debt_collected: 0,
        vat: 0,
        debt: 0,
        total_sales: 0,
        commission_rate_percent: 0,
        daily_bonus: 0,
      };
      existing.single_sales = Math.round(Number(r.single_sales) || 0);
      salesMap.set(key, existing);
    });

    const result = Array.from(salesMap.values()).map((rec) => {
      const total_sales = rec.combo_sales + rec.product_sales + rec.single_sales;
      rec.total_sales = total_sales;

      let matchedTierRate = 0;
      if (total_sales >= 30000000) {
        matchedTierRate = 3.0;
      } else if (total_sales >= 25000000) {
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
      rec.commission_rate_percent = matchedTierRate;
      rec.daily_bonus = Math.round((total_sales * matchedTierRate) / 100);
      return rec;
    });

    const summary = {
      totalComboSales: Math.round(result.reduce((sum, r) => sum + (r.combo_sales || 0), 0)),
      totalProductSales: Math.round(result.reduce((sum, r) => sum + (r.product_sales || 0) + (r.single_sales || 0), 0)),
      totalCcBonus: Math.round(result.reduce((sum, r) => sum + (r.daily_bonus || 0), 0)),
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

    const { start: startDate, end: endDate } = parseDateRange(dateFrom, dateTo);
    const pad = (n: number) => String(n).padStart(2, '0');
    const startStr = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())} 00:00:00`;
    const endStr = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())} 23:59:59`;

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

    const rows = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
      SELECT 
        st.user_id as staffId,
        up.full_name as displayName,
        up.avatar as avatar,
        COUNT(DISTINCT st.order_id) as tipOrderCount,
        SUM(st.tip_amount) as totalTipAmount,
        SUM(st.tip_amount * (st.tip_percentage / 100)) as totalCcTipBonus
      FROM \`staff_tip\` st
      JOIN \`order\` o ON st.order_id = o.id
      JOIN \`user_profile\` up ON up.user_id = st.user_id
      WHERE o.order_state = 'Completed'
        AND o.booking_date_start >= '${startStr}'
        AND o.booking_date_start <= '${endStr}'
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
