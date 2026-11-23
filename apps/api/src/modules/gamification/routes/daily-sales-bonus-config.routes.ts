import { FastifyInstance } from 'fastify';
import { DailySalesBonusConfig, isAdminOrSuperAdminRole, SafeAny } from '@mos-lab/shared';
import { requireAuth } from '../../../middlewares/auth.js';
import { CcKpiService } from '../../kpi/services/cc-kpi.service.js';

export const DEFAULT_CONFIG: DailySalesBonusConfig = {
  combo_unit_bonus: 200000,
  product_unit_bonus: 50000,
  tiers: [
    { position: 1, value_required_min: 0, value_required_max: 5000000, reward_amount: 0.5 },
    { position: 2, value_required_min: 5000000, value_required_max: 10000000, reward_amount: 1.0 },
    { position: 3, value_required_min: 10000000, value_required_max: 15000000, reward_amount: 1.5 },
    { position: 4, value_required_min: 15000000, value_required_max: 20000000, reward_amount: 2.0 },
    { position: 5, value_required_min: 20000000, value_required_max: 25000000, reward_amount: 2.5 },
    { position: 6, value_required_min: 25000000, value_required_max: 999999999, reward_amount: 3.0 },
  ],
};

export async function getBonusConfig(fastify: FastifyInstance): Promise<DailySalesBonusConfig> {
  try {
    const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: 'DAILY_SALES_BONUS_CONFIG' },
    });

    const config: DailySalesBonusConfig = configRecord ? JSON.parse(configRecord.value) : { ...DEFAULT_CONFIG };
    config.combo_unit_bonus = config.combo_unit_bonus ?? 200000;
    config.product_unit_bonus = config.product_unit_bonus ?? 50000;

    // Attempt to sync tiers directly from management.staff_payroll_level_rule if present
    try {
      const dbTiers = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT position, value_required_min, value_required_max, reward_amount
        FROM \`staff_payroll_level_rule\`
        WHERE level_rule_group LIKE 'BonusSalesDayCombo%'
        ORDER BY position ASC
      `);

      if (dbTiers && dbTiers.length > 0) {
        config.tiers = dbTiers.map((r: SafeAny) => ({
          position: Number(r.position),
          value_required_min: Number(r.value_required_min || 0),
          value_required_max: Number(r.value_required_max || 0),
          reward_amount: Number(r.reward_amount || 0),
        }));
      }
    } catch (err) {
      fastify.log.warn(err, 'Failed to query staff_payroll_level_rule for tiers, using fallback');
    }

    return config;
  } catch (err) {
    fastify.log.error(err as Error, 'Error loading daily sales bonus config');
    return DEFAULT_CONFIG;
  }
}

export function registerDailySalesBonusConfigAndConsultantRoutes(fastify: FastifyInstance): void {
  // 1. GET /api/gamification/daily-sales-bonus/consultant
  fastify.get(
    '/gamification/daily-sales-bonus/consultant',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    date: { type: 'string' },
                    user_id: { type: 'number' },
                    consultant_name: { type: 'string' },
                    avatar: { type: 'string', nullable: true },
                    store_code: { type: 'string' },
                    single_sales: { type: 'number' },
                    combo_sales: { type: 'number' },
                    combo_count: { type: 'number' },
                    green_combo_count: { type: 'number' },
                    product_sales: { type: 'number' },
                    product_count: { type: 'number' },
                    debt_collected: { type: 'number' },
                    vat: { type: 'number' },
                    debt: { type: 'number' },
                    total_sales: { type: 'number' },
                    commission_rate_percent: { type: 'number' },
                    daily_bonus: { type: 'number' },
                    green_visits: { type: 'number' },
                    total_visits: { type: 'number' },
                    actual_combo_gross: { type: 'number' },
                    actual_combo_net: { type: 'number' },
                    actual_product_gross: { type: 'number' },
                    actual_product_net: { type: 'number' },
                    actual_single_gross: { type: 'number' },
                    actual_single_net: { type: 'number' },
                  },
                },
              },
              total: { type: 'number' },
              summary: {
                type: 'object',
                properties: {
                  totalComboSales: { type: 'number' },
                  totalProductSales: { type: 'number' },
                  totalSingleSales: { type: 'number' },
                  totalSales: { type: 'number' },
                  totalCcBonus: { type: 'number' },
                  projectedComboSales: { type: 'number' },
                  projectedProductSales: { type: 'number' },
                  projectedSingleSales: { type: 'number' },
                  projectedTotalSales: { type: 'number' },
                  projectedCcBonus: { type: 'number' },
                  actualComboGross: { type: 'number' },
                  actualComboNet: { type: 'number' },
                  actualProductGross: { type: 'number' },
                  actualProductNet: { type: 'number' },
                  actualSingleGross: { type: 'number' },
                  actualSingleNet: { type: 'number' },
                  actualTotalGross: { type: 'number' },
                  actualTotalNet: { type: 'number' },
                  projectedActualComboGross: { type: 'number' },
                  projectedActualComboNet: { type: 'number' },
                  projectedActualProductGross: { type: 'number' },
                  projectedActualProductNet: { type: 'number' },
                  projectedActualSingleGross: { type: 'number' },
                  projectedActualSingleNet: { type: 'number' },
                  projectedActualTotalGross: { type: 'number' },
                  projectedActualTotalNet: { type: 'number' },
                  elapsedRatioPercent: { type: 'number' },
                  comparison: {
                    type: 'object',
                    properties: {
                      mode: { type: 'string', enum: ['month', 'week', 'day'] },
                      dateFrom: { type: 'string' },
                      dateTo: { type: 'string' },
                      totalComboSales: { type: 'number' },
                      totalProductSales: { type: 'number' },
                      totalSingleSales: { type: 'number' },
                      totalSales: { type: 'number' },
                      totalCcBonus: { type: 'number' },
                      actualComboGross: { type: 'number' },
                      actualComboNet: { type: 'number' },
                      actualProductGross: { type: 'number' },
                      actualProductNet: { type: 'number' },
                      actualSingleGross: { type: 'number' },
                      actualSingleNet: { type: 'number' },
                      actualTotalGross: { type: 'number' },
                      actualTotalNet: { type: 'number' },
                    },
                  },
                },
              },
              activeStaff: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    userId: { type: 'number' },
                    displayName: { type: 'string' },
                    avatar: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
          '5xx': {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { dateFrom, dateTo, consultantId, storeId, comparisonMode } = request.query as {
        dateFrom?: string;
        dateTo?: string;
        consultantId?: string;
        storeId?: string;
        comparisonMode?: 'month' | 'week' | 'day';
      };

      try {
        const res = await CcKpiService.getCcDailySalesBonus(fastify, {
          dateFrom,
          dateTo,
          consultantId,
          storeId,
          comparisonMode,
          includeComparison: Boolean(comparisonMode),
        });
        return res;
      } catch (err) {
        fastify.log.error(err as Error, 'Get daily sales bonus consultant error');
        return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể tải báo cáo thưởng CC.' });
      }
    }
  );

  // 2. GET /api/gamification/daily-sales-bonus/config
  fastify.get('/gamification/daily-sales-bonus/config', async (_request, _reply) => {
    const config = await getBonusConfig(fastify);
    return config;
  });

  // 3. POST /api/gamification/daily-sales-bonus/config
  fastify.post('/gamification/daily-sales-bonus/config', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role?: string; username?: string; email?: string };
    const isAuthorized =
      isAdminOrSuperAdminRole(user.role) ||
      user.role === 'manager' ||
      user.username?.toLowerCase() === 'admin' ||
      user.username?.toLowerCase() === 'danhdo@gmail.com' ||
      user.email?.toLowerCase() === 'danhdo@gmail.com';

    if (!isAuthorized) {
      return reply
        .status(403)
        .send({ error: 'Forbidden', message: 'Chỉ Admin/Manager mới có quyền cập nhật cấu hình thưởng.' });
    }

    const payload = request.body as DailySalesBonusConfig;
    if (!payload || !Array.isArray(payload.tiers)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Dữ liệu cấu hình không hợp lệ.' });
    }

    try {
      // 1. Save JSON config in crmConfig
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: 'DAILY_SALES_BONUS_CONFIG' },
        update: { value: JSON.stringify(payload) },
        create: {
          key: 'DAILY_SALES_BONUS_CONFIG',
          value: JSON.stringify(payload),
        },
      });

      // 2. Synchronize directly into DB management.staff_payroll_level_rule
      for (const tier of payload.tiers) {
        const groupName = `BonusSalesDayCombo${tier.position}`;
        try {
          // Check if rule exists
          const existing = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
            SELECT id FROM \`staff_payroll_level_rule\` WHERE level_rule_group = '${groupName}' AND position = ${tier.position} LIMIT 1
          `);

          if (existing && existing.length > 0) {
            await fastify.prisma.legacy.$executeRawUnsafe(`
              UPDATE \`staff_payroll_level_rule\`
              SET value_required_min = '${tier.value_required_min}',
                  value_required_max = '${tier.value_required_max}',
                  reward_amount = ${tier.reward_amount},
                  is_disabled = 0
              WHERE id = ${existing[0].id}
            `);
          } else {
            await fastify.prisma.legacy.$executeRawUnsafe(`
              INSERT INTO \`staff_payroll_level_rule\`
              (client_id, client_business_id, staff_payroll_level_id, repeated_type, level_rule_group, level_rule_type, value_required, value_required_min, value_required_max, reward_type, reward_amount, position, is_disabled)
              VALUES
              (11, 1, 14, 'Monthly', '${groupName}', 'RevenuePerDay', '0', '${tier.value_required_min}', '${tier.value_required_max}', 'BonusRevenuePercentage', ${tier.reward_amount}, ${tier.position}, 0)
            `);
          }
        } catch (dbErr) {
          fastify.log.warn(dbErr, `Could not sync tier pos ${tier.position} to staff_payroll_level_rule`);
        }
      }

      return { success: true, message: 'Đã lưu cấu hình thưởng CC và đồng bộ bảng DB thành công!' };
    } catch (err) {
      fastify.log.error(err as Error, 'Save daily sales bonus config error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi khi lưu cấu hình thưởng.' });
    }
  });
}
