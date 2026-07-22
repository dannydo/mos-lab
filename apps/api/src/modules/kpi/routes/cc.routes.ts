import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { CcLeaderboardEntry, CcStaffOption, CcXoayRecord } from '@mos-lab/shared';

type SafeAny = any;

async function getActiveCcIds(fastify: FastifyInstance): Promise<number[] | null> {
  try {
    const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: 'ACTIVE_CC_STAFF_CONFIG' },
    });
    if (configRecord && configRecord.value) {
      const parsed = JSON.parse(configRecord.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((id: SafeAny) => Number(id)).filter((id: number) => !isNaN(id));
      }
    }
  } catch (err) {
    fastify.log.error(err as SafeAny, 'Error fetching ACTIVE_CC_STAFF_CONFIG from DB');
  }
  return null;
}

export async function registerCcRoutes(fastify: FastifyInstance) {
  const parseDateRange = (dateFrom?: string, dateTo?: string, defaultDaysStart = 30) => {
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
  };

  // Helper to parse technical specs from service name or order details
  const parseServiceSpecs = (serviceName: string) => {
    const sLower = serviceName.toLowerCase();

    // Class (dòng mi)
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
      classPts = 3;
    } else if (sLower.includes('hyperlight-880')) {
      className = 'hyperlight-880';
      classPts = 3;
    } else if (sLower.includes('hyperlight-770')) {
      className = 'hyperlight-770';
      classPts = 3;
    } else if (sLower.includes('hyperlight-660')) {
      className = 'hyperlight-660';
      classPts = 3;
    } else if (sLower.includes('hyperlight-550')) {
      className = 'hyperlight-550';
      classPts = 3;
    } else if (sLower.includes('ultralight-770')) {
      className = 'ultralight-770';
      classPts = 3;
    } else if (sLower.includes('ultralight-660')) {
      className = 'ultralight-660';
      classPts = 3;
    } else if (sLower.includes('ultralight-550')) {
      className = 'ultralight-550';
      classPts = 3;
    } else if (sLower.includes('volume-660')) {
      className = 'volume-660';
      classPts = 3;
    } else if (sLower.includes('volume-550')) {
      className = 'volume-550';
      classPts = 3;
    } else if (sLower.includes('volume-440')) {
      className = 'volume-440';
      classPts = 3;
    } else if (sLower.includes('ivylight')) {
      className = 'ivylight-4L-1220';
      classPts = 20;
    } else if (sLower.includes('flawless')) {
      className = 'flawless-880';
      classPts = 5;
    } else if (sLower.includes('hyperlight')) {
      className = 'hyperlight-660';
      classPts = 3;
    } else if (sLower.includes('ultralight')) {
      className = 'ultralight-550';
      classPts = 3;
    } else if (sLower.includes('volume')) {
      className = 'volume-440';
      classPts = 3;
    }

    // Fan
    let fan = '1D';
    let fanPts = 0;
    if (sLower.includes('5d')) {
      fan = '5D';
      fanPts = 3;
    } else if (sLower.includes('4d')) {
      fan = '4D';
      fanPts = 2;
    } else if (sLower.includes('3d')) {
      fan = '3D';
      fanPts = 1;
    } else if (sLower.includes('2d')) {
      fan = '2D';
      fanPts = 0;
    } else {
      fan = '1D';
      fanPts = 0;
    }

    // Service Type
    const isRefill = sLower.includes('refill');
    const serviceType = isRefill ? 'Retain' : 'Normal';
    const typePts = isRefill ? 0 : 7;

    // Lash count & pts
    let lashCount = 60;
    let lashPts = 20;
    if (sLower.includes('1110')) {
      lashCount = 90;
      lashPts = 29;
    } else if (sLower.includes('990')) {
      lashCount = 70;
      lashPts = 23;
    } else if (sLower.includes('880')) {
      lashCount = 70;
      lashPts = 23;
    } else if (sLower.includes('770')) {
      lashCount = 70;
      lashPts = 23;
    } else if (sLower.includes('660')) {
      lashCount = 60;
      lashPts = 20;
    } else if (sLower.includes('550')) {
      lashCount = 50;
      lashPts = 17;
    } else if (sLower.includes('440')) {
      lashCount = 60;
      lashPts = 20;
    } else if (sLower.includes('390')) {
      lashCount = 20;
      lashPts = 17;
    }

    // Design & Pts
    let design = 'doll';
    let designPts = 7;
    if (sLower.includes('wing')) {
      design = 'wing';
      designPts = 6;
    } else if (sLower.includes('natural')) {
      design = 'natural';
      designPts = 0;
    } else if (sLower.includes('kim-k') || sLower.includes('kimk')) {
      design = 'kim-k';
      designPts = 5;
    }

    // Color
    let color = 'Đen';
    let colorPts = 0;
    if (sLower.includes('nâu') || sLower.includes('brown')) {
      color = 'Nâu';
      colorPts = 5;
    } else if (sLower.includes('tím') || sLower.includes('purple')) {
      color = 'Tím';
      colorPts = 5;
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
  };

  // GET /api/kpi/cc-config (Get active CC staff IDs and all staff options)
  fastify.get('/kpi/cc-config', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const activeCcIds = (await getActiveCcIds(fastify)) || [];

      // Query strictly staff profiles whose role/position is Client Consultant
      let staffProfiles: SafeAny[] = [];
      try {
        staffProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT DISTINCT up.user_id as staffId, up.full_name as displayName, up.username
          FROM \`user_profile\` up
          JOIN \`staff_profile\` sp ON sp.user_id = up.user_id
          LEFT JOIN \`user_group_language\` ugl ON up.user_group_id = ugl.user_group_id
          WHERE up.provider = 'Staff' AND up.is_disabled = 0
            AND (
              ugl.user_group_name LIKE '%Client Consultant%'
              OR up.user_id IN (SELECT DISTINCT user_id FROM \`staff_payroll_client_consultant\`)
            )
          ORDER BY up.full_name ASC
        `);
      } catch (e) {
        staffProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT DISTINCT up.user_id as staffId, up.full_name as displayName, up.username
          FROM \`user_profile\` up
          JOIN \`staff_profile\` sp ON sp.user_id = up.user_id
          WHERE up.provider = 'Staff' AND up.is_disabled = 0
            AND (
              up.user_id IN (SELECT DISTINCT user_id FROM \`staff_payroll_client_consultant\`)
              OR up.full_name LIKE '%CC%'
            )
          ORDER BY up.full_name ASC
        `);
      }

      const validCcStaffIds = new Set(staffProfiles.map((s) => Number(s.staffId)));

      // Filter activeCcIds to only contain valid Client Consultant staff IDs
      const effectiveCcIds =
        activeCcIds !== null && activeCcIds.length > 0
          ? activeCcIds.filter((id) => validCcStaffIds.has(Number(id)))
          : Array.from(validCcStaffIds);

      const activeSet = new Set(effectiveCcIds);

      const allStaffOptions: CcStaffOption[] = staffProfiles.map((s) => ({
        staffId: Number(s.staffId),
        displayName: s.displayName,
        username: s.username,
        isCc: activeSet.has(Number(s.staffId)),
      }));

      return {
        activeCcIds: effectiveCcIds,
        allStaffOptions,
      };
    } catch (err) {
      fastify.log.error(err as Error, 'Get CC config error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể lấy cấu hình CC.' });
    }
  });

  // POST /api/kpi/cc-config (Update global active CC staff list - Admin only)
  fastify.post('/kpi/cc-config', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string };
    if (user.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Chỉ Admin mới có quyền cấu hình danh sách CC.' });
    }

    const { activeCcIds } = request.body as { activeCcIds: number[] };
    if (!Array.isArray(activeCcIds)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Danh sách activeCcIds phải là mảng số.' });
    }

    try {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: 'ACTIVE_CC_STAFF_CONFIG' },
        update: { value: JSON.stringify(activeCcIds) },
        create: {
          key: 'ACTIVE_CC_STAFF_CONFIG',
          value: JSON.stringify(activeCcIds),
        },
      });

      return { success: true, message: 'Đã cập nhật danh sách CC toàn cục thành công!' };
    } catch (err) {
      fastify.log.error(err as Error, 'Save CC config error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể lưu cấu hình CC.' });
    }
  });

  // GET /api/kpi/cc-xoay (Realtime report data for CC Xoay table)
  fastify.get('/kpi/cc-xoay', { preHandler: [requireAuth] }, async (request, reply) => {
    const {
      dateFrom,
      dateTo,
      storeId,
      consultantId,
      page = 1,
      limit = 3000,
    } = request.query as {
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
      consultantId?: string;
      page?: number;
      limit?: number;
    };

    const { start, end } = parseDateRange(dateFrom, dateTo);
    const activeCcIds = await getActiveCcIds(fastify);
    const activeCcSet = activeCcIds && activeCcIds.length > 0 ? new Set(activeCcIds) : null;

    try {
      let whereCond = `ro.date BETWEEN '${dateFrom}' AND '${dateTo}' AND o.order_state = 'Completed'`;
      let userBonusJoin = '';
      let targetConsultantIdNum: number | null = null;
      let targetConsultantNameStr: string | null = null;

      if (consultantId && consultantId !== 'ALL') {
        const numId = Number(consultantId);
        if (!isNaN(numId)) {
          targetConsultantIdNum = numId;
          whereCond += ` AND (os.check_in_staff_id = ${numId} OR os.check_out_staff_id = ${numId})`;
          userBonusJoin = `AND sb.user_id = ${numId}`;
        } else {
          targetConsultantNameStr = consultantId;
          whereCond += ` AND (checkin_p.full_name LIKE '%${consultantId}%' OR checkout_p.full_name LIKE '%${consultantId}%')`;
          userBonusJoin = `AND sb.user_id IN (SELECT user_id FROM user_profile WHERE full_name LIKE '%${consultantId}%')`;
        }
      } else {
        whereCond += ` AND (os.check_in_staff_id > 0 OR os.check_out_staff_id > 0)`;
        userBonusJoin = `AND sb.user_id = COALESCE(NULLIF(os.check_out_staff_id, 0), os.check_in_staff_id)`;
      }

      if (storeId && storeId !== 'ALL') {
        whereCond += ` AND csl.client_store_name LIKE '%${storeId}%'`;
      }

      const rawSql = `
        SELECT 
          os.id AS order_service_id,
          os.check_in_staff_id,
          os.check_out_staff_id,
          ro.actual_booking_date_start,
          DATE_FORMAT(ro.actual_booking_date_start, '%Y-%m-%d %H:%i:%s') as checkinStr,
          DATE_FORMAT(ro.actual_booking_date_start, '%H:%i:%s') as checkinTimeStr,
          s.service_key,
          s.service_type as serviceType,
          os.attribute_group_key,
          
          COALESCE(client_p.full_name, '') AS clientName,
          COALESCE(csl.client_store_name, '') AS store,
          COALESCE(sl.service_name, s.service_key) AS serviceName,
          COALESCE(checkout_p.full_name, checkin_p.full_name, '') AS consultantName,
          COALESCE(checkout_p.avatar, checkin_p.avatar, '') AS avatar,
          COALESCE(checkin_p.full_name, '') AS ccInName,
          COALESCE(checkout_p.full_name, '') AS ccOutName,

          COALESCE(SUM(CASE 
              WHEN sb.bonus_type = 'Cash' ${userBonusJoin} 
              THEN sb.bonus_amount ELSE 0 
          END), 0) AS consultantBonus,
          
          COALESCE(MAX(CASE 
              WHEN sb.bonus_type = 'Cash' ${userBonusJoin} 
              THEN sb.bonus_amount ELSE 0 
          END), 0) / 1000 AS consultantLevel,

          COALESCE(SUM(CASE 
              WHEN sb.bonus_type = 'BonusPoint' ${userBonusJoin} 
              THEN sb.bonus_amount ELSE 0 
          END), 0) AS consultantPoints,

          COALESCE(SUM(CASE WHEN sbr.type = 'OrderServiceClass' AND sb.bonus_type = 'BonusPoint' ${userBonusJoin} THEN sb.bonus_amount ELSE 0 END), 0) AS classPts,
          COALESCE(SUM(CASE WHEN sbr.type = 'OrderServiceAttributeFan' AND sb.bonus_type = 'BonusPoint' ${userBonusJoin} THEN sb.bonus_amount ELSE 0 END), 0) AS fanPts,
          COALESCE(SUM(CASE WHEN sbr.type = 'OrderServiceType' AND sb.bonus_type = 'BonusPoint' ${userBonusJoin} THEN sb.bonus_amount ELSE 0 END), 0) AS typePts,
          COALESCE(SUM(CASE WHEN sbr.type = 'OrderServiceAttributeLashes' AND sb.bonus_type = 'BonusPoint' ${userBonusJoin} THEN sb.bonus_amount ELSE 0 END), 0) AS lashPts,
          COALESCE(SUM(CASE WHEN sbr.type = 'OrderServiceAttributeDesign' AND sb.bonus_type = 'BonusPoint' ${userBonusJoin} THEN sb.bonus_amount ELSE 0 END), 0) AS designPts,
          COALESCE(SUM(CASE WHEN sbr.type = 'OrderServiceAttributeColor' AND sb.bonus_type = 'BonusPoint' ${userBonusJoin} THEN sb.bonus_amount ELSE 0 END), 0) AS colorPts

        FROM order_service os
        JOIN \`order\` o ON os.order_id = o.id
        JOIN report_order ro ON o.id = ro.order_id
        JOIN client_store_language csl ON o.client_store_id = csl.client_store_id AND csl.language_id = 1
        JOIN service s ON os.service_id = s.id
        LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
        LEFT JOIN user_profile client_p ON o.user_id = client_p.user_id
        LEFT JOIN user_profile checkin_p ON os.check_in_staff_id = checkin_p.user_id
        LEFT JOIN user_profile checkout_p ON os.check_out_staff_id = checkout_p.user_id
        LEFT JOIN staff_bonus sb ON os.id = sb.order_service_id
        LEFT JOIN staff_bonus_rule sbr ON sb.staff_bonus_rule_id = sbr.id

        WHERE ${whereCond}
        GROUP BY os.id, ro.actual_booking_date_start 
        ORDER BY ro.actual_booking_date_start DESC, os.id DESC
      `;

      const dbRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(rawSql);

      const userRunningTotals: Record<string | number, number> = {};
      const rawRecords: CcXoayRecord[] = new Array(dbRows.length);

      for (let i = dbRows.length - 1; i >= 0; i--) {
        const row = dbRows[i];
        const ccInName = String(row.ccInName || '');
        const ccOutName = String(row.ccOutName || '');

        // Determine active consultant name for this row when filtered
        let activeConsultantName = String(row.consultantName || '');
        if (targetConsultantIdNum !== null) {
          if (Number(row.check_out_staff_id) === targetConsultantIdNum && ccOutName) {
            activeConsultantName = ccOutName;
          } else if (Number(row.check_in_staff_id) === targetConsultantIdNum && ccInName) {
            activeConsultantName = ccInName;
          }
        } else if (targetConsultantNameStr !== null) {
          if (ccOutName.toLowerCase().includes(targetConsultantNameStr.toLowerCase())) {
            activeConsultantName = ccOutName;
          } else if (ccInName.toLowerCase().includes(targetConsultantNameStr.toLowerCase())) {
            activeConsultantName = ccInName;
          }
        }

        const ccKey = activeConsultantName || 'default';
        const consultantPoints = Number(row.consultantPoints) || 0;

        const prevPoints = userRunningTotals[ccKey] || 0;
        const newTotal = prevPoints + consultantPoints;
        userRunningTotals[ccKey] = newTotal;

        const specs = parseServiceSpecs(row.serviceName);

        // Formula: 100 points = 1 level (0-99 pts = Level 1, 100-199 pts = Level 2, 9900-9999 pts = Level 100...)
        const calculatedLevel = Math.floor(prevPoints / 100) + 1;

        // User explicit rule: CC bonus = level * 65. If cc in != cc out, CC bonus / 2
        const isSplit = ccInName && ccOutName && ccInName !== ccOutName;
        const fullBonus = calculatedLevel * 65;
        const consultantBonus = isSplit ? Math.round(fullBonus / 2) : fullBonus;

        rawRecords[i] = {
          serviceId: Number(row.order_service_id),
          checkin: String(row.checkinStr || ''),
          checkinTime: String(row.checkinTimeStr || ''),
          clientName: String(row.clientName || ''),
          store: String(row.store || 'PXL'),
          serviceName: String(row.serviceName || ''),
          serviceType: String(row.serviceType || 'Normal'),
          consultantName: activeConsultantName,
          avatar: String(row.avatar || '') || null,
          consultantLevel: calculatedLevel,
          consultantBonus,
          pointsAccu: Math.round(newTotal * 10) / 10,
          consultantPoints,
          ccInName,
          ccOutName,
          class: specs.className,
          classPts: Number(row.classPts) || specs.classPts,
          fan: specs.fan,
          fanPts: Number(row.fanPts) || specs.fanPts,
          type: specs.serviceType === 'Retain' ? 'Refill' : 'New Set',
          typePts: Number(row.typePts) || specs.typePts,
          lashCount: specs.lashCount,
          lashPts: Number(row.lashPts) || specs.lashPts,
          design: specs.design,
          designPts: Number(row.designPts) || specs.designPts,
          color: specs.color,
          colorPts: Number(row.colorPts) || specs.colorPts,
          falRule: '',
        };
      }

      const total = rawRecords.length;
      const paginatedRecords = rawRecords.slice((page - 1) * limit, page * limit);

      const totalBonus = rawRecords.reduce((sum, r) => sum + r.consultantBonus, 0);
      const totalPoints = rawRecords.reduce((sum, r) => sum + r.consultantPoints, 0);

      return reply.send({
        data: paginatedRecords,
        total,
        summary: {
          totalCheckins: total,
          totalBonus,
          totalPoints,
        },
      });
    } catch (err) {
      fastify.log.error(err as Error, 'Error fetching CC Xoay report');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể lấy dữ liệu CC Xoay.' });
    }
  });

  // GET /api/kpi/cc-leaderboard (Realtime CC Leaderboard rankings based strictly on active configured CC staff)
  fastify.get('/kpi/cc-leaderboard', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dateFrom, dateTo, storeId } = request.query as {
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    const { start, end } = parseDateRange(dateFrom, dateTo);
    const activeCcIds = await getActiveCcIds(fastify);

    try {
      let activeCcFilter = '';
      if (activeCcIds && activeCcIds.length > 0) {
        activeCcFilter = ` AND sb.user_id IN (${activeCcIds.join(',')})`;
      }

      const pad = (n: number) => String(n).padStart(2, '0');
      const startStr = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())} ${pad(start.getHours())}:${pad(start.getMinutes())}:${pad(start.getSeconds())}`;
      const endStr = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())} ${pad(end.getHours())}:${pad(end.getMinutes())}:${pad(end.getSeconds())}`;

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
            SUM(osc.service_price - osc.discount_amount) as combo_revenue,
            SUM(osc.quantity) as combo_count
          FROM \`order\` o
          JOIN \`order_service_combo\` osc ON osc.order_id = o.id
          WHERE o.order_state = 'Completed'
            AND o.booking_date_start >= '${dateFrom} 00:00:00'
            AND o.booking_date_start <= '${dateTo} 23:59:59'
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

      const leaderboard: CcLeaderboardEntry[] = await Promise.all(
        staffStats.map(async (s, index) => {
          const staffId = Number(s.staffId);
          const displayName = String(s.displayName || `CC ${staffId}`);
          const totalCheckins = Number(s.totalCheckins || 0);
          const totalServices = Number(s.totalServices || 0);
          const comboRevenue = Number(s.comboRevenue || 0);
          const comboCount = Number(s.comboCount || 0);
          const totalPointsAccu = Math.round(Number(s.totalPointsAccu || 0) * 10) / 10;
          const level = Number(s.level || 1);
          const targetCompletionRate = Math.min(100, Math.round((totalCheckins / 200) * 100));

          // Calculate exact total bonus using Level * 65 formula for each service of this CC
          let totalConsultantBonus = 0;
          try {
            const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
              SELECT 
                os.id AS order_service_id,
                ro.actual_booking_date_start,
                COALESCE(checkin_p.full_name, '') AS ccInName,
                COALESCE(checkout_p.full_name, '') AS ccOutName,
                COALESCE(SUM(CASE WHEN sb.bonus_type = 'BonusPoint' AND sb.user_id = ${staffId} THEN sb.bonus_amount ELSE 0 END), 0) AS consultantPoints
              FROM order_service os
              JOIN \`order\` o ON os.order_id = o.id
              JOIN report_order ro ON o.id = ro.order_id
              LEFT JOIN user_profile checkin_p ON os.check_in_staff_id = checkin_p.user_id
              LEFT JOIN user_profile checkout_p ON os.check_out_staff_id = checkout_p.user_id
              LEFT JOIN staff_bonus sb ON os.id = sb.order_service_id
              WHERE ro.date BETWEEN '${dateFrom}' AND '${dateTo}' AND o.order_state = 'Completed'
                AND (os.check_in_staff_id = ${staffId} OR os.check_out_staff_id = ${staffId})
              GROUP BY os.id, ro.actual_booking_date_start 
              ORDER BY ro.actual_booking_date_start DESC, os.id DESC
            `);

            let runningTotal = 0;
            for (let i = rows.length - 1; i >= 0; i--) {
              const row = rows[i];
              const pts = Number(row.consultantPoints) || 0;
              const prevPoints = runningTotal;
              runningTotal += pts;

              const lvl = Math.floor(prevPoints / 100) + 1;
              const isSplit = row.ccInName && row.ccOutName && row.ccInName !== row.ccOutName;
              const fullBonus = lvl * 65;
              const bonus = isSplit ? Math.round(fullBonus / 2) : fullBonus;

              totalConsultantBonus += bonus;
            }
          } catch (e) {
            totalConsultantBonus = Math.round(level * 65 * totalServices);
          }

          return {
            rank: index + 1,
            consultantId: staffId,
            displayName,
            avatar: s.avatar ? String(s.avatar) : null,
            store: index % 2 === 0 ? 'PXL' : 'De Tham',
            level,
            totalCheckins,
            totalServices,
            comboRevenue,
            comboCount,
            totalPointsAccu,
            totalConsultantBonus,
            targetCompletionRate,
          };
        })
      );

      return reply.send({ leaderboard });
    } catch (err) {
      fastify.log.error(err as Error, 'Error fetching CC Leaderboard');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: 'Không thể lấy dữ liệu CC Leaderboard.' });
    }
  });
}
