import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { requireAuth } from '../../../middlewares/auth.js';
import { getSalaryConfig, setCachedSalaryConfig } from '../services/salary-calculator.js';

export async function registerSalaryConfigRoutes(fastify: FastifyInstance) {
  // GET /api/kpi/salary-config
  fastify.get('/kpi/salary-config', { preHandler: [requireAuth] }, async (_request, _reply) => {
    const config = await getSalaryConfig(fastify);
    return config;
  });

  // POST /api/kpi/salary-config (Admin only)
  fastify.post('/kpi/salary-config', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string };
    if (user.role !== 'admin') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Chỉ quản trị viên mới có quyền cấu hình công thức lương.',
      });
    }

    const newConfig = request.body as SafeAny;
    if (!newConfig || typeof newConfig !== 'object') {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Cấu hình không hợp lệ.',
      });
    }

    try {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: 'BOOKER_SALARY_CONFIG' },
        update: { value: JSON.stringify(newConfig) },
        create: {
          key: 'BOOKER_SALARY_CONFIG',
          value: JSON.stringify(newConfig),
        },
      });

      // Update in-memory cache
      setCachedSalaryConfig(newConfig);

      return { success: true, message: 'Cấu hình lương Booker đã được cập nhật thành công.' };
    } catch (err) {
      fastify.log.error(err as Error, 'Update salary config error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi lưu cấu hình lương.',
      });
    }
  });

  // GET /api/kpi/staff-levels
  fastify.get('/kpi/staff-levels', { preHandler: [requireAuth] }, async (_request, reply) => {
    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'STAFF_TARGET_LEVELS' },
      });
      if (!config) {
        return {};
      }
      return JSON.parse(config.value);
    } catch (err) {
      fastify.log.error(err as Error, 'Get staff levels error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi tải danh sách cấp độ nhân sự.',
      });
    }
  });

  // POST /api/kpi/staff-levels (Admin only)
  fastify.post('/kpi/staff-levels', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string };
    if (user.role !== 'admin') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Chỉ quản trị viên mới có quyền cấu hình cấp độ mục tiêu nhân sự.',
      });
    }

    const levelsMap = request.body as SafeAny;
    if (!levelsMap || typeof levelsMap !== 'object') {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Cấu hình cấp độ không hợp lệ.',
      });
    }

    try {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: 'STAFF_TARGET_LEVELS' },
        update: { value: JSON.stringify(levelsMap) },
        create: {
          key: 'STAFF_TARGET_LEVELS',
          value: JSON.stringify(levelsMap),
        },
      });

      return { success: true, message: 'Đã cập nhật cấp độ mục tiêu nhân sự thành công.' };
    } catch (err) {
      fastify.log.error(err as Error, 'Update staff levels error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi lưu cấp độ mục tiêu nhân sự.',
      });
    }
  });
}
