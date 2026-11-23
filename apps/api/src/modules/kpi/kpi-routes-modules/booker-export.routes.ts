import { FastifyInstance } from 'fastify';
import { type SafeAny } from '@mos-lab/shared';
import { getSalaryConfig } from '../services/salary-calculator.js';
import { formatDateTime, getWeekNumber } from '../services/kpi-helpers.js';
import { computeClientBookingBonus, parseDateRange } from './kpi-route.helpers.js';
import { loadBookerOrdersEnrichment, selectPrimaryOrderService } from './booker-order-enrichment.js';

export function registerBookerExportRoutes(fastify: FastifyInstance) {
  // GET /api/kpi/export-booker-salary (Google Sheets / External tool integration)
  fastify.get('/kpi/export-booker-salary', async (request, reply) => {
    const { key, booker, date_from, date_to } = request.query as {
      key?: string;
      booker?: string;
      date_from?: string;
      date_to?: string;
    };

    // Verify system integration API key
    if (key !== 'FDC0D0A177694777A') {
      return reply.status(401).send({ error: 'Unauthorized', message: 'API key không hợp lệ.' });
    }

    if (!booker || !date_from || !date_to) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu tham số booker, date_from hoặc date_to.' });
    }

    const { start, end } = parseDateRange(date_from, date_to);

    try {
      const config = await getSalaryConfig(fastify);

      // Find legacyUserId for the requested booker
      const profiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
        SELECT up.user_id as userId, up.full_name as fullName
        FROM \`staff_profile\` sp
        JOIN \`user_profile\` up ON sp.user_id = up.user_id
        WHERE up.provider = 'Staff' AND up.is_disabled = 0
          AND (up.full_name = ? OR up.full_name = ?)
      `,
        booker,
        booker + ' '
      );

      if (profiles.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: `Không tìm thấy thông tin booker: ${booker}` });
      }

      // Sort by userId ascending to let duplicates with larger user_id override
      profiles.sort((a: SafeAny, b: SafeAny) => Number(a.userId) - Number(b.userId));
      const legacyUserId = Number(profiles[profiles.length - 1].userId);

      // Fetch all orders for this booker in the date range (Rule #10: Booker productivity by creation date)
      const allOrders = await fastify.prisma.legacy.order.findMany({
        where: {
          created_staff_id: legacyUserId,
          date_created: { gte: start, lte: end },
          order_state: { not: 'Cancelled' },
        },
        orderBy: { date_created: 'asc' },
      });

      const rows: SafeAny[][] = [];
      rows.push([
        'ID',
        'CLIENT',
        'PHONE',
        'SOURCE',
        'SERVICE',
        'PRICE',
        'DISCOUNT PERCENT',
        'DISCOUNT VALUE',
        'AMOUNT PAID',
        'TIPS',
        'DEBT',
        'BOOKER',
        'BOOKING TYPE',
        'BOOKING BONUS',
        'COMBO DEDUCTION',
        'NET REVENUE',
        'CHECK-IN VALUE',
        'DATE BOOKED',
        'DATE CHECK-IN',
        'WEEK',
      ]);

      if (allOrders.length > 0) {
        const { orderPaymentMap, orderServicesMap, serviceNameMap, profileMap, contactMap, checkHasLiveCombo } =
          await loadBookerOrdersEnrichment(fastify, allOrders);

        allOrders.forEach((o) => {
          const clientName = profileMap.get(Number(o.user_id)) || '';
          const phone = contactMap.get(Number(o.user_id)) || '';
          const source = o.booking_channels || 'ZALO';
          const plannedDateStr = o.booking_date_start ? new Date(o.booking_date_start).toLocaleDateString('en-CA') : '';
          const weekLabel = o.booking_date_start ? `W${getWeekNumber(new Date(o.booking_date_start))}` : '';

          if (o.order_state === 'Completed') {
            const payInfo = orderPaymentMap.get(o.id) || { tips: 0, debt: 0, totalPaid: 0 };
            const orderServicesList = orderServicesMap.get(o.id) || [];
            const primaryService = selectPrimaryOrderService(orderServicesList);

            const serviceName = primaryService ? serviceNameMap.get(primaryService.service_id) || 'Unknown' : 'Unknown';
            const price = primaryService ? primaryService.service_price : 0;
            const discValue = primaryService ? primaryService.discount_amount : 0;
            let discPercent = 0;
            if (primaryService && primaryService.service_price > 0) {
              discPercent = Math.round((primaryService.discount_amount / primaryService.service_price) * 100);
            }

            const isRefill = serviceName.toLowerCase().includes('refill');
            const isCombo = checkHasLiveCombo(o.user_id, o.booking_date_start, o.date_created);

            let bonus: number;
            let comboDeduction = 0;
            let bookingType = 'Single';

            if (isCombo) {
              bonus = 0;
              comboDeduction = o.total_price;
              bookingType = 'Combo';
            } else {
              bonus = computeClientBookingBonus(config, isRefill, discPercent);
            }

            const checkinDateStr = formatDateTime(new Date(o.date_created));

            rows.push([
              o.id,
              clientName,
              phone,
              source,
              serviceName,
              price,
              discPercent,
              discValue,
              payInfo.totalPaid,
              payInfo.tips,
              payInfo.debt,
              booker,
              bookingType,
              bonus,
              comboDeduction,
              o.total_price,
              1, // CHECK-IN VALUE
              plannedDateStr,
              checkinDateStr,
              weekLabel,
            ]);
          } else {
            rows.push([
              o.id,
              clientName,
              phone,
              source,
              'Not Checkin',
              0,
              0,
              0,
              0,
              0,
              0,
              booker,
              'Single',
              0,
              0,
              0,
              0,
              plannedDateStr,
              '',
              weekLabel,
            ]);
          }
        });
      }

      const csvContent = rows
        .map((r) =>
          r
            .map((val) => {
              if (val === null || val === undefined) return '';
              const strVal = String(val);
              if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
                return `"${strVal.replace(/"/g, '""')}"`;
              }
              return strVal;
            })
            .join(',')
        )
        .join('\n');

      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename=booker-salary.csv');
      return csvContent;
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Export booker salary CSV error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi xuất CSV.' });
    }
  });
}
