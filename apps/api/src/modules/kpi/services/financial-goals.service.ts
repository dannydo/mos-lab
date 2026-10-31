import { FastifyInstance } from 'fastify';
import {
  FinancialGoalsConfigDto,
  FinancialGoalsOverview,
  FinancialGoalItem,
  FinancialGoalKey,
  FinancialGoalPacingStatus,
  SafeAny,
} from '@mos-lab/shared';

export const DEFAULT_FINANCIAL_GOALS_CONFIG: FinancialGoalsConfigDto = {
  month: '2026-11',
  totalRevenueTarget: 850_000_000,
  comboRevenueTarget: 550_000_000,
  retailRevenueTarget: 250_000_000,
  productRevenueTarget: 50_000_000,
  note: 'Chỉ tiêu KPI doanh thu toàn hệ thống Wings Lashes',
};

export class FinancialGoalsService {
  private static getConfigKey(month: string): string {
    return `FINANCIAL_GOALS_CONFIG_${month}`;
  }

  static async getConfig(fastify: FastifyInstance, month: string): Promise<FinancialGoalsConfigDto> {
    const key = this.getConfigKey(month);
    const existing = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key },
    });

    if (existing?.value) {
      try {
        const parsed = JSON.parse(existing.value);
        return {
          month,
          totalRevenueTarget: Number(parsed.totalRevenueTarget ?? 850_000_000),
          comboRevenueTarget: Number(parsed.comboRevenueTarget ?? 550_000_000),
          retailRevenueTarget: Number(parsed.retailRevenueTarget ?? 250_000_000),
          productRevenueTarget: Number(parsed.productRevenueTarget ?? 50_000_000),
          note: parsed.note || undefined,
          updatedAt: parsed.updatedAt || undefined,
          updatedBy: parsed.updatedBy || undefined,
        };
      } catch {
        // Fall back to default
      }
    }

    return {
      ...DEFAULT_FINANCIAL_GOALS_CONFIG,
      month,
    };
  }

  static async saveConfig(
    fastify: FastifyInstance,
    input: FinancialGoalsConfigDto,
    authorName?: string
  ): Promise<FinancialGoalsConfigDto> {
    if (!/^\d{4}-\d{2}$/.test(input.month)) {
      throw new Error('Định dạng tháng không hợp lệ (YYYY-MM).');
    }

    const cleanConfig: FinancialGoalsConfigDto = {
      month: input.month,
      totalRevenueTarget: Math.max(0, Math.round(Number(input.totalRevenueTarget || 0))),
      comboRevenueTarget: Math.max(0, Math.round(Number(input.comboRevenueTarget || 0))),
      retailRevenueTarget: Math.max(0, Math.round(Number(input.retailRevenueTarget || 0))),
      productRevenueTarget: Math.max(0, Math.round(Number(input.productRevenueTarget || 0))),
      note: typeof input.note === 'string' ? input.note.trim() : undefined,
      updatedAt: new Date().toISOString(),
      updatedBy: authorName || 'Admin',
    };

    const key = this.getConfigKey(input.month);
    const value = JSON.stringify(cleanConfig);

    await fastify.prisma.crm.crmConfig.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: { key, value },
    });

    // Invalidate cached overview
    fastify.cache?.invalidatePattern(`^kpi:financial-goals:${input.month}`);

    return cleanConfig;
  }

  static async getOverview(fastify: FastifyInstance, rawMonth?: string): Promise<FinancialGoalsOverview> {
    // 1. Determine valid target month in Vietnam Timezone
    const vnNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const currentYear = vnNow.getFullYear();
    const currentMonthNum = vnNow.getMonth() + 1;
    const currentDay = vnNow.getDate();
    const currentYm = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

    const month = typeof rawMonth === 'string' && /^\d{4}-\d{2}$/.test(rawMonth) ? rawMonth : currentYm;

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, m, 0).getDate();

    const startDateStr = `${month}-01 00:00:00`;
    const endDateStr = `${month}-${String(daysInMonth).padStart(2, '0')} 23:59:59`;

    // 2. Determine Period Status and Time Elapsed
    let periodStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' = 'IN_PROGRESS';
    let workDaysElapsed = 0;
    let workDaysRemaining = 0;

    if (month > currentYm) {
      periodStatus = 'NOT_STARTED';
      workDaysElapsed = 0;
      workDaysRemaining = daysInMonth;
    } else if (month < currentYm) {
      periodStatus = 'COMPLETED';
      workDaysElapsed = daysInMonth;
      workDaysRemaining = 0;
    } else {
      periodStatus = 'IN_PROGRESS';
      workDaysElapsed = Math.min(daysInMonth, currentDay);
      workDaysRemaining = Math.max(0, daysInMonth - workDaysElapsed);
    }

    const pacingRatio = daysInMonth > 0 ? Number((workDaysElapsed / daysInMonth).toFixed(4)) : 0;

    // 3. Load Target Configuration
    const configKey = this.getConfigKey(month);
    const existingConfigRecord = await fastify.prisma.crm.crmConfig.findUnique({ where: { key: configKey } });
    const isConfigured = Boolean(existingConfigRecord?.value);
    const config = await this.getConfig(fastify, month);

    // 4. Query Actual Completed Orders for the entire month
    const rawOrders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `
      SELECT 
        o.id as orderId,
        o.total_price,
        COALESCE(o.booking_date_end, ro.actual_booking_date_start, o.booking_date_start) as checkin_time,
        DATE_FORMAT(COALESCE(o.booking_date_end, ro.actual_booking_date_start, o.booking_date_start), '%Y-%m-%d') as checkin_date
      FROM \`order\` o
      LEFT JOIN report_order ro ON o.id = ro.order_id
      WHERE o.order_state = 'Completed'
        AND (
          (o.booking_date_end >= ? AND o.booking_date_end <= ?)
          OR (
            o.booking_date_end IS NULL
            AND ro.actual_booking_date_start >= ? AND ro.actual_booking_date_start <= ?
          )
          OR (
            o.booking_date_end IS NULL AND ro.actual_booking_date_start IS NULL
            AND o.booking_date_start >= ? AND o.booking_date_start <= ?
          )
        )
      ORDER BY checkin_time ASC
    `,
      startDateStr,
      endDateStr,
      startDateStr,
      endDateStr,
      startDateStr,
      endDateStr
    );

    // 5. Query combo and product line items for revenue attribution
    const orderIds = rawOrders.map((o) => Number(o.orderId)).filter((id) => id > 0);
    const combosMap: Record<number, number> = {};
    const productsMap: Record<number, number> = {};

    if (orderIds.length > 0) {
      for (let i = 0; i < orderIds.length; i += 2000) {
        const chunk = orderIds.slice(i, i + 2000).join(',');
        const [combos, products] = await Promise.all([
          fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
            SELECT order_id, SUM(total_price) as total 
            FROM order_service_combo 
            WHERE order_id IN (${chunk}) 
            GROUP BY order_id
          `),
          fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
            SELECT order_id, SUM(total_price) as total 
            FROM order_product 
            WHERE order_id IN (${chunk}) 
            GROUP BY order_id
          `),
        ]);

        combos.forEach((c) => {
          combosMap[Number(c.order_id)] = Number(c.total || 0);
        });
        products.forEach((p) => {
          productsMap[Number(p.order_id)] = Number(p.total || 0);
        });
      }
    }

    // 6. Aggregate Revenue with mOS standard classification & scaling rules
    const dailyMap = new Map<
      string,
      { totalRevenue: number; comboRevenue: number; retailRevenue: number; productRevenue: number; orderCount: number }
    >();

    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = `${month}-${String(day).padStart(2, '0')}`;
      dailyMap.set(dStr, {
        totalRevenue: 0,
        comboRevenue: 0,
        retailRevenue: 0,
        productRevenue: 0,
        orderCount: 0,
      });
    }

    let actualTotal = 0;
    let actualCombo = 0;
    let actualRetail = 0;
    let actualProduct = 0;

    for (const o of rawOrders) {
      const comboRev = combosMap[o.orderId] || 0;
      const productRev = productsMap[o.orderId] || 0;
      const orderTotal = Number(o.total_price || 0);

      let finalRevCombo = comboRev;
      let finalRevProduct = productRev;
      let finalRevLe = 0;

      if (orderTotal < 0) {
        if (comboRev + productRev === 0) {
          finalRevLe = orderTotal;
        } else {
          const scale = orderTotal / (comboRev + productRev);
          finalRevCombo = comboRev * scale;
          finalRevProduct = productRev * scale;
        }
      } else {
        if (comboRev + productRev > orderTotal) {
          const scale = orderTotal / (comboRev + productRev);
          finalRevCombo = comboRev * scale;
          finalRevProduct = productRev * scale;
        } else {
          finalRevLe = orderTotal - comboRev - productRev;
        }
      }

      const orderFinalRev = finalRevCombo + finalRevProduct + finalRevLe;

      actualTotal += orderFinalRev;
      actualCombo += finalRevCombo;
      actualRetail += finalRevLe;
      actualProduct += finalRevProduct;

      const dateKey = String(o.checkin_date || '').slice(0, 10);
      const dayEntry = dailyMap.get(dateKey);
      if (dayEntry) {
        dayEntry.totalRevenue += orderFinalRev;
        dayEntry.comboRevenue += finalRevCombo;
        dayEntry.retailRevenue += finalRevLe;
        dayEntry.productRevenue += finalRevProduct;
        dayEntry.orderCount += 1;
      }
    }

    actualTotal = Math.round(actualTotal);
    actualCombo = Math.round(actualCombo);
    actualRetail = Math.round(actualRetail);
    actualProduct = Math.round(actualProduct);

    // 7. Build Daily Pacing & Breakdown
    const daysOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    let runningCumulative = 0;
    const dailyBreakdown = Array.from(dailyMap.entries()).map(([dateStr, item]) => {
      runningCumulative += Math.round(item.totalRevenue);
      const d = new Date(`${dateStr}T00:00:00+07:00`);
      return {
        date: dateStr,
        dayOfWeek: daysOfWeek[d.getDay()] || '',
        totalRevenue: Math.round(item.totalRevenue),
        comboRevenue: Math.round(item.comboRevenue),
        retailRevenue: Math.round(item.retailRevenue),
        productRevenue: Math.round(item.productRevenue),
        cumulativeTotal: runningCumulative,
        orderCount: item.orderCount,
      };
    });

    // 8. Build KPI Item Helper
    function buildGoalItem(
      key: FinancialGoalKey,
      label: string,
      target: number,
      actual: number,
      totalActual: number
    ): FinancialGoalItem {
      const percent = target > 0 ? Number(((actual / target) * 100).toFixed(1)) : 0;
      const remaining = Math.max(0, target - actual);
      const surplus = Math.max(0, actual - target);
      const isAchieved = target > 0 && actual >= target;
      const expected = Math.round(target * pacingRatio);
      const gap = Math.round(actual - expected);
      const dailyRequired = workDaysRemaining > 0 ? Math.round(remaining / workDaysRemaining) : 0;

      let goalPacingStatus: FinancialGoalPacingStatus = 'NOT_STARTED';
      let goalPacingStatusLabel = 'Chưa bắt đầu';

      if (periodStatus === 'NOT_STARTED') {
        goalPacingStatus = 'NOT_STARTED';
        goalPacingStatusLabel = 'Chưa bắt đầu';
      } else if (periodStatus === 'COMPLETED') {
        goalPacingStatus = 'COMPLETED';
        goalPacingStatusLabel = isAchieved ? 'Đã hoàn thành' : 'Chưa đạt';
      } else {
        if (isAchieved) {
          goalPacingStatus = 'AHEAD';
          goalPacingStatusLabel = 'Vượt mục tiêu';
        } else if (expected > 0 && actual / expected >= 1.05) {
          goalPacingStatus = 'AHEAD';
          goalPacingStatusLabel = 'Vượt nhịp';
        } else if (expected > 0 && actual / expected >= 0.95) {
          goalPacingStatus = 'ON_TRACK';
          goalPacingStatusLabel = 'Đúng nhịp';
        } else {
          goalPacingStatus = 'BEHIND';
          goalPacingStatusLabel = 'Chậm nhịp';
        }
      }

      const sharePercent = totalActual > 0 ? Number(((actual / totalActual) * 100).toFixed(1)) : 0;

      return {
        key,
        label,
        target,
        actual,
        percent,
        gap,
        remaining,
        surplus,
        isAchieved,
        pacingStatus: goalPacingStatus,
        pacingStatusLabel: goalPacingStatusLabel,
        dailyRequired,
        sharePercent,
      };
    }

    const kpiMain = buildGoalItem('total', 'Tổng Doanh Thu', config.totalRevenueTarget, actualTotal, actualTotal);
    const kpiSub = {
      combo: buildGoalItem('combo', 'Doanh Thu Combo', config.comboRevenueTarget, actualCombo, actualTotal),
      retail: buildGoalItem('retail', 'Doanh Thu Khách Lẻ', config.retailRevenueTarget, actualRetail, actualTotal),
      product: buildGoalItem('product', 'Doanh Thu Sản Phẩm', config.productRevenueTarget, actualProduct, actualTotal),
    };

    return {
      month,
      daysInMonth,
      workDaysElapsed,
      workDaysRemaining,
      periodStatus,
      pacingRatio,
      kpiMain,
      kpiSub,
      dailyBreakdown,
      config,
      isConfigured,
    };
  }

  static async listMonths(fastify: FastifyInstance): Promise<string[]> {
    const records = await fastify.prisma.crm.crmConfig.findMany({
      where: { key: { startsWith: 'FINANCIAL_GOALS_CONFIG_' } },
      select: { key: true },
    });

    const set = new Set<string>();
    records.forEach((r) => {
      const match = r.key.match(/^FINANCIAL_GOALS_CONFIG_(\d{4}-\d{2})$/);
      if (match) set.add(match[1]);
    });

    // Always include nearby window (past 6 months to next 3 months)
    const vnNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    for (let offset = -6; offset <= 3; offset++) {
      const d = new Date(vnNow.getFullYear(), vnNow.getMonth() + offset, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      set.add(ym);
    }

    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }
}
