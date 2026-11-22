import { FastifyInstance } from 'fastify';
import { type SafeAny } from '@mos-lab/shared';
import { requireAuth } from '../../../middlewares/auth.js';
import { getSalaryConfig } from '../services/salary-calculator.js';
import { computeClientBookingBonus, parseDateRange } from './kpi-route.helpers.js';
import { loadBookerOrdersEnrichment, selectPrimaryOrderService } from './booker-order-enrichment.js';

export function registerBookerAppointmentsRoutes(fastify: FastifyInstance) {
  // GET /api/kpi/booker-appointments
  fastify.get('/kpi/booker-appointments', { preHandler: [requireAuth] }, async (request, reply) => {
    const { staffId, startDate, endDate } = request.query as { staffId?: string; startDate?: string; endDate?: string };

    if (!staffId) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Thiếu staffId của Online Consultant.',
      });
    }

    const targetStaffId = parseInt(staffId, 10);
    if (isNaN(targetStaffId)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'staffId không hợp lệ.',
      });
    }

    const staff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: targetStaffId },
    });

    if (!staff) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Không tìm thấy nhân viên tương ứng.',
      });
    }

    const bookerName = staff.displayName;
    const { start, end } = parseDateRange(startDate, endDate, 30);

    try {
      const config = await getSalaryConfig(fastify);

      // Find legacyUserId for the requested booker
      const profiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
        SELECT user_id as userId, full_name as fullName
        FROM \`user_profile\`
        WHERE full_name = ? OR full_name = ?
      `,
        bookerName,
        bookerName + ' '
      );

      if (profiles.length === 0) {
        return reply
          .status(404)
          .send({ error: 'Not Found', message: `Không tìm thấy thông tin booker: ${bookerName}` });
      }

      // Sort by userId ascending to let duplicates override
      profiles.sort((a: SafeAny, b: SafeAny) => Number(a.userId) - Number(b.userId));
      const legacyUserId = Number(profiles[profiles.length - 1].userId);

      // Fetch all orders for this booker in the date range (Rule #10: Booker productivity by creation date)
      const allOrders = await fastify.prisma.legacy.order.findMany({
        where: {
          created_staff_id: legacyUserId,
          date_created: { gte: start, lte: end },
          order_state: { not: 'Cancelled' },
        },
        orderBy: { date_created: 'desc' },
      });

      const list: SafeAny[] = [];

      if (allOrders.length > 0) {
        const { orderPaymentMap, orderServicesMap, serviceNameMap, profileMap, contactMap, checkHasLiveCombo } =
          await loadBookerOrdersEnrichment(fastify, allOrders);

        allOrders.forEach((o) => {
          const clientName = profileMap.get(Number(o.user_id)) || '';
          const phone = contactMap.get(Number(o.user_id)) || '';
          const source = o.booking_channels || 'ZALO';

          let serviceName = 'Không có thông tin';
          let price = 0;
          let discountPercent = 0;
          let bookingBonus = 0;
          let netRevenue = 0;
          let tipAmount = 0;
          let statusText = o.order_state === 'CheckIn' ? 'Check-in' : 'Đặt lịch (Chưa đến)';

          if (o.order_state === 'Completed') {
            statusText = 'Check-in thành công';
            netRevenue = o.total_price;
            const payInfo = orderPaymentMap.get(o.id) || { tips: 0, debt: 0, totalPaid: 0 };
            tipAmount = payInfo.tips;

            const orderServicesList = orderServicesMap.get(o.id) || [];
            const primaryService = selectPrimaryOrderService(orderServicesList);

            if (primaryService) {
              serviceName = serviceNameMap.get(primaryService.service_id) || 'Không rõ';
              price = primaryService.service_price;

              if (primaryService.service_price > 0) {
                discountPercent = Math.round((primaryService.discount_amount / primaryService.service_price) * 100);
              }

              const isRefill = serviceName.toLowerCase().includes('refill');
              const isCombo = checkHasLiveCombo(o.user_id, o.booking_date_start, o.date_created);

              if (isCombo) {
                bookingBonus = 0;
                serviceName += ' (Combo - Không hoa hồng)';
              } else {
                bookingBonus = computeClientBookingBonus(config, isRefill, discountPercent);
              }
            }
          }

          list.push({
            id: o.id,
            clientName,
            clientPhone: phone,
            channel: source,
            appointmentDate: o.booking_date_start || o.date_created,
            createdAt: o.date_created,
            status: statusText,
            isCompleted: o.order_state === 'Completed',
            serviceName,
            servicePrice: price,
            discountPercent,
            netRevenue,
            tipAmount,
            bookingBonus,
          });
        });
      }

      return list;
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'KPI booker appointments error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể truy vấn danh sách lịch hẹn đặt.',
      });
    }
  });
}
