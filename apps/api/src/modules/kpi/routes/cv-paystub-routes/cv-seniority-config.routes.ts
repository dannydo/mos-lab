import { FastifyInstance } from 'fastify';
import { requireAuth, requireRole } from '../../../../middlewares/auth.js';
import { DEFAULT_SENIORITY_BONUS_RULES } from './cv-paystub.helpers.js';

export function registerCvSeniorityConfigRoutes(fastify: FastifyInstance) {
  // GET /api/kpi/cv-seniority-config
  fastify.get('/kpi/cv-seniority-config', { preHandler: [requireAuth] }, async (_request, reply) => {
    try {
      const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'CV_SENIORITY_BONUS_CONFIG' },
      });
      if (configRecord && configRecord.value) {
        return reply.send(JSON.parse(configRecord.value));
      }
      // Default fallback
      return reply.send([...DEFAULT_SENIORITY_BONUS_RULES]);
    } catch (err) {
      fastify.log.error(err as Error, 'Error loading CV seniority config');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể lấy cấu hình thâm niên.' });
    }
  });

  // POST /api/kpi/cv-seniority-config (Admin only)
  fastify.post(
    '/kpi/cv-seniority-config',
    { preHandler: [requireAuth, requireRole(['admin'])] },
    async (request, reply) => {
      const { rules } = request.body as { rules: { minMonths: number; bonusPercent: number }[] };
      if (!Array.isArray(rules)) {
        return reply.status(400).send({ error: 'Bad Request', message: 'rules phải là một mảng.' });
      }
      try {
        const cleanRules = rules
          .map((r) => ({
            minMonths: Number(r.minMonths),
            bonusPercent: Number(r.bonusPercent),
          }))
          .filter((r) => !isNaN(r.minMonths) && !isNaN(r.bonusPercent));

        const jsonValue = JSON.stringify(cleanRules);
        await fastify.prisma.crm.crmConfig.upsert({
          where: { key: 'CV_SENIORITY_BONUS_CONFIG' },
          update: { value: jsonValue, updatedAt: new Date() },
          create: { key: 'CV_SENIORITY_BONUS_CONFIG', value: jsonValue },
        });
        return reply.send({ success: true, rules: cleanRules });
      } catch (err) {
        fastify.log.error(err as Error, 'Save CV seniority config error');
        return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể lưu cấu hình thâm niên.' });
      }
    }
  );
}
