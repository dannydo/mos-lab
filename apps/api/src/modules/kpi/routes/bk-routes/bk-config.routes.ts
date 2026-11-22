import { FastifyInstance } from 'fastify';
import { BkSalaryConfig, SafeAny } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';
import { getBkSalaryConfig } from '../../services/bk-salary.service.js';
import { TeamService } from '../../../teams/team.service.js';

export function registerBkConfigRoutes(fastify: FastifyInstance) {
  // 6. Config GET & POST
  fastify.get('/kpi/bk/config', { preHandler: [requireAuth] }, async (_request, reply) => {
    try {
      const config = await getBkSalaryConfig(fastify);

      const allStaffProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT 
          up.user_id as staffId,
          up.full_name as displayName,
          up.username as username,
          UPPER(COALESCE(cs.client_store_key, 'PXL')) as store
        FROM \`user_profile\` up
        LEFT JOIN \`client_store\` cs ON cs.id = up.client_store_id
        WHERE up.is_disabled = 0 
          AND up.client_business_id = 1
          AND (
            up.user_group_id IN (2, 31, 32, 45)
            OR FIND_IN_SET('2', up.access_user_group_ids)
            OR FIND_IN_SET('31', up.access_user_group_ids)
            OR FIND_IN_SET('32', up.access_user_group_ids)
            OR FIND_IN_SET('45', up.access_user_group_ids)
          )
        ORDER BY up.full_name ASC
      `);

      const activeSet = new Set(config.activeBkIds);

      const allStaffOptions = allStaffProfiles.map((s) => ({
        staffId: Number(s.staffId),
        displayName: String(s.displayName || `Staff #${s.staffId}`),
        username: s.username ? String(s.username) : undefined,
        isBk: activeSet.has(Number(s.staffId)),
        store: String(s.store || 'PXL'),
      }));

      return {
        activeBkIds: config.activeBkIds,
        config,
        allStaffOptions,
      };
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK config');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải cấu hình BK.' });
    }
  });

  fastify.post('/kpi/bk/config', { preHandler: [requireAuth] }, async (request, reply) => {
    const { activeBkIds, config, workDaysOverrides } = request.body as {
      activeBkIds?: number[];
      config?: Partial<BkSalaryConfig>;
      workDaysOverrides?: Record<string, number>;
    };

    try {
      if (activeBkIds && Array.isArray(activeBkIds)) {
        const bkTeam = await fastify.prisma.crm.crmTeam.findUnique({ where: { code: 'BK' } });
        if (bkTeam) {
          await TeamService.updateTeamMembers(fastify, bkTeam.id, activeBkIds);
        }

        await fastify.prisma.crm.crmConfig.upsert({
          where: { key: 'ACTIVE_BK_STAFF_CONFIG' },
          update: { value: JSON.stringify(activeBkIds) },
          create: { key: 'ACTIVE_BK_STAFF_CONFIG', value: JSON.stringify(activeBkIds) },
        });
      }

      const effectiveOverrides = workDaysOverrides ?? config?.workDaysOverrides;
      if (effectiveOverrides && typeof effectiveOverrides === 'object') {
        await fastify.prisma.crm.crmConfig.upsert({
          where: { key: 'BK_WORK_DAYS_OVERRIDE' },
          update: { value: JSON.stringify(effectiveOverrides) },
          create: { key: 'BK_WORK_DAYS_OVERRIDE', value: JSON.stringify(effectiveOverrides) },
        });
      }

      if (config) {
        const currentConfig = await getBkSalaryConfig(fastify);
        const updatedConfig = { ...currentConfig, ...config };
        await fastify.prisma.crm.crmConfig.upsert({
          where: { key: 'BK_SALARY_CONFIG' },
          update: { value: JSON.stringify(updatedConfig) },
          create: { key: 'BK_SALARY_CONFIG', value: JSON.stringify(updatedConfig) },
        });
      }

      return reply.send({ success: true, message: 'Cập nhật cấu hình BK thành công.' });
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error saving BK config');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi lưu cấu hình BK.' });
    }
  });
}
