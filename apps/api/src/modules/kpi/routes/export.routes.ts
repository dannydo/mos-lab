import { FastifyInstance } from 'fastify';
import { getSalaryConfig } from '../services/salary-calculator.js';
import { formatDateTime, getWeekNumber } from '../services/kpi-helpers.js';

export async function registerExportRoutes(fastify: FastifyInstance) {
  const parseDateRange = (dateFrom?: string, dateTo?: string, defaultDaysStart = 7) => {
    const startStr =
      dateFrom || new Date(Date.now() - defaultDaysStart * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    const endStr = dateTo || new Date().toLocaleDateString('en-CA');

    const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
    const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

    return {
      startStr: startPart,
      endStr: endPart,
      start: new Date(startPart + 'T00:00:00.000Z'),
      end: new Date(endPart + 'T23:59:59.999Z'),
    };
  };

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

      // Sort by userId ascending to let duplicates override
      profiles.sort((a: SafeAny, b: SafeAny) => Number(a.userId) - Number(b.userId));
      const legacyUserId = Number(profiles[profiles.length - 1].userId);

      // Fetch all orders for this booker in the date range
      const allOrders = await fastify.prisma.legacy.order.findMany({
        where: {
          created_staff_id: legacyUserId,
          booking_date_start: { gte: start, lte: end },
          order_state: { not: 'Cancelled' },
        },
        orderBy: { booking_date_start: 'asc' },
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
        const completedOrders = allOrders.filter((o) => o.order_state === 'Completed');
        const completedOrderIds = completedOrders.map((o) => o.id);

        const orderPaymentMap = new Map<number, { tips: number; debt: number; totalPaid: number }>();
        if (completedOrderIds.length > 0) {
          const orderPayments = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
            SELECT order_id as orderId, tip_amount as tipAmount, paid_credit_amount as paidCredit, paid_cash_amount as paidCash, paid_credit_card_amount as paidCard, paid_bank_transfer_amount as paidBank, debt_amount as debt
            FROM \`order_payment\`
            WHERE order_id IN (${completedOrderIds.join(',')})
          `);
          orderPayments.forEach((op: SafeAny) => {
            const existing = orderPaymentMap.get(Number(op.orderId)) || { tips: 0, debt: 0, totalPaid: 0 };
            const paidSum =
              Number(op.paidCredit || 0) +
              Number(op.paidCash || 0) +
              Number(op.paidCard || 0) +
              Number(op.paidBank || 0);
            orderPaymentMap.set(Number(op.orderId), {
              tips: existing.tips + Number(op.tipAmount || 0),
              debt: existing.debt + Number(op.debt || 0),
              totalPaid: existing.totalPaid + paidSum,
            });
          });
        }

        const orderServicesMap = new Map<number, any[]>();
        const serviceNameMap = new Map<number, string>();
        if (completedOrderIds.length > 0) {
          const orderServices = await fastify.prisma.legacy.order_service.findMany({
            where: { order_id: { in: completedOrderIds } },
          });
          orderServices.forEach((os) => {
            const list = orderServicesMap.get(os.order_id) || [];
            list.push(os);
            orderServicesMap.set(os.order_id, list);
          });

          const serviceIds = Array.from(new Set(orderServices.map((os) => os.service_id)));
          if (serviceIds.length > 0) {
            const serviceLanguages = await fastify.prisma.legacy.service_language.findMany({
              where: { service_id: { in: serviceIds } },
            });
            serviceLanguages.forEach((sl) => {
              serviceNameMap.set(sl.service_id, sl.service_name);
            });
          }
        }

        // Fetch client names and phone numbers
        const customerIds = Array.from(
          new Set(allOrders.map((o) => o.user_id).filter((id) => id !== null))
        ) as number[];
        const userProfiles =
          customerIds.length > 0
            ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT user_id as userId, full_name as fullName
          FROM \`user_profile\`
          WHERE user_id IN (${customerIds.join(',')})
        `)
            : [];
        const userContacts =
          customerIds.length > 0
            ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT user_id as userId, phone_number as phoneNumber
          FROM \`user_contact\`
          WHERE user_id IN (${customerIds.join(',')})
        `)
            : [];

        const profileMap = new Map<number, string>();
        userProfiles.forEach((p) => profileMap.set(Number(p.userId), p.fullName));

        const contactMap = new Map<number, string>();
        userContacts.forEach((c) => contactMap.set(Number(c.userId), c.phoneNumber));

        // Fetch user balances and transactions for checkHasLiveCombo
        const userBalances =
          customerIds.length > 0
            ? await fastify.prisma.legacy.user_service_balance.findMany({
                where: { user_id: { in: customerIds } },
              })
            : [];

        const balanceIds = userBalances.map((b) => b.id);
        const userBalanceTransactions =
          balanceIds.length > 0
            ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT usbt.id, usbt.user_service_balance_id, usbt.date_created, usbt.date_expired, 
                 usbt.total_normal_count_left, usbt.total_retain_count_left, usbt.normal_count, 
                 usbt.retain_count, usbt.used_staff_id, usbt.order_id,
                 o.booking_date_start as o_booking_date_start
          FROM user_service_balance_transaction usbt
          LEFT JOIN \`order\` o ON o.id = usbt.order_id
          WHERE usbt.user_service_balance_id IN (${balanceIds.join(',')})
        `)
            : [];

        const txnsByBalanceId = new Map<number, any[]>();
        for (const t of userBalanceTransactions) {
          const bid = Number(t.user_service_balance_id);
          let list = txnsByBalanceId.get(bid);
          if (!list) {
            list = [];
            txnsByBalanceId.set(bid, list);
          }
          list.push(t);
        }

        const checkHasLiveCombo = (userId: number, bookingDateStart: Date | null, orderCreatedDate: Date) => {
          const bTime = bookingDateStart || orderCreatedDate;
          const userBals = userBalances.filter((b) => b.user_id === userId);

          for (const usb of userBals) {
            if (new Date(usb.date_created) >= new Date(bTime)) {
              continue;
            }

            const txnsBefore = (txnsByBalanceId.get(usb.id) || []).filter(
              (t) => new Date(t.o_booking_date_start || t.date_created) < new Date(bTime)
            );

            txnsBefore.sort((a, b) => {
              const timeA = new Date(a.o_booking_date_start || a.date_created).getTime();
              const timeB = new Date(b.o_booking_date_start || b.date_created).getTime();
              if (timeA !== timeB) return timeB - timeA;
              return b.id - a.id;
            });

            const lastTxnBefore = txnsBefore[0];

            const dateExpired = lastTxnBefore ? lastTxnBefore.date_expired : usb.date_expired;
            const isNotExpired =
              !dateExpired || new Date(dateExpired) >= new Date(new Date(bTime).toLocaleDateString('en-CA'));

            let countLeft = 0;
            if (
              lastTxnBefore &&
              lastTxnBefore.total_normal_count_left !== null &&
              lastTxnBefore.total_retain_count_left !== null
            ) {
              countLeft = (lastTxnBefore.total_normal_count_left || 0) + (lastTxnBefore.total_retain_count_left || 0);
            } else {
              const txnsAfterOrAt = (txnsByBalanceId.get(usb.id) || []).filter(
                (t) => new Date(t.o_booking_date_start || t.date_created) >= new Date(bTime)
              );

              let usedAfter = 0;
              txnsAfterOrAt.forEach((t) => {
                if (t.used_staff_id !== null) {
                  usedAfter += (t.normal_count || 0) + (t.retain_count || 0);
                }
              });

              countLeft = (usb.normal_count || 0) + (usb.retain_count || 0) + usedAfter;
            }

            if (isNotExpired && countLeft > 0) {
              return true;
            }
          }
          return false;
        };

        allOrders.forEach((o) => {
          const clientName = profileMap.get(Number(o.user_id)) || '';
          const phone = contactMap.get(Number(o.user_id)) || '';
          const source = o.booking_channels || 'ZALO';
          const plannedDateStr = o.booking_date_start ? new Date(o.booking_date_start).toLocaleDateString('en-CA') : '';
          const weekLabel = o.booking_date_start ? `W${getWeekNumber(new Date(o.booking_date_start))}` : '';

          if (o.order_state === 'Completed') {
            const payInfo = orderPaymentMap.get(o.id) || { tips: 0, debt: 0, totalPaid: 0 };
            const orderServicesList = orderServicesMap.get(o.id) || [];

            let primaryService = orderServicesList[0];
            for (const os of orderServicesList) {
              if (os.service_price > (primaryService?.service_price || 0)) {
                primaryService = os;
              }
            }

            const serviceName = primaryService ? serviceNameMap.get(primaryService.service_id) || 'Unknown' : 'Unknown';
            const price = primaryService ? primaryService.service_price : 0;
            const discValue = primaryService ? primaryService.discount_amount : 0;
            let discPercent = 0;
            if (primaryService && primaryService.service_price > 0) {
              discPercent = Math.round((primaryService.discount_amount / primaryService.service_price) * 100);
            }

            const isRefill = serviceName.toLowerCase().includes('refill');
            const isCombo = checkHasLiveCombo(o.user_id, o.booking_date_start, o.date_created);

            let bonus = 0;
            let comboDeduction = 0;
            let bookingType = 'Single';

            if (isCombo) {
              bonus = 0;
              comboDeduction = o.total_price;
              bookingType = 'Combo';
            } else if (isRefill) {
              if (discPercent === 0) bonus = config.clientBonusRefill.discount30;
              else if (discPercent <= 30) bonus = config.clientBonusRefill.discount30;
              else if (discPercent <= 50) bonus = config.clientBonusRefill.discount50;
              else bonus = config.clientBonusRefill.discountMore;
            } else {
              if (discPercent === 0) bonus = config.clientBonusFullSet.discount0;
              else if (discPercent <= 30) bonus = config.clientBonusFullSet.discount30;
              else if (discPercent <= 50) bonus = config.clientBonusFullSet.discount50;
              else bonus = config.clientBonusFullSet.discountMore;
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
    } catch (err) {
      fastify.log.error(err as Error, 'Export booker salary CSV error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi xuất CSV.' });
    }
  });
}
