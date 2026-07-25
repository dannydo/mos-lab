import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { CcStaffOption, SafeAny } from '@mos-lab/shared';
import { CcKpiService } from '../services/cc-kpi.service.js';

async function getActiveCcIds(fastify: FastifyInstance): Promise<number[] | null> {
  try {
    const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: 'ACTIVE_CC_STAFF_CONFIG' },
    });
    if (configRecord && configRecord.value) {
      const parsed = JSON.parse(configRecord.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((id) => Number(id)).filter((id) => !isNaN(id));
      }
    }
  } catch (err) {
    fastify.log.error(err as SafeAny, 'Error fetching ACTIVE_CC_STAFF_CONFIG from DB');
  }
  return null;
}

export async function registerCcRoutes(fastify: FastifyInstance) {
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
      } catch {
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
