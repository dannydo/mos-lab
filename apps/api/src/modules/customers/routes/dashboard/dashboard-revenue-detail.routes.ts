import { FastifyInstance } from 'fastify';
import { RevenueDetailResponse, SafeAny, isCvRole, maskPhoneNumber, shouldMaskCustomerPhone } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';
import { buildBookerFilterMatcher, getVatRateConfig } from './dashboard-config.routes.js';

export async function registerDashboardRevenueDetailRoutes(fastify: FastifyInstance) {
  // GET /api/dashboard/today/revenue-detail
  fastify.get('/dashboard/today/revenue-detail', { preHandler: [requireAuth] }, async (request, reply) => {
    if (isCvRole(request.user?.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Tài khoản Chuyên Viên không có quyền truy cập dữ liệu doanh thu tổng quan.',
      });
    }

    try {
      const { dateFrom, dateTo, hour, branchKey, bookerFilter } = request.query as {
        dateFrom: string;
        dateTo: string;
        hour?: string;
        branchKey?: string;
        bookerFilter?: string;
      };
      if (!dateFrom || !dateTo) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Missing dateFrom or dateTo' });
      }

      const start = dateFrom + ' 00:00:00';
      const end = dateTo + ' 23:59:59';

      const branchKeyToStoreId: Record<string, number> = { detham: 6, estella: 16 };
      let branchFilter = '';
      if (branchKey && branchKeyToStoreId[branchKey]) {
        branchFilter = ` AND o.client_store_id = ${branchKeyToStoreId[branchKey]}`;
      }

      let hourFilter = '';
      if (hour) {
        const hNum = parseInt(String(hour).split(':')[0], 10);
        if (!isNaN(hNum)) {
          hourFilter = ` AND HOUR(COALESCE(o.booking_date_end, ro.actual_booking_date_start, o.booking_date_start)) = ${hNum}`;
        }
      }

      // Load staff map & team sets
      const staffProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT up.user_id as userId, 
               TRIM(COALESCE(NULLIF(up.full_name, ''), CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, '')))) as fullName
        FROM \`user_profile\` up
      `);
      const staffMap = new Map<number, string>();
      staffProfiles.forEach((s) => staffMap.set(Number(s.userId), s.fullName || `Staff #${s.userId}`));

      const matchesBookerFilter = await buildBookerFilterMatcher(fastify);

      const query = `
        SELECT
          o.id as orderId,
          o.user_id,
          o.total_price,
          o.order_state,
          o.client_store_id,
          o.created_staff_id,
          COALESCE(o.booking_date_end, ro.actual_booking_date_start, o.booking_date_start) as checkin_time
        FROM \`order\` o
        LEFT JOIN report_order ro ON o.id = ro.order_id
        WHERE o.order_state = 'Completed'
          AND COALESCE(o.booking_date_end, ro.actual_booking_date_start, o.booking_date_start) BETWEEN ? AND ?
          ${hourFilter}
          ${branchFilter}
        ORDER BY checkin_time DESC
      `;

      const rawOrders: SafeAny[] = await fastify.prisma.legacy.$queryRawUnsafe(query, start, end);
      const completedOrders = rawOrders.filter((o) => {
        const bookerName = o.created_staff_id
          ? staffMap.get(Number(o.created_staff_id)) || 'Nhiều Booker'
          : 'Khách tự đặt';
        return matchesBookerFilter(bookerName, bookerFilter);
      });

      const orderIds = completedOrders.map((o) => o.orderId);
      const userIds = [...new Set(completedOrders.map((o) => o.user_id).filter(Boolean))];

      const orderServicesMap: Record<number, SafeAny[]> = {};
      const combosMap: Record<number, boolean> = {};
      const productsMap: Record<number, boolean> = {};
      const usersMap: Record<number, SafeAny> = {};
      const staffIds = new Set<number>();

      if (orderIds.length > 0) {
        const orderIdsStr = orderIds.join(',');

        // Check combos
        const combos = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT DISTINCT order_id FROM order_service_combo WHERE order_id IN (${orderIdsStr})
        `);
        combos.forEach((c) => (combosMap[c.order_id] = true));

        // Check products
        const products = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT DISTINCT order_id FROM order_product WHERE order_id IN (${orderIdsStr})
        `);
        products.forEach((p) => (productsMap[p.order_id] = true));

        // Get services
        const services = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT 
            os.order_id, 
            os.check_in_staff_id, 
            os.check_out_staff_id, 
            os.assigned_staff_id,
            sl.service_name as service_name
          FROM order_service os
          LEFT JOIN service_language sl ON os.service_id = sl.service_id AND sl.language_id = 1
          WHERE os.order_id IN (${orderIdsStr})
        `);

        services.forEach((s) => {
          if (!orderServicesMap[s.order_id]) orderServicesMap[s.order_id] = [];
          orderServicesMap[s.order_id].push(s);
          if (s.check_in_staff_id) staffIds.add(s.check_in_staff_id);
          if (s.check_out_staff_id) staffIds.add(s.check_out_staff_id);
          if (s.assigned_staff_id) staffIds.add(s.assigned_staff_id);
        });
      }

      const allUserIds = [...new Set([...userIds, ...Array.from(staffIds)])];
      if (allUserIds.length > 0) {
        const allUserIdsStr = allUserIds.join(',');
        const users = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT u.id, up.full_name, uc.phone_number as phone
          FROM user u
          LEFT JOIN user_profile up ON u.id = up.user_id
          LEFT JOIN user_contact uc ON u.id = uc.user_id
          WHERE u.id IN (${allUserIdsStr})
        `);
        users.forEach((u) => (usersMap[u.id] = { name: u.full_name, phone: u.phone }));
      }

      const { netFactor } = await getVatRateConfig(fastify);

      const transactions = completedOrders.map((o) => {
        let sType: 'combo' | 'single' | 'product' = 'single';
        if (combosMap[o.orderId]) sType = 'combo';
        else if (productsMap[o.orderId] && (!orderServicesMap[o.orderId] || orderServicesMap[o.orderId].length === 0))
          sType = 'product';

        const uInfo = usersMap[o.user_id] || {};
        const svcs = orderServicesMap[o.orderId] || [];

        const ccInName = svcs.find((s) => s.check_in_staff_id)?.check_in_staff_id
          ? usersMap[svcs.find((s) => s.check_in_staff_id)?.check_in_staff_id]?.name || null
          : null;
        const ccOutName = svcs.find((s) => s.check_out_staff_id)?.check_out_staff_id
          ? usersMap[svcs.find((s) => s.check_out_staff_id)?.check_out_staff_id]?.name || null
          : null;
        const cvName = svcs.find((s) => s.assigned_staff_id)?.assigned_staff_id
          ? usersMap[svcs.find((s) => s.assigned_staff_id)?.assigned_staff_id]?.name || null
          : null;

        const storeIdToBranchKeyDetail: Record<number, string> = { 6: 'detham', 2: 'pxl', 16: 'estella' };
        const storeIdToBranchNameDetail: Record<number, string> = { 6: 'Đề Thám', 2: 'Phan Xích Long', 16: 'Estella' };

        return {
          orderId: o.orderId,
          customerId: o.user_id || 0,
          customerName: uInfo.name || 'Khách vãng lai',
          customerPhone: shouldMaskCustomerPhone(request.user?.role) ? maskPhoneNumber(uInfo.phone) : uInfo.phone || '',
          serviceName:
            svcs
              .map((s) => s.service_name)
              .filter(Boolean)
              .join(', ') || 'N/A',
          ccInName,
          ccOutName,
          cvName,
          serviceType: sType,
          price: Math.round(Number(o.total_price || 0)),
          netPrice: Math.round(Number(o.total_price || 0) * netFactor),
          checkinTime: o.checkin_time,
          orderState: 'Completed',
          branchKey: storeIdToBranchKeyDetail[o.client_store_id] || 'detham',
          branchName: storeIdToBranchNameDetail[o.client_store_id] || 'Đề Thám',
        };
      });

      const totalRev = transactions.reduce((sum, t) => sum + t.price, 0);
      const comboRevTotal = transactions.filter((t) => t.serviceType === 'combo').reduce((s, t) => s + t.price, 0);
      const singleRevTotal = transactions.filter((t) => t.serviceType === 'single').reduce((s, t) => s + t.price, 0);
      const productRevTotal = transactions.filter((t) => t.serviceType === 'product').reduce((s, t) => s + t.price, 0);

      const response: RevenueDetailResponse = {
        transactions,
        summary: {
          totalRevenue: totalRev,
          comboRevenue: comboRevTotal,
          singleRevenue: singleRevTotal,
          productRevenue: productRevTotal,
          orderCount: transactions.length,
          aov: transactions.length > 0 ? Math.round(totalRev / transactions.length) : 0,
        },
      };

      return reply.send(response);
    } catch (error) {
      fastify.log.error(error, 'Fetch revenue detail error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi hệ thống khi tải dữ liệu revenue detail.',
      });
    }
  });
}
