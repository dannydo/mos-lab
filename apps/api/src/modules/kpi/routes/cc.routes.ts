import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { CcLeaderboardEntry, CcStaffOption, CcXoayRecord } from '@mos-lab/shared';
import { CcKpiService } from '../services/cc-kpi.service.js';

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

  const formatStoreCode = (store?: string | null): string => {
    if (!store) return 'PXL';
    const s = String(store).toUpperCase().trim();
    if (s.includes('ESTELLA') || s.includes('EP')) return 'EP';
    if (s.includes('THAM') || s.includes('DE') || s.includes('DT')) return 'DT';
    if (s.includes('PXL') || s.includes('PHAN')) return 'PXL';
    return s;
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
    if (sLower.includes('5d') || sLower.includes('1110')) {
      fan = '5D';
      fanPts = 3;
    } else if (
      sLower.includes('4d') ||
      sLower.includes('flawless') ||
      sLower.includes('volume') ||
      sLower.includes('ivylight')
    ) {
      fan = '4D';
      fanPts = 2;
    } else if (sLower.includes('3d') || sLower.includes('hyperlight')) {
      fan = '3D';
      fanPts = 1;
    } else if (sLower.includes('2d') || sLower.includes('ultralight')) {
      fan = '2D';
      fanPts = 0;
    } else if (sLower.includes('classic')) {
      fan = '1D';
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
    const query = request.query as {
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
      consultantId?: string;
      page?: number;
      limit?: number;
    };

    try {
      const result = await CcKpiService.getCcXoayReport(fastify, query);
      return reply.send(result);
    } catch (err) {
      fastify.log.error(err as Error, 'Error fetching CC Xoay report');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể lấy dữ liệu CC Xoay.' });
    }
  });

  // GET /api/kpi/cc-leaderboard (Realtime CC Leaderboard rankings based strictly on active configured CC staff)
  fastify.get('/kpi/cc-leaderboard', { preHandler: [requireAuth] }, async (request, reply) => {
    const query = request.query as {
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    try {
      const result = await CcKpiService.getCcLeaderboard(fastify, query);
      return reply.send({ leaderboard: result.data });
    } catch (err) {
      fastify.log.error(err as Error, 'Error fetching CC Leaderboard');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: 'Không thể lấy dữ liệu CC Leaderboard.' });
    }
  });
}
