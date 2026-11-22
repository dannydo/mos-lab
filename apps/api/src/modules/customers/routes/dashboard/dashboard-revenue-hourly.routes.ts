import { FastifyInstance } from 'fastify';
import { RevenueHourlyResponse, SafeAny, calculateFractionToday, isCvRole } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';
import { buildBookerFilterMatcher, getVatRateConfig } from './dashboard-config.routes.js';

export async function registerDashboardRevenueHourlyRoutes(fastify: FastifyInstance) {
  // GET /api/dashboard/today/revenue-hourly
  fastify.get('/dashboard/today/revenue-hourly', { preHandler: [requireAuth] }, async (request, reply) => {
    if (isCvRole(request.user?.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Tài khoản Chuyên Viên không có quyền truy cập dữ liệu doanh thu tổng quan.',
      });
    }

    try {
      const { dateFrom, dateTo, endAt, branchKey, bookerFilter } = request.query as {
        dateFrom: string;
        dateTo: string;
        endAt?: string;
        branchKey?: string;
        bookerFilter?: string;
      };
      if (!dateFrom || !dateTo) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Missing dateFrom or dateTo' });
      }

      const start = dateFrom + ' 00:00:00';
      const end = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(endAt || '')
        ? String(endAt).replace('T', ' ')
        : dateTo + ' 23:59:59';

      // Load only profiles referenced by the selected orders; the old full staff scan dominated short date ranges.
      const staffMap = new Map<number, string>();
      const matchesBookerFilter = await buildBookerFilterMatcher(fastify);

      const branchKeyToStoreIdMap: Record<string, number> = { detham: 6, estella: 16 };
      const targetStoreId = branchKey && branchKey !== 'all' ? branchKeyToStoreIdMap[branchKey] : null;

      const rawOrders: SafeAny[] = await fastify.prisma.legacy.$queryRawUnsafe(
        `
        SELECT 
          o.id as orderId,
          o.total_price,
          o.client_store_id,
          o.created_staff_id,
          COALESCE(o.booking_date_end, ro.actual_booking_date_start, o.booking_date_start) as checkin_time,
          HOUR(COALESCE(o.booking_date_end, ro.actual_booking_date_start, o.booking_date_start)) as checkin_hour
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
        start,
        end,
        start,
        end,
        start,
        end
      );

      const createdStaffIds = Array.from(
        new Set(rawOrders.map((order) => Number(order.created_staff_id)).filter((id) => id > 0))
      );
      if (createdStaffIds.length > 0) {
        const staffProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT up.user_id as userId,
                 TRIM(COALESCE(NULLIF(up.full_name, ''), CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, '')))) as fullName
          FROM \`user_profile\` up
          WHERE up.user_id IN (${createdStaffIds.join(',')})
        `);
        staffProfiles.forEach((staff) =>
          staffMap.set(Number(staff.userId), staff.fullName || `Staff #${staff.userId}`)
        );
      }

      const completedOrders = rawOrders.filter((o) => {
        if (targetStoreId && Number(o.client_store_id) !== targetStoreId) return false;
        const bookerName = o.created_staff_id
          ? staffMap.get(Number(o.created_staff_id)) || 'Nhiều Booker'
          : 'Khách tự đặt';
        return matchesBookerFilter(bookerName, bookerFilter);
      });

      const orderIds = completedOrders.map((o) => o.orderId);

      const combosMap: Record<number, number> = {};
      const productsMap: Record<number, number> = {};

      if (orderIds.length > 0) {
        const orderIdsStr = orderIds.join(',');
        const combos = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT order_id, SUM(total_price) as total FROM order_service_combo WHERE order_id IN (${orderIdsStr}) GROUP BY order_id
        `);
        const products = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT order_id, SUM(total_price) as total FROM order_product WHERE order_id IN (${orderIdsStr}) GROUP BY order_id
        `);

        combos.forEach((c) => (combosMap[c.order_id] = Number(c.total || 0)));
        products.forEach((p) => (productsMap[p.order_id] = Number(p.total || 0)));
      }

      // Branches config
      const storeIdToBranchKey: Record<number, string> = { 6: 'detham', 16: 'estella' };
      const branchKeyToStoreId: Record<string, number> = { detham: 6, estella: 16 };
      const branchKeys = ['detham', 'estella'];

      const branchesInit = () =>
        branchKeys.reduce((acc, key) => {
          acc[key] = {
            branchKey: key,
            totalRevenue: 0,
            comboRevenue: 0,
            singleRevenue: 0,
            productRevenue: 0,
            orderCount: 0,
          };
          return acc;
        }, {} as SafeAny);

      const hourlyData: SafeAny[] = [];
      let globalCumulative = 0;
      for (let h = 9; h <= 23; h++) {
        hourlyData.push({
          hour: h,
          totalRevenue: 0,
          comboRevenue: 0,
          singleRevenue: 0,
          productRevenue: 0,
          cumulativeRevenue: 0,
          orderCount: 0,
          branches: branchesInit(),
        });
      }

      let summaryTotalRevenue = 0;
      let summaryComboRevenue = 0;
      let summarySingleRevenue = 0;
      let summaryProductRevenue = 0;
      let summaryOrderCount = 0;
      let summaryComboCount = 0;

      for (const o of completedOrders) {
        const h = Number(o.checkin_hour);
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
        const branchKey = storeIdToBranchKey[o.client_store_id] || 'detham';

        summaryTotalRevenue += orderFinalRev;
        summaryComboRevenue += finalRevCombo;
        summaryProductRevenue += finalRevProduct;
        summarySingleRevenue += finalRevLe;
        summaryOrderCount++;
        if (finalRevCombo > 0) summaryComboCount++;

        const hourEntry = hourlyData.find((hd) => hd.hour === h);
        if (hourEntry) {
          hourEntry.totalRevenue += orderFinalRev;
          hourEntry.comboRevenue += finalRevCombo;
          hourEntry.productRevenue += finalRevProduct;
          hourEntry.singleRevenue += finalRevLe;
          hourEntry.orderCount++;

          hourEntry.branches[branchKey].totalRevenue += orderFinalRev;
          hourEntry.branches[branchKey].comboRevenue += finalRevCombo;
          hourEntry.branches[branchKey].productRevenue += finalRevProduct;
          hourEntry.branches[branchKey].singleRevenue += finalRevLe;
          hourEntry.branches[branchKey].orderCount++;
        }
      }

      // Compute cumulative
      for (const hd of hourlyData) {
        globalCumulative += hd.totalRevenue;
        hd.cumulativeRevenue = globalCumulative;
      }

      // Query CRM for monthly target
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'MONTHLY_REVENUE_TARGET' },
      });
      let dailyTarget = 0;
      if (config && config.value) {
        const val = Number(config.value);
        if (!isNaN(val)) {
          const vnNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
          const daysInMonth = new Date(vnNow.getFullYear(), vnNow.getMonth() + 1, 0).getDate();
          dailyTarget = Math.round(val / daysInMonth);
        }
      }

      const vnNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
      const currentHour = vnNow.getHours();
      const fractionToday = calculateFractionToday(currentHour);

      const pad2 = (n: number) => String(n).padStart(2, '0');
      const todayStr = `${vnNow.getFullYear()}-${pad2(vnNow.getMonth() + 1)}-${pad2(vnNow.getDate())}`;
      const d1Str = String(dateFrom).slice(0, 10);
      const d2Str = String(dateTo).slice(0, 10);

      const d1 = new Date(`${d1Str}T00:00:00`);
      const d2 = new Date(`${d2Str}T00:00:00`);
      const todayDate = new Date(`${todayStr}T00:00:00`);

      const diffMs = d2.getTime() - d1.getTime();
      const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      const daysInPeriod = Math.max(1, diffDays + 1);

      let elapsedRatio = 1.0;
      if (todayDate < d1) {
        elapsedRatio = 0.001;
      } else if (todayDate > d2) {
        elapsedRatio = 1.0;
      } else {
        const daysPassedBeforeToday = Math.max(
          0,
          Math.round((todayDate.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
        );
        const totalElapsedDays = daysPassedBeforeToday + fractionToday;
        elapsedRatio = Math.min(1.0, Math.max(0.001, totalElapsedDays / daysInPeriod));
      }

      const projectedRevenue =
        elapsedRatio >= 1.0 ? Math.round(summaryTotalRevenue) : Math.round(summaryTotalRevenue / elapsedRatio);

      // Round all numbers for hourlyData and summary
      for (const hd of hourlyData) {
        hd.totalRevenue = Math.round(hd.totalRevenue);
        hd.comboRevenue = Math.round(hd.comboRevenue);
        hd.productRevenue = Math.round(hd.productRevenue);
        hd.singleRevenue = Math.round(hd.singleRevenue);
        hd.cumulativeRevenue = Math.round(hd.cumulativeRevenue);
        for (const bk of branchKeys) {
          hd.branches[bk].totalRevenue = Math.round(hd.branches[bk].totalRevenue);
          hd.branches[bk].comboRevenue = Math.round(hd.branches[bk].comboRevenue);
          hd.branches[bk].productRevenue = Math.round(hd.branches[bk].productRevenue);
          hd.branches[bk].singleRevenue = Math.round(hd.branches[bk].singleRevenue);
        }
      }

      const storeIdToBranchName: Record<number, string> = { 6: 'Đề Thám', 2: 'Phan Xích Long', 16: 'Estella' };

      const hourlyBreakdown = hourlyData.map((hd: SafeAny) => ({
        hour: `${String(hd.hour).padStart(2, '0')}:00`,
        comboRevenue: Math.round(hd.comboRevenue),
        singleRevenue: Math.round(hd.singleRevenue),
        productRevenue: Math.round(hd.productRevenue),
        cumulativeRevenue: Math.round(hd.cumulativeRevenue),
        orderCount: hd.orderCount,
      }));

      const branchHourlyMatrix = branchKeys.map((bk: string) => ({
        branchKey: bk,
        branchName: storeIdToBranchName[branchKeyToStoreId[bk]] || bk,
        hours: hourlyData.map((hd: SafeAny) => ({
          hour: `${String(hd.hour).padStart(2, '0')}:00`,
          revenue: Math.round(hd.branches[bk]?.totalRevenue || 0),
          orderCount: hd.branches[bk]?.orderCount || 0,
        })),
        totalRevenue: Math.round(
          hourlyData.reduce((s: number, hd: SafeAny) => s + (hd.branches[bk]?.totalRevenue || 0), 0)
        ),
        totalOrders: hourlyData.reduce((s: number, hd: SafeAny) => s + (hd.branches[bk]?.orderCount || 0), 0),
      }));

      const { netFactor } = await getVatRateConfig(fastify);

      const response: RevenueHourlyResponse = {
        summary: {
          totalRevenue: Math.round(summaryTotalRevenue),
          totalNetRevenue: Math.round(summaryTotalRevenue * netFactor),
          comboRevenue: Math.round(summaryComboRevenue),
          singleRevenue: Math.round(summarySingleRevenue),
          productRevenue: Math.round(summaryProductRevenue),
          completedOrders: summaryOrderCount,
          aov: summaryOrderCount > 0 ? Math.round(summaryTotalRevenue / summaryOrderCount) : 0,
          comboCount: summaryComboCount,
          dailyTarget: dailyTarget,
          projectedRevenue: projectedRevenue,
          elapsedRatio: elapsedRatio,
          daysInPeriod: daysInPeriod,
          isSingleDay: daysInPeriod === 1,
        },
        hourlyBreakdown,
        branchHourlyMatrix,
      };

      return reply.send(response);
    } catch (error) {
      fastify.log.error(error, 'Fetch revenue hourly error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi hệ thống khi tải dữ liệu revenue hourly.',
      });
    }
  });
}
