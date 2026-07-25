import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { CvConfigResponse, CvStaffOption, CvXoayRecord, CvXoayReportResponse, SafeAny } from '@mos-lab/shared';

async function getActiveCvIds(fastify: FastifyInstance): Promise<number[] | null> {
  try {
    const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: 'ACTIVE_CV_STAFF_CONFIG' },
    });
    if (configRecord && configRecord.value) {
      const parsed = JSON.parse(configRecord.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((id: SafeAny) => Number(id)).filter((id: number) => !isNaN(id));
      }
    }
  } catch (err) {
    fastify.log.error(err as SafeAny, 'Error fetching ACTIVE_CV_STAFF_CONFIG from DB');
  }
  return null;
}

export async function registerCvRoutes(fastify: FastifyInstance) {
  // GET /api/kpi/cv-xoay (Realtime technician report)
  fastify.get('/kpi/cv-xoay', { preHandler: [requireAuth] }, async (request, reply) => {
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

    const startStr = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    const endStr = dateTo || new Date().toLocaleDateString('en-CA');

    const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
    const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

    const activeCvIds = await getActiveCvIds(fastify);

    try {
      let whereCond = `ro.date BETWEEN '${startPart}' AND '${endPart}' AND o.order_state = 'Completed' AND os.assigned_staff_id > 0`;

      if (consultantId && consultantId !== 'ALL') {
        const numId = Number(consultantId);
        if (!isNaN(numId)) {
          whereCond += ` AND os.assigned_staff_id = ${numId}`;
        } else {
          whereCond += ` AND tech_p.full_name LIKE '%${consultantId}%'`;
        }
      } else if (activeCvIds && activeCvIds.length > 0) {
        whereCond += ` AND os.assigned_staff_id IN (${activeCvIds.join(',')})`;
      }

      if (storeId && storeId !== 'ALL') {
        whereCond += ` AND csl.client_store_name LIKE '%${storeId}%'`;
      }

      const rawSql = `
        SELECT 
          os.id AS orderServiceId,
          os.assigned_staff_id AS techId,
          ro.actual_booking_date_start,
          DATE_FORMAT(ro.actual_booking_date_start, '%Y-%m-%d %H:%i:%s') as checkin,
          DATE_FORMAT(ro.actual_booking_date_start, '%H:%i:%s') as checkinTime,
          s.service_key,
          COALESCE(s.service_type, 'Normal') as serviceType,
          os.attribute_group_key,
          
          COALESCE(client_p.full_name, '') AS clientName,
          COALESCE(csl.client_store_name, '') AS store,
          COALESCE(sl.service_name, s.service_key) AS serviceName,
          COALESCE(tech_p.full_name, '') AS techName,
          COALESCE(tech_p.avatar, '') AS avatar,
          COALESCE(checkin_p.full_name, '') AS ccInName,
          COALESCE(checkout_p.full_name, '') AS ccOutName,

          COALESCE(sb_agg.techBonus, 0) AS techBonus,
          COALESCE(sb_agg.techLevel, 0) AS techLevel,
          COALESCE(sb_agg.techPoints, 0) AS techPoints,
          COALESCE(sb_agg.classPts, 0) AS classPts,
          COALESCE(sb_agg.fanPts, 0) AS fanPts,
          COALESCE(sb_agg.typePts, 0) AS typePts,
          COALESCE(sb_agg.lashPts, 0) AS lashPts,
          COALESCE(sb_agg.designPts, 0) AS designPts,
          COALESCE(sb_agg.colorPts, 0) AS colorPts,

          CASE 
              WHEN os.next_fix_order_service_id > 0 THEN 'Fix'
              WHEN os.next_adjust_order_service_id > 0 THEN 'Adjust'
              WHEN s.service_type IN ('Fix', 'Adjust', 'Log') THEN s.service_type
              WHEN sb_agg.falRule IS NOT NULL AND sb_agg.falRule != '' THEN sb_agg.falRule
              ELSE '' 
          END AS falRule

        FROM order_service os
        JOIN \`order\` o ON os.order_id = o.id
        JOIN report_order ro ON o.id = ro.order_id
        JOIN client_store_language csl ON o.client_store_id = csl.client_store_id AND csl.language_id = 1
        JOIN service s ON os.service_id = s.id
        LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
        LEFT JOIN user_profile tech_p ON os.assigned_staff_id = tech_p.user_id
        LEFT JOIN user_profile client_p ON o.user_id = client_p.user_id
        LEFT JOIN user_profile checkin_p ON os.check_in_staff_id = checkin_p.user_id
        LEFT JOIN user_profile checkout_p ON os.check_out_staff_id = checkout_p.user_id
        LEFT JOIN (
          SELECT 
            sb.order_service_id,
            sb.user_id,
            SUM(CASE WHEN sb.bonus_type = 'Cash' THEN sb.bonus_amount ELSE 0 END) AS techBonus,
            MAX(CASE WHEN sb.bonus_type = 'Cash' THEN sb.bonus_amount ELSE 0 END) / 1000 AS techLevel,
            SUM(CASE WHEN sb.bonus_type = 'BonusPoint' THEN sb.bonus_amount ELSE 0 END) AS techPoints,
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
          WHERE ro.date BETWEEN '${startPart}' AND '${endPart}'
            AND o.order_state = 'Completed'
          GROUP BY sb.order_service_id, sb.user_id
        ) sb_agg ON os.id = sb_agg.order_service_id AND os.assigned_staff_id = sb_agg.user_id

        WHERE ${whereCond}
        ORDER BY ro.actual_booking_date_start ASC, os.id ASC
      `;

      const dbRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(rawSql);

      // Accumulate points per technician chronologically (from oldest to newest)
      const pointsAccuMap = new Map<number, number>();

      const recordsAsc: CvXoayRecord[] = dbRows.map((r) => {
        const techId = Number(r.techId || 0);
        const techPoints = Math.round(Number(r.techPoints || 0));
        const prevAccu = pointsAccuMap.get(techId) || 0;
        const newAccu = prevAccu + techPoints;
        pointsAccuMap.set(techId, newAccu);

        const techLevel = Math.floor(prevAccu / 100) + 1;

        return {
          orderServiceId: Number(r.orderServiceId),
          checkin: String(r.checkin || ''),
          checkinTime: String(r.checkinTime || ''),
          clientName: String(r.clientName || ''),
          store: String(r.store || 'PXL'),
          serviceName: String(r.serviceName || ''),
          serviceType: String(r.serviceType || 'Normal'),
          techName: String(r.techName || ''),
          avatar: String(r.avatar || '') || null,
          techLevel,
          techBonus: Math.round(Number(r.techBonus || 0)),
          pointsAccu: newAccu,
          techPoints,
          ccInName: String(r.ccInName || ''),
          ccOutName: String(r.ccOutName || ''),
          classPts: Math.round(Number(r.classPts || 0)),
          fanPts: Math.round(Number(r.fanPts || 0)),
          typePts: Math.round(Number(r.typePts || 0)),
          lashPts: Math.round(Number(r.lashPts || 0)),
          designPts: Math.round(Number(r.designPts || 0)),
          colorPts: Math.round(Number(r.colorPts || 0)),
          falRule: String(r.falRule || ''),
        };
      });

      // Reverse so newest records are at top
      const recordsDesc = [...recordsAsc].reverse();

      const totalBonus = recordsDesc.reduce((sum, r) => sum + r.techBonus, 0);
      const totalPoints = recordsDesc.reduce((sum, r) => sum + r.techPoints, 0);

      const paginatedData = recordsDesc.slice((page - 1) * limit, page * limit);

      const response: CvXoayReportResponse = {
        data: paginatedData,
        total: recordsDesc.length,
        summary: {
          totalServices: recordsDesc.length,
          totalBonus,
          totalPoints,
        },
      };

      return reply.send(response);
    } catch (err) {
      fastify.log.error(err as Error, 'Error fetching CV Xoay report');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể lấy dữ liệu CV Xoay.' });
    }
  });

  // GET /api/kpi/cv-config (Fetch active CV staff IDs and all technician staff options)
  fastify.get('/kpi/cv-config', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const activeCvIds = (await getActiveCvIds(fastify)) || [47510, 48026, 46092, 37790, 34295, 51659];

      let dbStaff: SafeAny[] = [];
      try {
        const rawSql = `
          SELECT DISTINCT
            up.user_id as staffId,
            up.full_name as displayName,
            up.username as username,
            UPPER(COALESCE(cs.client_store_key, 'PXL')) as store
          FROM user_profile up
          JOIN staff_profile sp ON sp.user_id = up.user_id
          LEFT JOIN client_store cs ON cs.id = up.client_store_id
          LEFT JOIN user_group_language ugl ON up.user_group_id = ugl.user_group_id AND ugl.language_id = 1
          WHERE up.provider = 'Staff' 
            AND up.is_disabled = 0
            AND up.full_name IS NOT NULL 
            AND TRIM(up.full_name) != ''
            AND (
              ugl.user_group_name LIKE '%Technician%' 
              OR ugl.user_group_name LIKE '%Chuyên viên%' 
              OR ugl.user_group_name LIKE '%Kỹ thuật%'
              OR ugl.user_group_name LIKE '%Thợ%'
              OR up.user_id IN (SELECT DISTINCT assigned_staff_id FROM order_service WHERE assigned_staff_id > 0)
            )
            AND NOT (
              ugl.user_group_name LIKE '%Client Consultant%'
              OR ugl.user_group_name LIKE '%Tư Vấn%'
              OR ugl.user_group_name LIKE '%Telesales%'
              OR ugl.user_group_name LIKE '%Online Consultant%'
              OR up.user_id IN (SELECT DISTINCT user_id FROM staff_payroll_client_consultant)
              OR up.full_name LIKE '% CC%'
              OR up.full_name LIKE '%(CC)%'
            )
          ORDER BY up.full_name ASC
        `;
        dbStaff = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(rawSql);
      } catch (sqlErr) {
        fastify.log.warn(sqlErr as SafeAny, 'Fallback querying technician user_profile');
        const fallbackSql = `
          SELECT DISTINCT
            up.user_id as staffId,
            up.full_name as displayName,
            up.username as username,
            'PXL' as store
          FROM user_profile up
          JOIN staff_profile sp ON sp.user_id = up.user_id
          LEFT JOIN user_group_language ugl ON up.user_group_id = ugl.user_group_id AND ugl.language_id = 1
          WHERE up.provider = 'Staff' 
            AND up.is_disabled = 0
            AND up.full_name IS NOT NULL 
            AND TRIM(up.full_name) != ''
            AND up.user_id IN (SELECT DISTINCT assigned_staff_id FROM order_service WHERE assigned_staff_id > 0)
            AND NOT (
              ugl.user_group_name LIKE '%Client Consultant%'
              OR ugl.user_group_name LIKE '%Tư Vấn%'
              OR ugl.user_group_name LIKE '%Telesales%'
              OR ugl.user_group_name LIKE '%Online Consultant%'
              OR up.user_id IN (SELECT DISTINCT user_id FROM staff_payroll_client_consultant)
              OR up.full_name LIKE '% CC%'
              OR up.full_name LIKE '%(CC)%'
            )
          ORDER BY up.full_name ASC
        `;
        dbStaff = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(fallbackSql);
      }

      const activeSet = new Set(activeCvIds);

      const validStaff = dbStaff.filter((s) => s.displayName && String(s.displayName).trim() !== '');

      const allStaffOptions: CvStaffOption[] = validStaff.map((s) => ({
        staffId: Number(s.staffId),
        displayName: String(s.displayName || ''),
        username: String(s.username || ''),
        isCv: activeSet.has(Number(s.staffId)),
        store: String(s.store || 'PXL'),
      }));

      const response: CvConfigResponse = {
        activeCvIds,
        allStaffOptions,
      };

      return reply.send(response);
    } catch (err) {
      fastify.log.error(err as Error, 'Error fetching CV staff config');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể lấy cấu hình CV staff.' });
    }
  });

  // POST /api/kpi/cv-config (Save ACTIVE_CV_STAFF_CONFIG)
  fastify.post('/kpi/cv-config', { preHandler: [requireAuth] }, async (request, reply) => {
    const { activeCvIds } = request.body as { activeCvIds: number[] };

    if (!Array.isArray(activeCvIds)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'activeCvIds phải là một mảng.' });
    }

    try {
      const cleanIds = activeCvIds.map((id) => Number(id)).filter((id) => !isNaN(id));
      const jsonValue = JSON.stringify(cleanIds);

      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: 'ACTIVE_CV_STAFF_CONFIG' },
        update: { value: jsonValue, updatedAt: new Date() },
        create: { key: 'ACTIVE_CV_STAFF_CONFIG', value: jsonValue },
      });

      return reply.send({ success: true, activeCvIds: cleanIds });
    } catch (err) {
      fastify.log.error(err as Error, 'Save CV config error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể lưu cấu hình CV.' });
    }
  });
}
