import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middlewares/auth.js';
import {
  DailySalesBonusConfig,
  DailySalesBonusConsultantRecord,
  DailySalesBonusTransaction,
  SafeAny,
} from '@mos-lab/shared';

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

async function getActiveCcIds(fastify: FastifyInstance): Promise<number[] | null> {
  try {
    const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: 'ACTIVE_CC_STAFF_CONFIG' },
    });
    if (configRecord && configRecord.value) {
      const ids = JSON.parse(configRecord.value);
      if (Array.isArray(ids) && ids.length > 0) {
        return ids.map(Number);
      }
    }
  } catch (err) {
    fastify.log.warn(err as SafeAny, 'Error fetching ACTIVE_CC_STAFF_CONFIG in gamification routes');
  }
  return null;
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
      const endStr = dateTo || new Date().toLocaleDateString('en-CA');

      const _config = await getBonusConfig(fastify);
      const activeCcIds = await getActiveCcIds(fastify);

      try {
        // Fetch CC staff profiles (filtered strictly by Global CC Config if configured)
        let staffFilterClause = `up.provider = 'Staff' AND up.is_disabled = 0 AND (
        ugl.user_group_name LIKE '%Client Consultant%'
        OR up.user_id IN (SELECT DISTINCT user_id FROM staff_payroll_client_consultant)
        OR up.full_name LIKE '%CC%'
        OR up.user_id IN (SELECT DISTINCT check_in_staff_id FROM order_service WHERE check_in_staff_id IS NOT NULL)
      )`;

        if (activeCcIds && activeCcIds.length > 0) {
          staffFilterClause += ` AND up.user_id IN (${activeCcIds.join(',')})`;
        }

        if (consultantId && consultantId !== 'ALL') {
          if (!isNaN(Number(consultantId))) {
            staffFilterClause += ` AND up.user_id = ${Number(consultantId)}`;
          } else {
            const escapedName = consultantId.replace(/'/g, "''");
            staffFilterClause += ` AND up.full_name LIKE '%${escapedName}%'`;
          }
        }

        const staffProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT DISTINCT up.user_id as userId, up.full_name as displayName, up.avatar as avatar
        FROM \`user_profile\` up
        JOIN \`staff_profile\` sp ON sp.user_id = up.user_id
        LEFT JOIN \`user_group_language\` ugl ON up.user_group_id = ugl.user_group_id
        WHERE ${staffFilterClause}
        ORDER BY up.full_name ASC
      `);

        if (staffProfiles.length === 0) {
          return { data: [], total: 0, activeStaff: [] };
        }

        const staffMap = new Map<number, { name: string; avatar: string | null; store: string }>();
        staffProfiles.forEach((s) => {
          staffMap.set(Number(s.userId), {
            name: s.displayName,
            avatar: s.avatar ? String(s.avatar) : null,
            store: s.displayName.includes('PXL') ? 'PXL' : 'De Tham',
          });
        });

        const staffIds = Array.from(staffMap.keys());
        const staffIdsListStr = staffIds.join(',');

        let storeFilterClause = '';
        if (storeId && storeId !== 'ALL') {
          const escapedStore = storeId.toLowerCase().replace(/'/g, "''");
          storeFilterClause = ` AND LOWER(cs.client_store_key) LIKE '%${escapedStore}%'`;
        }

        // 1. Query Single Services (order_service)
        const singleSqlQuery = `
        SELECT 
          DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%Y-%m-%d') as sale_date,
          COALESCE(os.check_in_staff_id, os.check_out_staff_id, os.assigned_staff_id, o.created_staff_id) as staff_id,
          os.id as order_service_id,
          os.quantity,
          (os.total_price - os.tax_amount) as total_price,
          os.tax_amount,
          o.is_debt,
          UPPER(cs.client_store_key) as store_code
        FROM \`order\` o
        JOIN \`order_service\` os ON os.order_id = o.id
        LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
        LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
        WHERE o.order_state = 'Completed'
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${startStr} 00:00:00'
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${endStr} 23:59:59'
          AND COALESCE(os.check_in_staff_id, os.check_out_staff_id, os.assigned_staff_id, o.created_staff_id) IN (${staffIdsListStr})
          ${storeFilterClause}
          AND LOWER(COALESCE(os.service_group, '')) NOT LIKE '%combo%'
          AND LOWER(COALESCE(os.service_type, '')) NOT LIKE '%combo%'
          AND LOWER(COALESCE(os.service_group, '')) NOT LIKE '%product%'
        ORDER BY sale_date DESC, staff_id ASC
      `;

        // 2. Query Combo Packages (order_service_combo)
        const comboSqlQuery = `
        SELECT 
          DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%Y-%m-%d') as sale_date,
          COALESCE(
            osc.check_in_staff_id,
            osc.check_out_staff_id,
            (SELECT os.check_in_staff_id FROM \`order_service\` os WHERE os.order_id = osc.order_id AND os.check_in_staff_id IS NOT NULL LIMIT 1),
            (SELECT os.check_out_staff_id FROM \`order_service\` os WHERE os.order_id = osc.order_id AND os.check_out_staff_id IS NOT NULL LIMIT 1),
            (SELECT os.assigned_staff_id FROM \`order_service\` os WHERE os.order_id = osc.order_id AND os.assigned_staff_id IS NOT NULL LIMIT 1),
            o.assigned_staff_id,
            o.created_staff_id
          ) as staff_id,
          osc.quantity,
          (osc.total_price - osc.tax_amount) as total_price,
          osc.tax_amount,
          UPPER(cs.client_store_key) as store_code
        FROM \`order\` o
        JOIN \`order_service_combo\` osc ON osc.order_id = o.id
        LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
        LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
        WHERE o.order_state = 'Completed'
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${startStr} 00:00:00'
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${endStr} 23:59:59'
          AND COALESCE(
            osc.check_in_staff_id,
            osc.check_out_staff_id,
            (SELECT os.check_in_staff_id FROM \`order_service\` os WHERE os.order_id = osc.order_id AND os.check_in_staff_id IS NOT NULL LIMIT 1),
            (SELECT os.check_out_staff_id FROM \`order_service\` os WHERE os.order_id = osc.order_id AND os.check_out_staff_id IS NOT NULL LIMIT 1),
            (SELECT os.assigned_staff_id FROM \`order_service\` os WHERE os.order_id = osc.order_id AND os.assigned_staff_id IS NOT NULL LIMIT 1),
            o.assigned_staff_id,
            o.created_staff_id
          ) IN (${staffIdsListStr})
          ${storeFilterClause}
      `;

        // 3. Query Physical Products (order_product)
        const productSqlQuery = `
        SELECT 
          DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%Y-%m-%d') as sale_date,
          COALESCE(
            op.created_staff_id,
            (SELECT os.check_in_staff_id FROM \`order_service\` os WHERE os.order_id = op.order_id AND os.check_in_staff_id IS NOT NULL LIMIT 1),
            o.assigned_staff_id,
            o.created_staff_id
          ) as staff_id,
          op.quantity,
          (op.total_price - op.tax_amount) as total_price,
          op.tax_amount,
          UPPER(cs.client_store_key) as store_code
        FROM \`order\` o
        JOIN \`order_product\` op ON op.order_id = o.id
        LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
        LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
        WHERE o.order_state = 'Completed'
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${startStr} 00:00:00'
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${endStr} 23:59:59'
          AND COALESCE(
            op.created_staff_id,
            (SELECT os.check_in_staff_id FROM \`order_service\` os WHERE os.order_id = op.order_id AND os.check_in_staff_id IS NOT NULL LIMIT 1),
            o.assigned_staff_id,
            o.created_staff_id
          ) IN (${staffIdsListStr})
          ${storeFilterClause}
      `;

        // 4. Query Debt Payments (user_debt_payment)
        const debtPaymentSqlQuery = `
        SELECT 
          DATE_FORMAT(udp.date_created, '%Y-%m-%d') as sale_date,
          COALESCE(udp.created_staff_id, ud.user_debt_payment_staff_id, ud.created_staff_id) as staff_id,
          SUM(udp.paid_amount) as debt_collected
        FROM \`user_debt_payment\` udp
        JOIN \`user_debt\` ud ON ud.id = udp.user_debt_id
        WHERE udp.date_created >= '${startStr} 00:00:00'
          AND udp.date_created <= '${endStr} 23:59:59'
          AND COALESCE(udp.created_staff_id, ud.user_debt_payment_staff_id, ud.created_staff_id) IN (${staffIdsListStr})
        GROUP BY sale_date, staff_id
      `;

        // 5. Query New Debts (user_debt)
        const newDebtSqlQuery = `
        SELECT 
          DATE_FORMAT(ud.date_created, '%Y-%m-%d') as sale_date,
          ud.created_staff_id as staff_id,
          SUM(ud.debt_amount) as debt_amount
        FROM \`user_debt\` ud
        WHERE ud.date_created >= '${startStr} 00:00:00'
          AND ud.date_created <= '${endStr} 23:59:59'
          AND ud.created_staff_id IN (${staffIdsListStr})
        GROUP BY sale_date, staff_id
      `;

        // 6. Query Green Circle Visits (Lượt khách đi lẻ hoặc còn 1 combo cuối)
        const greenVisitSqlQuery = `
        SELECT 
          DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%Y-%m-%d') as sale_date,
          COALESCE(os.check_in_staff_id, os.check_out_staff_id, os.assigned_staff_id, o.created_staff_id) as staff_id,
          COUNT(os.id) as green_visits
        FROM \`order\` o
        JOIN \`order_service\` os ON os.order_id = o.id
        LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
        WHERE o.order_state = 'Completed'
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${startStr} 00:00:00'
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${endStr} 23:59:59'
          AND COALESCE(os.check_in_staff_id, os.check_out_staff_id, os.assigned_staff_id, o.created_staff_id) IN (${staffIdsListStr})
          ${storeFilterClause}
          AND (os.user_service_type != 'combo' OR os.user_service_type = 'combo_last')
        GROUP BY sale_date, staff_id
      `;

        // 7. Query Total Visits (Tổng lượt khách đã tiếp)
        const totalVisitSqlQuery = `
        SELECT 
          DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%Y-%m-%d') as sale_date,
          COALESCE(os.check_in_staff_id, os.check_out_staff_id, os.assigned_staff_id, o.created_staff_id) as staff_id,
          COUNT(os.id) as total_visits
        FROM \`order\` o
        JOIN \`order_service\` os ON os.order_id = o.id
        LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
        WHERE o.order_state = 'Completed'
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${startStr} 00:00:00'
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${endStr} 23:59:59'
          AND COALESCE(os.check_in_staff_id, os.check_out_staff_id, os.assigned_staff_id, o.created_staff_id) IN (${staffIdsListStr})
          ${storeFilterClause}
        GROUP BY sale_date, staff_id
      `;

        const [singleRows, comboRows, productRows, debtPaymentRows, newDebtRows, greenVisitRows, totalVisitRows] =
          await Promise.all([
            fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(singleSqlQuery),
            fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(comboSqlQuery),
            fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(productSqlQuery),
            fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(debtPaymentSqlQuery),
            fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(newDebtSqlQuery),
            fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(greenVisitSqlQuery),
            fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(totalVisitSqlQuery),
          ]);

        // Group by Date + Staff
        const mapKey = (d: string, uid: number) => `${d}_${uid}`;
        const grouped = new Map<string, DailySalesBonusConsultantRecord>();

        const getOrCreateRecord = (d: string, uid: number, store_code?: string) => {
          const k = mapKey(d, uid);
          if (!grouped.has(k)) {
            const sInfo = staffMap.get(uid) || { name: `Staff #${uid}`, avatar: null, store: 'PXL' };
            grouped.set(k, {
              id: k,
              date: d,
              user_id: uid,
              consultant_name: sInfo.name,
              avatar: sInfo.avatar,
              store_code: store_code || sInfo.store,
              single_sales: 0,
              combo_sales: 0,
              combo_count: 0,
              product_sales: 0,
              product_count: 0,
              debt_collected: 0,
              vat: 0,
              debt: 0,
              total_sales: 0,
              commission_rate_percent: 0,
              daily_bonus: 0,
              green_visits: 0,
              total_visits: 0,
            });
          }
          return grouped.get(k)!;
        };

        // Accumulate Single Services
        singleRows.forEach((row) => {
          const rec = getOrCreateRecord(row.sale_date, Number(row.staff_id), row.store_code);
          const price = Number(row.total_price || 0);
          const tax = Number(row.tax_amount || 0);

          rec.single_sales += price;
          rec.vat += tax;
        });

        // Accumulate Combos
        comboRows.forEach((row) => {
          const rec = getOrCreateRecord(row.sale_date, Number(row.staff_id), row.store_code);
          const price = Number(row.total_price || 0);
          const qty = Number(row.quantity || 1);
          const tax = Number(row.tax_amount || 0);

          rec.combo_sales += price;
          rec.combo_count! += qty;
          rec.vat += tax;
        });

        // Accumulate Products
        productRows.forEach((row) => {
          const rec = getOrCreateRecord(row.sale_date, Number(row.staff_id), row.store_code);
          const price = Number(row.total_price || 0);
          const qty = Number(row.quantity || 1);
          const tax = Number(row.tax_amount || 0);

          rec.product_sales += price;
          rec.product_count! += qty;
          rec.vat += tax;
        });

        // Accumulate Debt Payments (Thu Nợ)
        debtPaymentRows.forEach((row) => {
          const rec = getOrCreateRecord(row.sale_date, Number(row.staff_id));
          rec.debt_collected += Number(row.debt_collected || 0);
        });

        // Accumulate New Debts (Nợ Mới)
        newDebtRows.forEach((row) => {
          const rec = getOrCreateRecord(row.sale_date, Number(row.staff_id));
          rec.debt += Number(row.debt_amount || 0);
        });

        // Accumulate Green Circle Visits
        greenVisitRows.forEach((row) => {
          const rec = getOrCreateRecord(row.sale_date, Number(row.staff_id));
          rec.green_visits = (rec.green_visits || 0) + Number(row.green_visits || 0);
        });

        // Accumulate Total Visits
        totalVisitRows.forEach((row) => {
          const rec = getOrCreateRecord(row.sale_date, Number(row.staff_id));
          rec.total_visits = (rec.total_visits || 0) + Number(row.total_visits || 0);
        });

        // Calculate totals, matching commission rate percent, and daily bonus
        const result: DailySalesBonusConsultantRecord[] = Array.from(grouped.values()).map((rec) => {
          rec.single_sales = Math.round(rec.single_sales);
          rec.combo_sales = Math.round(rec.combo_sales);
          rec.product_sales = Math.round(rec.product_sales);
          rec.debt_collected = Math.round(rec.debt_collected);
          rec.vat = Math.round(rec.vat);
          rec.debt = Math.round(rec.debt);

          // Total Sales for Bonus: Combo Sales + Product Sales + Debt Collected
          const qualifyingSales = rec.combo_sales + rec.product_sales + rec.debt_collected;
          const total_sales = Math.round(Math.max(0, qualifyingSales));
          rec.total_sales = total_sales;

          // Match tier based on Total Sales before VAT
          let matchedTierRate: number;
          if (total_sales >= 20000000) {
            matchedTierRate = 2.5;
          } else if (total_sales >= 15000000) {
            matchedTierRate = 2.0;
          } else if (total_sales >= 10000000) {
            matchedTierRate = 1.5;
          } else if (total_sales >= 5000000) {
            matchedTierRate = 1.0;
          } else {
            matchedTierRate = 0.5;
          }
          rec.commission_rate_percent = matchedTierRate;

          // Daily Bonus: % Bonus on Total Sales
          rec.daily_bonus = Math.round((total_sales * matchedTierRate) / 100);

          return rec;
        });

        // Calculate Real-time Run-rate Elapsed Ratio (11:00 AM - 23:00 PM shift formula)
        const now = new Date();
        const currentHour = now.getHours();
        let fractionToday = 0;
        if (currentHour < 11) {
          fractionToday = 0;
        } else if (currentHour > 22) {
          fractionToday = 1;
        } else {
          fractionToday = (currentHour - 11 + 1) / 12;
        }

        const startDate = new Date(startStr);
        const endDate = new Date(endStr);
        const todayDate = new Date(now.toISOString().slice(0, 10));

        const totalDays = Math.max(
          1,
          Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
        );

        let elapsedRatio = 1.0;
        if (todayDate < startDate) {
          elapsedRatio = 0.001;
        } else if (todayDate > endDate) {
          elapsedRatio = 1.0;
        } else {
          const daysPassedBeforeToday = Math.max(
            0,
            Math.round((todayDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          );
          const totalElapsedDays = daysPassedBeforeToday + fractionToday;
          elapsedRatio = Math.min(1.0, Math.max(0.001, totalElapsedDays / totalDays));
        }

        const totalComboSales = Math.round(result.reduce((sum, r) => sum + (r.combo_sales || 0), 0));
        const totalProductSales = Math.round(
          result.reduce((sum, r) => sum + (r.product_sales || 0) + (r.single_sales || 0), 0)
        );
        const totalSales = Math.round(
          result.reduce((sum, r) => sum + (r.combo_sales || 0) + (r.product_sales || 0) + (r.single_sales || 0), 0)
        );
        const totalCcBonus = Math.round(result.reduce((sum, r) => sum + (r.daily_bonus || 0), 0));

        const summary = {
          totalComboSales,
          totalProductSales,
          totalSales,
          totalCcBonus,
          projectedComboSales: Math.round(totalComboSales / elapsedRatio),
          projectedProductSales: Math.round(totalProductSales / elapsedRatio),
          projectedTotalSales: Math.round(totalSales / elapsedRatio),
          projectedCcBonus: Math.round(totalCcBonus / elapsedRatio),
          elapsedRatioPercent: Math.round(elapsedRatio * 1000) / 10,
        };

        return {
          data: result,
          total: result.length,
          summary,
          activeStaff: staffProfiles.map((s) => ({
            userId: Number(s.userId),
            displayName: s.displayName,
            avatar: s.avatar ? String(s.avatar) : null,
          })),
        };
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
    const user = request.user as { role: string };
    if (user.role !== 'admin' && user.role !== 'manager') {
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

    const config = await getBonusConfig(fastify);

    try {
      let staffFilterOsc = '';
      let staffFilterOp = '';
      let staffFilterOs = '';
      let staffFilterUdp = '';

      if (consultantId && consultantId !== 'ALL' && !isNaN(Number(consultantId))) {
        const uid = Number(consultantId);
        staffFilterOsc = ` AND COALESCE(
          osc.check_in_staff_id,
          osc.check_out_staff_id,
          (SELECT os.check_in_staff_id FROM \`order_service\` os WHERE os.order_id = osc.order_id AND os.check_in_staff_id IS NOT NULL LIMIT 1),
          (SELECT os.check_out_staff_id FROM \`order_service\` os WHERE os.order_id = osc.order_id AND os.check_out_staff_id IS NOT NULL LIMIT 1),
          (SELECT os.assigned_staff_id FROM \`order_service\` os WHERE os.order_id = osc.order_id AND os.assigned_staff_id IS NOT NULL LIMIT 1),
          o.assigned_staff_id,
          o.created_staff_id
        ) = ${uid}`;

        staffFilterOp = ` AND COALESCE(
          op.created_staff_id,
          (SELECT os.check_in_staff_id FROM \`order_service\` os WHERE os.order_id = op.order_id AND os.check_in_staff_id IS NOT NULL LIMIT 1),
          o.assigned_staff_id,
          o.created_staff_id
        ) = ${uid}`;

        staffFilterOs = ` AND COALESCE(os.check_in_staff_id, os.check_out_staff_id, os.assigned_staff_id, o.created_staff_id) = ${uid}`;

        staffFilterUdp = ` AND COALESCE(udp.created_staff_id, ud.user_debt_payment_staff_id, ud.created_staff_id) = ${uid}`;
      }

      // Query Combos
      const comboQuery = `
        SELECT 
          osc.id as order_service_id,
          o.id as order_id,
          DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%H:%i:%s') as order_time,
          up_cust.full_name as customer_name,
          UPPER(cs.client_store_key) as store_code,
          CONCAT('Combo #', osc.service_id, ' - ', COALESCE(osc.service_group, 'Gói Combo')) as item_title,
          'Combo' as item_type,
          osc.quantity,
          osc.total_price as payment_value
        FROM \`order\` o
        JOIN \`order_service_combo\` osc ON osc.order_id = o.id
        LEFT JOIN \`user_profile\` up_cust ON up_cust.user_id = o.user_id
        LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
        LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
        WHERE o.order_state = 'Completed'
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${date} 00:00:00'
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${date} 23:59:59'
          ${staffFilterOsc}
      `;

      // Query Products
      const productQuery = `
        SELECT 
          op.id as order_service_id,
          o.id as order_id,
          DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%H:%i:%s') as order_time,
          up_cust.full_name as customer_name,
          UPPER(cs.client_store_key) as store_code,
          CONCAT('Sản Phẩm #', op.product_id) as item_title,
          'Product' as item_type,
          op.quantity,
          op.total_price as payment_value
        FROM \`order\` o
        JOIN \`order_product\` op ON op.order_id = o.id
        LEFT JOIN \`user_profile\` up_cust ON up_cust.user_id = o.user_id
        LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
        LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
        WHERE o.order_state = 'Completed'
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${date} 00:00:00'
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${date} 23:59:59'
          ${staffFilterOp}
      `;

      // Query Single Services
      const serviceQuery = `
        SELECT 
          os.id as order_service_id,
          o.id as order_id,
          DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%H:%i:%s') as order_time,
          up_cust.full_name as customer_name,
          UPPER(cs.client_store_key) as store_code,
          CONCAT('DV #', os.service_id, ' - ', COALESCE(os.service_group, 'Mi/SP')) as item_title,
          'Service' as item_type,
          os.quantity,
          os.total_price as payment_value
        FROM \`order\` o
        JOIN \`order_service\` os ON os.order_id = o.id
        LEFT JOIN \`user_profile\` up_cust ON up_cust.user_id = o.user_id
        LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
        LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
        WHERE o.order_state = 'Completed'
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${date} 00:00:00'
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${date} 23:59:59'
          ${staffFilterOs}
          AND LOWER(COALESCE(os.service_group, '')) NOT LIKE '%combo%'
          AND LOWER(COALESCE(os.service_type, '')) NOT LIKE '%combo%'
          AND LOWER(COALESCE(os.service_group, '')) NOT LIKE '%product%'
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
          'Service' as item_type,
          1 as quantity,
          udp.paid_amount as payment_value
        FROM \`user_debt_payment\` udp
        JOIN \`user_debt\` ud ON ud.id = udp.user_debt_id
        LEFT JOIN \`user_profile\` up_cust ON up_cust.user_id = ud.user_id
        WHERE udp.date_created >= '${date} 00:00:00'
          AND udp.date_created <= '${date} 23:59:59'
          ${staffFilterUdp}
      `;

      const [comboRows, productRows, serviceRows, debtPaymentRows] = await Promise.all([
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(comboQuery),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(productQuery),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(serviceQuery),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(debtPaymentQuery),
      ]);

      const allRows = [...comboRows, ...productRows, ...serviceRows, ...debtPaymentRows].sort((a, b) =>
        (b.order_time || '').localeCompare(a.order_time || '')
      );

      const transactions: DailySalesBonusTransaction[] = allRows.map((r) => {
        const item_type = r.item_type as 'Combo' | 'Product' | 'Service';
        const qty = Number(r.quantity || 1);
        const unitBonus =
          item_type === 'Combo' ? config.combo_unit_bonus : item_type === 'Product' ? config.product_unit_bonus : 0;
        const recorded_bonus = qty * unitBonus;

        return {
          order_service_id: Number(r.order_service_id),
          order_id: Number(r.order_id),
          order_time: r.order_time || '10:00:00',
          customer_name: r.customer_name || 'Khách Hàng',
          store_code: r.store_code || 'PXL',
          item_title: r.item_title,
          item_type,
          payment_value: Math.round(Number(r.payment_value || 0)),
          recorded_bonus: Math.round(recorded_bonus),
        };
      });

      return {
        data: transactions,
        total: transactions.length,
      };
    } catch (err) {
      fastify.log.error(err as Error, 'Get daily sales bonus transactions error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể tải chi tiết giao dịch.' });
    }
  });
}
