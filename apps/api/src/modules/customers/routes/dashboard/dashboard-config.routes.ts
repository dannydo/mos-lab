import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';

export async function getVatRateConfig(fastify: FastifyInstance): Promise<{ vatPercent: number; netFactor: number }> {
  try {
    const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: 'VAT_RATE_CONFIG' },
    });
    if (configRecord?.value) {
      const parsed = typeof configRecord.value === 'string' ? JSON.parse(configRecord.value) : configRecord.value;
      const vatPercent = Number(parsed.vatPercent ?? 8);
      const validVat = isNaN(vatPercent) || vatPercent < 0 ? 8 : vatPercent;
      return {
        vatPercent: validVat,
        netFactor: 1 / (1 + validVat / 100),
      };
    }
  } catch {
    // Default fallback
  }
  return { vatPercent: 8, netFactor: 1 / 1.08 }; // Default 8% VAT
}

export async function buildBookerFilterMatcher(fastify: FastifyInstance) {
  const crmTelesales = await fastify.prisma.crm.crmStaff.findMany({
    where: {
      OR: [{ role: 'telesales' }, { displayName: { in: ['Tâm Nguyễn'] } }],
    },
    select: { displayName: true },
  });
  const telesalesSet = new Set<string>(crmTelesales.map((s) => s.displayName.trim().toLowerCase()));

  const teamConfigRaw = await fastify.prisma.crm.crmConfig.findUnique({
    where: { key: 'BOOKER_TEAM_CONFIG' },
  });
  const controlCsSet = new Set<string>();
  if (teamConfigRaw && teamConfigRaw.value) {
    try {
      const parsed = JSON.parse(teamConfigRaw.value);
      if (parsed.telesales) parsed.telesales.forEach((n: string) => telesalesSet.add(n.trim().toLowerCase()));
      if (parsed.control_cs) parsed.control_cs.forEach((n: string) => controlCsSet.add(n.trim().toLowerCase()));
    } catch {
      // ignore
    }
  }

  return (bookerName: string, filter: string | undefined): boolean => {
    if (!filter || filter === 'all') return true;
    const nameLower = (bookerName || '').trim().toLowerCase();
    if (!nameLower) return false;

    if (filter === 'team:telesales') {
      return telesalesSet.has(nameLower);
    }
    if (filter === 'team:control_cs') {
      return controlCsSet.has(nameLower);
    }
    if (filter === 'team:other') {
      return !telesalesSet.has(nameLower) && !controlCsSet.has(nameLower);
    }

    return nameLower === filter.trim().toLowerCase();
  };
}

export async function registerDashboardConfigRoutes(fastify: FastifyInstance) {
  // GET /api/nyc/config
  // Get touchpoint config for NYC campaign
  fastify.get('/nyc/config', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'NYC_TOUCHPOINTS_CONFIG' },
      });
      if (config) {
        return JSON.parse(config.value);
      }
      // Return defaults if not configured
      const defaultConfigs = {
        NYC_30: [
          { key: 'now', label: 'Chăm sóc 24h', daysMin: 0, daysMax: 1, color: 'blue' },
          { key: '3', label: 'Bảo hành kiểu Úc', daysMin: 2, daysMax: 3, color: 'cyan' },
          { key: '7', label: 'Chạm 14', daysMin: 14, daysMax: 14, color: 'green' },
          { key: '17', label: 'Chạm 19', daysMin: 19, daysMax: 19, color: 'orange' },
          { key: '21', label: 'Chạm 21', daysMin: 21, daysMax: 21, color: 'red' },
        ],
        NYC_60: [
          { key: '35', label: 'Chạm 35', daysMin: 31, daysMax: 35, color: 'blue' },
          { key: '45', label: 'Chạm 45', daysMin: 41, daysMax: 45, color: 'orange' },
          { key: '55', label: 'Chạm 55', daysMin: 51, daysMax: 55, color: 'red' },
        ],
        NYC_90: [
          { key: '70', label: 'Chạm 70', daysMin: 65, daysMax: 70, color: 'blue' },
          { key: '80', label: 'Chạm 80', daysMin: 75, daysMax: 80, color: 'orange' },
        ],
        NYC_180: [
          { key: '100', label: 'Chạm 100', daysMin: 95, daysMax: 100, color: 'blue' },
          { key: '150', label: 'Chạm 150', daysMin: 145, daysMax: 150, color: 'orange' },
        ],
        NYC_365: [
          { key: '200', label: 'Chạm 200', daysMin: 195, daysMax: 200, color: 'blue' },
          { key: '300', label: 'Chạm 300', daysMin: 295, daysMax: 300, color: 'orange' },
        ],
        NYC_365plus: [
          { key: '400', label: 'Chạm 400', daysMin: 395, daysMax: 400, color: 'blue' },
          { key: '500', label: 'Chạm 500', daysMin: 495, daysMax: 500, color: 'orange' },
        ],
      };
      return defaultConfigs;
    } catch (error) {
      fastify.log.error(error as Error, 'Get NYC config error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve touchpoint config',
      });
    }
  });

  // PUT /api/nyc/config
  // Save touchpoint config for NYC campaign (Admins only)
  fastify.put('/nyc/config', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string };
    if (user.role !== 'admin') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Chỉ Admin mới có quyền cấu hình touchpoints.',
      });
    }

    const configs = request.body as Record<string, SafeAny[]>;
    if (typeof configs !== 'object' || configs === null) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Configs must be an object',
      });
    }

    // Validate structure
    for (const [tabKey, touchpoints] of Object.entries(configs)) {
      if (!Array.isArray(touchpoints)) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: `Touchpoints for tab ${tabKey} must be an array`,
        });
      }
      for (const tp of touchpoints) {
        if (!tp.key || !tp.label || typeof tp.daysMin !== 'number' || typeof tp.daysMax !== 'number') {
          return reply.status(400).send({
            error: 'Bad Request',
            message: `Mỗi touchpoint trong tab ${tabKey} phải có key, label, daysMin, và daysMax hợp lệ.`,
          });
        }
      }
    }

    try {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: 'NYC_TOUCHPOINTS_CONFIG' },
        create: {
          key: 'NYC_TOUCHPOINTS_CONFIG',
          value: JSON.stringify(configs),
        },
        update: {
          value: JSON.stringify(configs),
        },
      });
      return { success: true, message: 'Đã lưu cấu hình template touchpoints thành công.' };
    } catch (error) {
      fastify.log.error(error as Error, 'Save NYC config error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to save touchpoint config',
      });
    }
  });

  // GET /api/loca/config
  // Get touchpoint config for LoCa campaign
  fastify.get('/loca/config', { preHandler: [requireAuth] }, async (_request, reply) => {
    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'LOCA_TOUCHPOINTS_CONFIG' },
      });
      if (config) {
        return JSON.parse(config.value);
      }
      const defaultConfigs = {
        LOCA_ALL: [
          { key: 'now', label: 'Chạm 24h', daysMin: 1, daysMax: 1, color: 'blue' },
          { key: '17', label: 'Chạm 17', daysMin: 17, daysMax: 17, color: 'cyan' },
          { key: '19', label: 'Chạm 19', daysMin: 19, daysMax: 19, color: 'cyan' },
          { key: '21', label: 'Chạm 21', daysMin: 21, daysMax: 21, color: 'green' },
          { key: '23', label: 'Chạm 23', daysMin: 23, daysMax: 23, color: 'green' },
          { key: '25', label: 'Chạm 25', daysMin: 25, daysMax: 25, color: 'green' },
          { key: '30', label: 'Chạm 30', daysMin: 30, daysMax: 30, color: 'orange' },
          { key: '35', label: 'Chạm 35', daysMin: 35, daysMax: 35, color: 'orange' },
          { key: '40', label: 'Chạm 40', daysMin: 40, daysMax: 40, color: 'orange' },
          { key: '45', label: 'Chạm 45', daysMin: 45, daysMax: 45, color: 'red' },
          { key: '50', label: 'Chạm 50', daysMin: 50, daysMax: 50, color: 'red' },
          { key: '55', label: 'Chạm 55', daysMin: 55, daysMax: 55, color: 'red' },
          { key: '60', label: 'Chạm 60', daysMin: 60, daysMax: 60, color: 'red' },
        ],
      };
      return defaultConfigs;
    } catch (error) {
      fastify.log.error(error as Error, 'Get LoCa config error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve touchpoint config',
      });
    }
  });

  // PUT /api/loca/config
  // Save touchpoint config for LoCa campaign (Admins only)
  fastify.put('/loca/config', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string; username?: string; email?: string };
    const isAuthorized =
      user.role === 'admin' ||
      user.role === 'manager' ||
      user.role === 'cs' ||
      user.role === 'control' ||
      user.username === 'admin' ||
      user.username === 'danhdo@gmail.com' ||
      user.email === 'danhdo@gmail.com';

    if (!isAuthorized) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Chỉ Admin, Manager, CS và Control mới có quyền cấu hình touchpoints.',
      });
    }

    const configs = request.body as Record<string, SafeAny[]>;
    if (typeof configs !== 'object' || configs === null) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Configs must be an object',
      });
    }

    try {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: 'LOCA_TOUCHPOINTS_CONFIG' },
        create: {
          key: 'LOCA_TOUCHPOINTS_CONFIG',
          value: JSON.stringify(configs),
        },
        update: {
          value: JSON.stringify(configs),
        },
      });
      return { success: true, message: 'Đã lưu cấu hình template touchpoints thành công.' };
    } catch (error) {
      fastify.log.error(error as Error, 'Save LoCa config error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to save touchpoint config',
      });
    }
  });

  // GET /api/dashboard/vat-config
  // Get VAT rate configuration (Defaults to 8%)
  fastify.get('/dashboard/vat-config', { preHandler: [requireAuth] }, async (_request, _reply) => {
    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'VAT_RATE_CONFIG' },
      });
      if (config) {
        const parsed = JSON.parse(config.value);
        return { vatPercent: Number(parsed.vatPercent ?? 8) };
      }
      return { vatPercent: 8 };
    } catch (error) {
      fastify.log.error(error as Error, 'Get VAT config error:');
      return { vatPercent: 8 };
    }
  });

  // PUT /api/dashboard/vat-config
  // Save VAT rate configuration (Admin only)
  fastify.put('/dashboard/vat-config', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string };
    if (user.role !== 'admin') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Chỉ Admin mới có quyền cấu hình Tỷ lệ Thuế VAT.',
      });
    }
    const { vatPercent } = request.body as { vatPercent: number };
    const num = Number(vatPercent);
    if (isNaN(num) || num < 0 || num > 50) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Tỷ lệ VAT phải là số từ 0% đến 50%.',
      });
    }
    try {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: 'VAT_RATE_CONFIG' },
        create: {
          key: 'VAT_RATE_CONFIG',
          value: JSON.stringify({ vatPercent: num }),
        },
        update: {
          value: JSON.stringify({ vatPercent: num }),
        },
      });
      return { success: true, vatPercent: num, message: `Đã cập nhật Tỷ lệ Thuế VAT thành ${num}%.` };
    } catch (error) {
      fastify.log.error(error as Error, 'Save VAT config error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể lưu cấu hình Tỷ lệ Thuế VAT',
      });
    }
  });
}
