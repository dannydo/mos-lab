import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middlewares/auth.js';
import {
  DailySalesBonusConfig,
  DailySalesBonusConsultantRecord,
  DailySalesBonusTransaction,
  SafeAny,
  calculateFractionToday,
} from '@mos-lab/shared';
import { TeamService } from '../teams/team.service.js';
import { CcKpiService } from '../kpi/services/cc-kpi.service.js';

const DEFAULT_CONFIG: DailySalesBonusConfig = {
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

async function getBonusConfig(fastify: FastifyInstance): Promise<DailySalesBonusConfig> {
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

async function getActiveCcIds(fastify: FastifyInstance): Promise<number[]> {
  return await TeamService.getActiveStaffIdsWithFallback(fastify, 'CC', 'ACTIVE_CC_STAFF_CONFIG');
}

export async function gamificationRoutes(fastify: FastifyInstance) {
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
                    avatar: { type: ['string', 'null'] },
                    store_code: { type: 'string' },
                    single_sales: { type: 'number' },
                    combo_sales: { type: 'number' },
                    combo_count: { type: 'number' },
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
                  projectedTotalSales: { type: 'number' },
                  projectedCcBonus: { type: 'number' },
                  elapsedRatioPercent: { type: 'number' },
                },
              },
              activeStaff: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    userId: { type: 'number' },
                    displayName: { type: 'string' },
                    avatar: { type: ['string', 'null'] },
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
      const { dateFrom, dateTo, consultantId, storeId } = request.query as {
        dateFrom?: string;
        dateTo?: string;
        consultantId?: string;
        storeId?: string;
      };

      const startStr = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
      try {
        const res = await CcKpiService.getCcDailySalesBonus(fastify, {
          dateFrom,
          dateTo,
          consultantId,
          storeId,
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
      user.role === 'admin' ||
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

  // 4. GET /api/gamification/daily-sales-bonus/transactions
  fastify.get('/gamification/daily-sales-bonus/transactions', async (request, reply) => {
    const { date, consultantId } = request.query as {
      date?: string;
      consultantId?: string;
    };

    if (!date) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu tham số date.' });
    }

    try {
      let subStaffFilter = '';
      let staffFilterOp = '';
      let staffFilterOs = '';
      let staffFilterUdp = '';

      if (consultantId && consultantId !== 'ALL' && !isNaN(Number(consultantId))) {
        const uid = Number(consultantId);
        subStaffFilter = `WHERE sub.staff_id = ${uid}`;

        staffFilterOp = ` AND COALESCE(
          op.created_staff_id,
          (SELECT os.check_in_staff_id FROM \`order_service\` os WHERE os.order_id = op.order_id AND os.check_in_staff_id IS NOT NULL LIMIT 1),
          o.assigned_staff_id,
          o.created_staff_id
        ) = ${uid}`;

        staffFilterOs = ` AND COALESCE(os.check_in_staff_id, os.check_out_staff_id, os.assigned_staff_id, o.created_staff_id) = ${uid}`;

        staffFilterUdp = ` AND COALESCE(udp.created_staff_id, ud.user_debt_payment_staff_id, ud.created_staff_id) = ${uid}`;
      }

      // Query Combos (Net cash value subtracts unpaid debt) with 50/50 Split for CC IN != CC OUT
      const comboQuery = `
        SELECT 
          sub.order_service_id,
          sub.order_id,
          sub.order_time,
          sub.customer_name,
          sub.store_code,
          sub.item_title,
          sub.item_type,
          sub.quantity,
          sub.gross_value,
          sub.net_value,
          sub.debt_amount,
          sub.is_split,
          sub.cc_in_name,
          sub.cc_out_name
        FROM (
          -- CC IN != CC OUT -> 50% to CC IN (New Combo)
          SELECT 
            osc.id as order_service_id,
            o.id as order_id,
            DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%H:%i:%s') as order_time,
            up_cust.full_name as customer_name,
            UPPER(cs.client_store_key) as store_code,
            CONCAT('Combo #', osc.service_id, ' - ', COALESCE(sl.service_name, 'Gói Combo')) as item_title,
            'Combo' as item_type,
            osc.quantity * 0.5 as quantity,
            osc.total_price * 0.5 as gross_value,
            GREATEST(0, (osc.total_price - osc.tax_amount - COALESCE(ud.debt_amount, 0))) * 0.5 as net_value,
            COALESCE(ud.debt_amount, 0) * 0.5 as debt_amount,
            1 as is_split,
            os.check_in_staff_id as staff_id,
            up_in.full_name as cc_in_name,
            up_out.full_name as cc_out_name
          FROM \`order\` o
          JOIN \`order_service_combo\` osc ON osc.order_id = o.id
          JOIN \`order_service\` os ON os.id = osc.order_service_id
          LEFT JOIN \`service_language\` sl ON sl.service_id = osc.service_id AND sl.language_id = 1
          LEFT JOIN \`user_debt\` ud ON ud.order_id = o.id AND ud.debt_amount > 0
          LEFT JOIN \`user_profile\` up_cust ON up_cust.user_id = o.user_id
          LEFT JOIN \`user_profile\` up_in ON up_in.user_id = os.check_in_staff_id
          LEFT JOIN \`user_profile\` up_out ON up_out.user_id = os.check_out_staff_id
          LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
          LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
          WHERE o.order_state = 'Completed'
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${date} 00:00:00'
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${date} 23:59:59'
            AND os.check_in_staff_id IS NOT NULL AND os.check_out_staff_id IS NOT NULL AND os.check_in_staff_id != os.check_out_staff_id

          UNION ALL

          -- CC IN != CC OUT -> 50% to CC OUT (New Combo)
          SELECT 
            osc.id as order_service_id,
            o.id as order_id,
            DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%H:%i:%s') as order_time,
            up_cust.full_name as customer_name,
            UPPER(cs.client_store_key) as store_code,
            CONCAT('Combo #', osc.service_id, ' - ', COALESCE(sl.service_name, 'Gói Combo')) as item_title,
            'Combo' as item_type,
            osc.quantity * 0.5 as quantity,
            osc.total_price * 0.5 as gross_value,
            GREATEST(0, (osc.total_price - osc.tax_amount - COALESCE(ud.debt_amount, 0))) * 0.5 as net_value,
            COALESCE(ud.debt_amount, 0) * 0.5 as debt_amount,
            1 as is_split,
            os.check_out_staff_id as staff_id,
            up_in.full_name as cc_in_name,
            up_out.full_name as cc_out_name
          FROM \`order\` o
          JOIN \`order_service_combo\` osc ON osc.order_id = o.id
          JOIN \`order_service\` os ON os.id = osc.order_service_id
          LEFT JOIN \`service_language\` sl ON sl.service_id = osc.service_id AND sl.language_id = 1
          LEFT JOIN \`user_debt\` ud ON ud.order_id = o.id AND ud.debt_amount > 0
          LEFT JOIN \`user_profile\` up_cust ON up_cust.user_id = o.user_id
          LEFT JOIN \`user_profile\` up_in ON up_in.user_id = os.check_in_staff_id
          LEFT JOIN \`user_profile\` up_out ON up_out.user_id = os.check_out_staff_id
          LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
          LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
          WHERE o.order_state = 'Completed'
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${date} 00:00:00'
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${date} 23:59:59'
            AND os.check_in_staff_id IS NOT NULL AND os.check_out_staff_id IS NOT NULL AND os.check_in_staff_id != os.check_out_staff_id

          UNION ALL

          -- Same CC or single CC -> 100% to single staff (New Combo)
          SELECT 
            osc.id as order_service_id,
            o.id as order_id,
            DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%H:%i:%s') as order_time,
            up_cust.full_name as customer_name,
            UPPER(cs.client_store_key) as store_code,
            CONCAT('Combo #', osc.service_id, ' - ', COALESCE(sl.service_name, 'Gói Combo')) as item_title,
            'Combo' as item_type,
            osc.quantity * 1.0 as quantity,
            osc.total_price * 1.0 as gross_value,
            GREATEST(0, (osc.total_price - osc.tax_amount - COALESCE(ud.debt_amount, 0))) * 1.0 as net_value,
            COALESCE(ud.debt_amount, 0) * 1.0 as debt_amount,
            0 as is_split,
            COALESCE(
              os.check_in_staff_id,
              os.check_out_staff_id,
              os.assigned_staff_id,
              o.assigned_staff_id,
              o.created_staff_id
            ) as staff_id,
            up_in.full_name as cc_in_name,
            up_out.full_name as cc_out_name
          FROM \`order\` o
          JOIN \`order_service_combo\` osc ON osc.order_id = o.id
          JOIN \`order_service\` os ON os.id = osc.order_service_id
          LEFT JOIN \`service_language\` sl ON sl.service_id = osc.service_id AND sl.language_id = 1
          LEFT JOIN \`user_debt\` ud ON ud.order_id = o.id AND ud.debt_amount > 0
          LEFT JOIN \`user_profile\` up_cust ON up_cust.user_id = o.user_id
          LEFT JOIN \`user_profile\` up_in ON up_in.user_id = os.check_in_staff_id
          LEFT JOIN \`user_profile\` up_out ON up_out.user_id = os.check_out_staff_id
          LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
          LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
          WHERE o.order_state = 'Completed'
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${date} 00:00:00'
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${date} 23:59:59'
            AND (os.check_in_staff_id IS NULL OR os.check_out_staff_id IS NULL OR os.check_in_staff_id = os.check_out_staff_id)
        ) sub
        ${subStaffFilter}
      `;

      // Query Products
      const productQuery = `
        SELECT 
          op.id as order_service_id,
          o.id as order_id,
          DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%H:%i:%s') as order_time,
          up_cust.full_name as customer_name,
          UPPER(cs.client_store_key) as store_code,
          CONCAT('Sản Phẩm #', op.product_id, ' - ', COALESCE(pl.product_name, 'Sản Phẩm')) as item_title,
          'Product' as item_type,
          op.quantity,
          op.total_price as gross_value,
          (op.total_price - op.tax_amount) as net_value,
          0 as debt_amount,
          0 as is_split,
          NULL as cc_in_name,
          NULL as cc_out_name
        FROM \`order\` o
        JOIN \`order_product\` op ON op.order_id = o.id
        LEFT JOIN \`product_language\` pl ON pl.product_id = op.product_id AND pl.language_id = 1
        LEFT JOIN \`user_profile\` up_cust ON up_cust.user_id = o.user_id
        LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
        LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
        WHERE o.order_state = 'Completed'
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${date} 00:00:00'
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${date} 23:59:59'
          ${staffFilterOp}
      `;

      // Query Single Services (Exclude Combo Upgrades)
      const serviceQuery = `
        SELECT 
          os.id as order_service_id,
          o.id as order_id,
          DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%H:%i:%s') as order_time,
          up_cust.full_name as customer_name,
          UPPER(cs.client_store_key) as store_code,
          CONCAT('DV #', os.service_id, ' - ', COALESCE(sl.service_name, os.service_group, 'Mi/SP')) as item_title,
          'Service' as item_type,
          os.quantity,
          os.total_price as gross_value,
          0 as net_value,
          0 as debt_amount,
          0 as is_split,
          up_in.full_name as cc_in_name,
          up_out.full_name as cc_out_name
        FROM \`order\` o
        JOIN \`order_service\` os ON os.order_id = o.id
        LEFT JOIN \`service_language\` sl ON sl.service_id = os.service_id AND sl.language_id = 1
        LEFT JOIN \`user_profile\` up_cust ON up_cust.user_id = o.user_id
        LEFT JOIN \`user_profile\` up_in ON up_in.user_id = os.check_in_staff_id
        LEFT JOIN \`user_profile\` up_out ON up_out.user_id = os.check_out_staff_id
        LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
        LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
        WHERE o.order_state = 'Completed'
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${date} 00:00:00'
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${date} 23:59:59'
          ${staffFilterOs}
          AND COALESCE(os.upgrade_price, 0) = 0
          AND LOWER(COALESCE(os.service_group, '')) NOT LIKE '%combo%'
          AND LOWER(COALESCE(os.service_type, '')) NOT LIKE '%combo%'
          AND LOWER(COALESCE(os.service_group, '')) NOT LIKE '%product%'
      `;

      // Query Combo Upgrades with 50/50 Split for CC IN != CC OUT
      const comboUpgradeQuery = `
        SELECT 
          sub.order_service_id,
          sub.order_id,
          sub.order_time,
          sub.customer_name,
          sub.store_code,
          sub.item_title,
          sub.item_type,
          sub.quantity,
          sub.gross_value,
          sub.net_value,
          sub.debt_amount,
          sub.is_split,
          sub.cc_in_name,
          sub.cc_out_name
        FROM (
          -- CC IN != CC OUT -> 50% to CC IN (Combo Upgrade)
          SELECT 
            os.id as order_service_id,
            o.id as order_id,
            DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%H:%i:%s') as order_time,
            up_cust.full_name as customer_name,
            UPPER(cs.client_store_key) as store_code,
            CONCAT('Nâng Cấp Combo DV #', os.service_id, ' - ', COALESCE(sl.service_name, os.service_group, 'Mi/SP')) as item_title,
            'Combo' as item_type,
            0.5 as quantity,
            os.upgrade_price * 0.5 as gross_value,
            os.upgrade_price * 0.5 as net_value,
            0 as debt_amount,
            1 as is_split,
            os.check_in_staff_id as staff_id,
            up_in.full_name as cc_in_name,
            up_out.full_name as cc_out_name
          FROM \`order\` o
          JOIN \`order_service\` os ON os.order_id = o.id
          LEFT JOIN \`service_language\` sl ON sl.service_id = os.service_id AND sl.language_id = 1
          LEFT JOIN \`user_profile\` up_cust ON up_cust.user_id = o.user_id
          LEFT JOIN \`user_profile\` up_in ON up_in.user_id = os.check_in_staff_id
          LEFT JOIN \`user_profile\` up_out ON up_out.user_id = os.check_out_staff_id
          LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
          LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
          WHERE o.order_state = 'Completed'
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${date} 00:00:00'
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${date} 23:59:59'
            AND os.upgrade_price > 0
            AND os.check_in_staff_id IS NOT NULL AND os.check_out_staff_id IS NOT NULL AND os.check_in_staff_id != os.check_out_staff_id

          UNION ALL

          -- CC IN != CC OUT -> 50% to CC OUT (Combo Upgrade)
          SELECT 
            os.id as order_service_id,
            o.id as order_id,
            DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%H:%i:%s') as order_time,
            up_cust.full_name as customer_name,
            UPPER(cs.client_store_key) as store_code,
            CONCAT('Nâng Cấp Combo DV #', os.service_id, ' - ', COALESCE(sl.service_name, os.service_group, 'Mi/SP')) as item_title,
            'Combo' as item_type,
            0.5 as quantity,
            os.upgrade_price * 0.5 as gross_value,
            os.upgrade_price * 0.5 as net_value,
            0 as debt_amount,
            1 as is_split,
            os.check_out_staff_id as staff_id,
            up_in.full_name as cc_in_name,
            up_out.full_name as cc_out_name
          FROM \`order\` o
          JOIN \`order_service\` os ON os.order_id = o.id
          LEFT JOIN \`service_language\` sl ON sl.service_id = os.service_id AND sl.language_id = 1
          LEFT JOIN \`user_profile\` up_cust ON up_cust.user_id = o.user_id
          LEFT JOIN \`user_profile\` up_in ON up_in.user_id = os.check_in_staff_id
          LEFT JOIN \`user_profile\` up_out ON up_out.user_id = os.check_out_staff_id
          LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
          LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
          WHERE o.order_state = 'Completed'
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${date} 00:00:00'
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${date} 23:59:59'
            AND os.upgrade_price > 0
            AND os.check_in_staff_id IS NOT NULL AND os.check_out_staff_id IS NOT NULL AND os.check_in_staff_id != os.check_out_staff_id

          UNION ALL

          -- Same CC or single CC -> 100% to single staff (Combo Upgrade)
          SELECT 
            os.id as order_service_id,
            o.id as order_id,
            DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%H:%i:%s') as order_time,
            up_cust.full_name as customer_name,
            UPPER(cs.client_store_key) as store_code,
            CONCAT('Nâng Cấp Combo DV #', os.service_id, ' - ', COALESCE(sl.service_name, os.service_group, 'Mi/SP')) as item_title,
            'Combo' as item_type,
            1.0 as quantity,
            os.upgrade_price * 1.0 as gross_value,
            os.upgrade_price * 1.0 as net_value,
            0 as debt_amount,
            0 as is_split,
            COALESCE(os.check_in_staff_id, os.check_out_staff_id, os.assigned_staff_id, o.created_staff_id) as staff_id,
            up_in.full_name as cc_in_name,
            up_out.full_name as cc_out_name
          FROM \`order\` o
          JOIN \`order_service\` os ON os.order_id = o.id
          LEFT JOIN \`service_language\` sl ON sl.service_id = os.service_id AND sl.language_id = 1
          LEFT JOIN \`user_profile\` up_cust ON up_cust.user_id = o.user_id
          LEFT JOIN \`user_profile\` up_in ON up_in.user_id = os.check_in_staff_id
          LEFT JOIN \`user_profile\` up_out ON up_out.user_id = os.check_out_staff_id
          LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
          LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
          WHERE o.order_state = 'Completed'
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${date} 00:00:00'
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${date} 23:59:59'
            AND os.upgrade_price > 0
            AND (os.check_in_staff_id IS NULL OR os.check_out_staff_id IS NULL OR os.check_in_staff_id = os.check_out_staff_id)
        ) sub
        ${subStaffFilter}
      `;

      // Query Debt Payments
      const debtPaymentQuery = `
        SELECT 
          udp.id as order_service_id,
          ud.order_id as order_id,
          DATE_FORMAT(udp.date_created, '%H:%i:%s') as order_time,
          up_cust.full_name as customer_name,
          'PXL' as store_code,
          'Thu Nợ Khoản Nợ Cũ' as item_title,
          'Combo' as item_type,
          1 as quantity,
          udp.paid_amount as gross_value,
          udp.paid_amount as net_value,
          0 as debt_amount,
          0 as is_split,
          NULL as cc_in_name,
          NULL as cc_out_name
        FROM \`user_debt_payment\` udp
        JOIN \`user_debt\` ud ON ud.id = udp.user_debt_id
        LEFT JOIN \`user_profile\` up_cust ON up_cust.user_id = ud.user_id
        WHERE udp.date_created >= '${date} 00:00:00'
          AND udp.date_created <= '${date} 23:59:59'
          ${staffFilterUdp}
      `;

      const [comboRows, comboUpgradeRows, productRows, serviceRows, debtPaymentRows] = await Promise.all([
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(comboQuery),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(comboUpgradeQuery),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(productQuery),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(serviceQuery),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(debtPaymentQuery),
      ]);

      const allRows = [...comboRows, ...comboUpgradeRows, ...productRows, ...serviceRows, ...debtPaymentRows].sort(
        (a, b) => (b.order_time || '').localeCompare(a.order_time || '')
      );

      // Compute total qualifying sales for matching the tier rate
      const totalQualifyingSales = Math.round(
        allRows.reduce((sum, r) => sum + (r.item_type !== 'Service' ? Number(r.net_value || 0) : 0), 0)
      );

      const matchedTierRate =
        totalQualifyingSales >= 30000000
          ? 3.0
          : totalQualifyingSales >= 25000000
            ? 2.5
            : totalQualifyingSales >= 20000000
              ? 2.5
              : totalQualifyingSales >= 15000000
                ? 2.0
                : totalQualifyingSales >= 10000000
                  ? 1.5
                  : totalQualifyingSales >= 5000000
                    ? 1.0
                    : 0.5;

      const transactions: DailySalesBonusTransaction[] = allRows.map((r) => {
        const item_type = r.item_type as 'Combo' | 'Product' | 'Service';
        const gross_value = Math.round(Number(r.gross_value || 0));
        const net_value = Math.round(Number(r.net_value || 0));
        const debt_amount = Math.round(Number(r.debt_amount || 0));
        const recorded_bonus = item_type !== 'Service' ? Math.round((net_value * matchedTierRate) / 100) : 0;

        return {
          order_service_id: Number(r.order_service_id),
          order_id: Number(r.order_id),
          order_time: r.order_time || '10:00:00',
          customer_name: r.customer_name || 'Khách Hàng',
          store_code: r.store_code || 'PXL',
          item_title: r.item_title,
          item_type,
          payment_value: net_value,
          gross_value,
          net_value,
          debt_amount,
          recorded_bonus,
          is_split: Boolean(r.is_split),
          cc_in_name: r.cc_in_name || null,
          cc_out_name: r.cc_out_name || null,
        };
      });

      return {
        data: transactions,
        total: transactions.length,
        matchedTierRate,
        totalQualifyingSales,
      };
    } catch (err) {
      fastify.log.error(err as Error, 'Get daily sales bonus transactions error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể tải chi tiết giao dịch.' });
    }
  });
}
