import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import {
  calculateBookerSalaryStats,
  calculateConsultantSalaryStats,
  getSalaryConfig,
} from '../services/salary-calculator.js';

export async function registerKpiDataRoutes(fastify: FastifyInstance) {
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

  // GET /api/kpi/summary
  fastify.get('/kpi/summary', { preHandler: [requireAuth] }, async (request, reply) => {
    const { startDate, endDate, staffId, role } = request.query as {
      startDate?: string;
      endDate?: string;
      staffId?: string;
      role?: string;
    };

    const user = request.user as { id: number; role: string };
    let targetStaffId: number | undefined = undefined;
    if (user.role === 'admin') {
      if (staffId) {
        targetStaffId = parseInt(staffId, 10);
      }
    } else {
      targetStaffId = user.id;
    }

    const { startStr, endStr, start, end } = parseDateRange(startDate, endDate, 7);

    try {
      if (role === 'oc' || role === 'consultant') {
        const salaries = await calculateConsultantSalaryStats(fastify, start, end, targetStaffId);
        const salary = targetStaffId !== undefined ? salaries[targetStaffId] : null;

        let totalCheckin = 0;
        let totalEarnings = 0;

        if (salary) {
          totalCheckin = salary.checkins;
          totalEarnings = salary.totalSalary;
        } else {
          Object.values(salaries).forEach((s) => {
            totalCheckin += s.checkins;
            totalEarnings += s.totalSalary;
          });
        }

        return {
          startDate: startStr,
          endDate: endStr,
          totalPlanned: 0,
          totalCalled: 0,
          totalAnswered: 0,
          totalBooked: 0,
          totalCheckin,
          totalEarnings,
          salary,
        };
      }

      // Fetch CRM Staff list
      const staffList = await fastify.prisma.crm.crmStaff.findMany({
        where: {
          role: 'telesales',
          isActive: true,
          ...(targetStaffId !== undefined ? { id: targetStaffId } : {}),
        },
      });

      const salaries = await calculateBookerSalaryStats(fastify, start, end, targetStaffId);
      const salary = targetStaffId !== undefined ? salaries[targetStaffId] : null;

      // Match staff names to legacy user IDs
      const staffNames = staffList.map((s) => s.displayName);
      const profiles =
        staffNames.length > 0
          ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
              `
        SELECT user_id as userId, full_name as fullName
        FROM \`user_profile\`
        WHERE full_name IN (${staffNames.map(() => '?').join(',')})
      `,
              ...staffNames
            )
          : [];

      const staffNameToLegacyIdMap = new Map<string, number>();
      staffList.forEach((s) => {
        if (s.legacyStaffId) {
          staffNameToLegacyIdMap.set(s.displayName.toLowerCase().trim(), Number(s.legacyStaffId));
        }
      });
      profiles.forEach((p: SafeAny) => {
        const key = p.fullName.toLowerCase().trim();
        if (!staffNameToLegacyIdMap.has(key)) {
          staffNameToLegacyIdMap.set(key, Number(p.userId));
        }
      });

      const legacyUserIds = Array.from(
        new Set(
          staffList
            .map((s) => (s.legacyStaffId ? Number(s.legacyStaffId) : staffNameToLegacyIdMap.get(s.displayName.toLowerCase().trim())))
            .filter((id): id is number => typeof id === 'number' && !isNaN(id))
        )
      );

      const staffIds = staffList.map((s) => s.id);
      let totalCalled = 0;
      let totalAnswered = 0;
      let totalHappy = 0;

      if (staffIds.length > 0) {
        const callLogs = await fastify.prisma.crm.crmOmicallLog.findMany({
          where: {
            staffId: { in: staffIds },
            createdAt: { gte: start, lte: end },
            direction: 'outbound',
          },
          select: {
            status: true,
            happyCallStatus: true,
          },
        });

        totalCalled = callLogs.length;
        callLogs.forEach((c: SafeAny) => {
          if (c.status === 'ANSWER') {
            totalAnswered++;
          }
          if (c.happyCallStatus === 'APPROVED') {
            totalHappy++;
          }
        });
      }

      let totalBooked = 0;
      if (legacyUserIds.length > 0) {
        const bookedRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT COUNT(DISTINCT o.id) as totalBooked
          FROM \`order\` o
          WHERE o.created_staff_id IN (${legacyUserIds.join(',')})
            AND o.date_created >= '${startStr} 00:00:00'
            AND o.date_created <= '${endStr} 23:59:59'
            AND o.order_state != 'Cancelled'
        `);
        totalBooked = Number(bookedRows[0]?.totalBooked || 0);
      }

      let totalCheckin = 0;
      let totalEarnings = 0;

      Object.values(salaries).forEach((s) => {
        totalCheckin += s.doneCount;
        totalEarnings += s.totalSalary;
      });

      return {
        startDate: startStr,
        endDate: endStr,
        totalPlanned: totalBooked,
        totalCalled,
        totalAnswered,
        totalHappy,
        totalBooked,
        totalCheckin,
        totalEarnings: salary ? salary.totalSalary : totalEarnings,
        salary,
      };
    } catch (err) {
      fastify.log.error(err as Error, 'Summary KPI error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve KPI summary',
      });
    }
  });

  // GET /api/kpi/leaderboard
  fastify.get('/kpi/leaderboard', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: number; role: string };

    const queryParams = (request.query || {}) as SafeAny;
    const role = queryParams.role;
    const staffIds = queryParams.staffIds;

    const startDateParam = (queryParams.startDate || queryParams.dateFrom || queryParams.date_from || '').toString().trim();
    const endDateParam = (queryParams.endDate || queryParams.dateTo || queryParams.date_to || '').toString().trim();
    
    const todayStr = new Date().toISOString().split('T')[0];
    const startStr = startDateParam ? (startDateParam.includes('T') ? startDateParam.split('T')[0] : startDateParam.split(' ')[0]) : todayStr;
    const endStr = endDateParam ? (endDateParam.includes('T') ? endDateParam.split('T')[0] : endDateParam.split(' ')[0]) : todayStr;
    
    const start = new Date(startStr + 'T00:00:00.000Z');
    const end = new Date(endStr + 'T23:59:59.999Z');

    try {
      if (role === 'oc' || role === 'consultant') {
        const salaries = await calculateConsultantSalaryStats(fastify, start, end);
        const uids = Object.keys(salaries).map(Number);

        const profiles =
          uids.length > 0
            ? ((await fastify.prisma.legacy.$queryRawUnsafe(`
          SELECT user_id, full_name, username, avatar 
          FROM \`user_profile\` 
          WHERE user_id IN (${uids.join(',')})
        `)) as SafeAny[])
            : [];

        const profileMap = new Map<number, any>();
        profiles.forEach((p: SafeAny) => {
          profileMap.set(Number(p.user_id), p);
        });

        const leaderboard = uids.map((uid) => {
          const sal = salaries[uid];
          const prof = profileMap.get(uid) || {};

          const rawAvatar = prof.avatar || null;
          let avatarUrl = rawAvatar
            ? rawAvatar.startsWith('http') || rawAvatar.startsWith('data:')
              ? rawAvatar
              : `https://cdn.wingslashes.com${rawAvatar.startsWith('/') ? '' : '/'}${rawAvatar}`
            : null;
          if (avatarUrl) {
            avatarUrl = avatarUrl.replace(/^https?:\/\/(s|api)\.wingslashes\.com/, 'https://cdn.wingslashes.com');
          }

          return {
            staffId: uid,
            displayName: prof.full_name || `CC - ${uid}`,
            username: prof.username || `cc_${uid}`,
            avatarUrl,
            totalPlanned: 0,
            totalCalled: 0,
            totalAnswered: 0,
            totalBooked: 0,
            totalCheckin: sal.checkins,
            answerRate: 0,
            bookingRate: 0,
            checkinRate: 0,
            totalEarnings: user.role === 'admin' ? sal.totalSalary : 0,
            salary: user.role === 'admin' ? sal : null,
          };
        });

        if (user.role === 'admin') {
          leaderboard.sort((a, b) => b.totalEarnings - a.totalEarnings);
        } else {
          leaderboard.sort((a, b) => b.totalCheckin - a.totalCheckin);
        }
        return leaderboard;
      }

      const staffWhere: SafeAny = { isActive: true };
      if (staffIds && staffIds.trim() !== '') {
        staffWhere.id = {
          in: staffIds
            .split(',')
            .map(Number)
            .filter((n: number) => !isNaN(n)),
        };
      } else {
        staffWhere.role = role || 'telesales';
      }

      const staffList = await fastify.prisma.crm.crmStaff.findMany({
        where: staffWhere,
        select: { id: true, displayName: true, username: true, legacyStaffId: true, avatarUrl: true },
      });

      const salaries = await calculateBookerSalaryStats(fastify, start, end);

      // Match staff names to legacy user IDs
      const staffNames = staffList.map((s) => s.displayName);
      const profiles =
        staffNames.length > 0
          ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
              `
        SELECT up.user_id as userId, up.full_name as fullName, up.avatar
        FROM \`user_profile\` up
        WHERE up.provider = 'Staff' AND up.is_disabled = 0
          AND up.full_name IN (${staffNames.map(() => '?').join(',')})
      `,
              ...staffNames
            )
          : [];

      const staffNameToProfileMap = new Map<string, SafeAny>();
      profiles.forEach((p: SafeAny) => {
        staffNameToProfileMap.set(p.fullName.toLowerCase().trim(), p);
      });

      const legacyUserIds = Array.from(
        new Set(
          staffList
            .map((s) => (s.legacyStaffId ? Number(s.legacyStaffId) : Number(staffNameToProfileMap.get(s.displayName.toLowerCase().trim())?.userId)))
            .filter((id): id is number => typeof id === 'number' && !isNaN(id))
        )
      );

      const crmStaffIds = staffList.map((s) => s.id);
      const callStatsMap = new Map<number, { totalCalled: number; totalAnswered: number; totalHappy: number }>();

      if (crmStaffIds.length > 0) {
        const callLogs = await fastify.prisma.crm.crmOmicallLog.findMany({
          where: {
            staffId: { in: crmStaffIds },
            createdAt: { gte: start, lte: end },
            direction: 'outbound',
          },
          select: {
            staffId: true,
            status: true,
            happyCallStatus: true,
          },
        });

        callLogs.forEach((c: SafeAny) => {
          const sid = Number(c.staffId);
          const current = callStatsMap.get(sid) || { totalCalled: 0, totalAnswered: 0, totalHappy: 0 };
          current.totalCalled++;
          if (c.status === 'ANSWER') {
            current.totalAnswered++;
          }
          if (c.happyCallStatus === 'APPROVED') {
            current.totalHappy++;
          }
          callStatsMap.set(sid, current);
        });
      }

      const bookedCountMap = new Map<number, number>();
      if (legacyUserIds.length > 0) {
        const sqlBooked = `
          SELECT 
            o.created_staff_id as staffId,
            COUNT(DISTINCT o.id) as totalBooked
          FROM \`order\` o
          WHERE o.created_staff_id IN (${legacyUserIds.join(',')})
            AND o.date_created >= '${startStr} 00:00:00'
            AND o.date_created <= '${endStr} 23:59:59'
            AND o.order_state != 'Cancelled'
          GROUP BY o.created_staff_id
        `;

        console.log('LEADERBOARD QUERY RANGE:', { startStr, endStr, legacyUserIds });
        const bookedRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sqlBooked);
        console.log('LEADERBOARD BOOKED ROWS:', bookedRows);
        fastify.log.info({ staffList, legacyUserIds, bookedRows }, 'DEBUG LEADERBOARD STAFF LIST AND BOOKED ROWS');
        bookedRows.forEach((r: SafeAny) => {
          bookedCountMap.set(Number(r.staffId), Number(r.totalBooked || 0));
        });
      }

      const leaderboard = [];

      for (const staff of staffList) {
        const profile = staffNameToProfileMap.get(staff.displayName.toLowerCase().trim());
        const legacyUserId = staff.legacyStaffId ? Number(staff.legacyStaffId) : (profile?.userId ? Number(profile.userId) : undefined);
        const callStats = callStatsMap.get(staff.id) || { totalCalled: 0, totalAnswered: 0, totalHappy: 0 };

        const rawAvatar = staff.avatarUrl || profile?.avatar || null;
        let avatarUrl = rawAvatar
          ? rawAvatar.startsWith('http') || rawAvatar.startsWith('data:')
            ? rawAvatar
            : `https://cdn.wingslashes.com${rawAvatar.startsWith('/') ? '' : '/'}${rawAvatar}`
          : null;
        if (avatarUrl) {
          avatarUrl = avatarUrl.replace(/^https?:\/\/(s|api)\.wingslashes\.com/, 'https://cdn.wingslashes.com');
        }

        const salary = salaries[staff.id] || {
          baseSalary: 5500000,
          doneCount: 0,
          missedCount: 0,
          missedRate: 0,
          clientBonus: 0,
          doneBonus: 0,
          missedBonus: 0,
          tipBonus: 0,
          revBonus: 0,
          totalTips: 0,
          totalNetRev: 0,
          totalSalary: 5500000,
        };

        const totalBooked = legacyUserId ? (bookedCountMap.get(Number(legacyUserId)) ?? 0) : 0;
        const totalPlanned = totalBooked;
        const totalCalled = callStats.totalCalled;
        const totalAnswered = callStats.totalAnswered;

        const answerRate = totalCalled > 0 ? Math.round((totalAnswered / totalCalled) * 100) : 0;
        const bookingRate = totalAnswered > 0 ? Math.round((totalBooked / totalAnswered) * 100) : 0;
        const checkinRate = totalBooked > 0 ? Math.round((salary.doneCount / totalBooked) * 100) : 0;

        const totalHappy = callStats.totalHappy;

        fastify.log.info({ staffId: staff.id, name: staff.displayName, legacyStaffId: staff.legacyStaffId, legacyUserId, bookedCountMap: Array.from(bookedCountMap.entries()), totalBooked }, 'DEBUG STAFF BOOKED');
        leaderboard.push({
          staffId: staff.id,
          displayName: staff.displayName,
          username: staff.username,
          avatarUrl,
          totalPlanned,
          totalCalled,
          totalAnswered,
          totalHappy,
          totalBooked,
          totalCheckin: salary.doneCount,
          answerRate,
          bookingRate,
          checkinRate,
          totalEarnings: user.role === 'admin' ? salary.totalSalary : 0,
          salary: user.role === 'admin' ? salary : null,
        });
      }

      leaderboard.sort((a, b) => {
        if (b.totalBooked !== a.totalBooked) {
          return b.totalBooked - a.totalBooked;
        }
        return b.totalCheckin - a.totalCheckin;
      });
      return leaderboard;
    } catch (err) {
      fastify.log.error(err as Error, 'Leaderboard KPI error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve leaderboard statistics',
      });
    }
  });

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

    const { startStr, endStr, start, end } = parseDateRange(startDate, endDate, 30);

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

      // Fetch all orders for this booker in the date range
      const allOrders = await fastify.prisma.legacy.order.findMany({
        where: {
          created_staff_id: legacyUserId,
          booking_date_start: { gte: start, lte: end },
          order_state: { not: 'Cancelled' },
        },
        orderBy: { booking_date_start: 'desc' },
      });

      const list: SafeAny[] = [];

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
            const l = orderServicesMap.get(os.order_id) || [];
            l.push(os);
            orderServicesMap.set(os.order_id, l);
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
            let primaryService = orderServicesList[0];
            for (const os of orderServicesList) {
              if (os.service_price > (primaryService?.service_price || 0)) {
                primaryService = os;
              }
            }

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
              } else if (isRefill) {
                if (discountPercent === 0) bookingBonus = config.clientBonusRefill.discount30;
                else if (discountPercent <= 30) bookingBonus = config.clientBonusRefill.discount30;
                else if (discountPercent <= 50) bookingBonus = config.clientBonusRefill.discount50;
                else bookingBonus = config.clientBonusRefill.discountMore;
              } else {
                if (discountPercent === 0) bookingBonus = config.clientBonusFullSet.discount0;
                else if (discountPercent <= 30) bookingBonus = config.clientBonusFullSet.discount30;
                else if (discountPercent <= 50) bookingBonus = config.clientBonusFullSet.discount50;
                else bookingBonus = config.clientBonusFullSet.discountMore;
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
    } catch (err) {
      fastify.log.error(err as Error, 'KPI booker appointments error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể truy vấn danh sách lịch hẹn đặt.',
      });
    }
  });

  // GET /api/kpi/trends
  fastify.get('/kpi/trends', { preHandler: [requireAuth] }, async (request, reply) => {
    const { startDate, endDate, staffId } = request.query as {
      startDate?: string;
      endDate?: string;
      staffId?: string;
    };

    const user = request.user as { id: number; role: string };
    let targetStaffId: number | undefined = undefined;
    if (user.role === 'admin') {
      if (staffId) targetStaffId = parseInt(staffId, 10);
    } else {
      targetStaffId = user.id;
    }

    const { startStr, endStr, start, end } = parseDateRange(startDate, endDate, 7);

    try {
      const logs = await fastify.prisma.crm.crmCallLog.findMany({
        where: {
          createdAt: { gte: start, lte: new Date(end.getTime() + 24 * 60 * 60 * 1000) },
          ...(targetStaffId !== undefined ? { staffId: targetStaffId } : {}),
        },
        select: {
          callResult: true,
          outcome: true,
        },
      });

      const breakdown = {
        BOOKED: 0,
        CALL_BACK: 0,
        NO_ANSWER: 0,
        BUSY: 0,
        WRONG_NUMBER: 0,
        OTHERS: 0,
      };

      logs.forEach((l) => {
        if (l.callResult === 'NO_ANSWER') {
          breakdown.NO_ANSWER++;
        } else if (l.callResult === 'BUSY') {
          breakdown.BUSY++;
        } else if (l.callResult === 'WRONG_NUMBER') {
          breakdown.WRONG_NUMBER++;
        } else if (l.outcome === 'BOOKED') {
          breakdown.BOOKED++;
        } else if (l.outcome === 'CALL_BACK') {
          breakdown.CALL_BACK++;
        } else {
          breakdown.OTHERS++;
        }
      });

      const dailyKpis = await fastify.prisma.crm.crmStaffKpi.findMany({
        where: {
          kpiDate: { gte: start, lte: end },
          ...(targetStaffId !== undefined ? { staffId: targetStaffId } : {}),
        },
        orderBy: { kpiDate: 'asc' },
      });

      const dailyTrendsMap = new Map<string, { date: string; planned: number; called: number }>();

      const current = new Date(start);
      while (current <= end) {
        const dStr = current.toLocaleDateString('en-CA');
        dailyTrendsMap.set(dStr, { date: dStr, planned: 0, called: 0 });
        current.setDate(current.getDate() + 1);
      }

      dailyKpis.forEach((k) => {
        const dStr = k.kpiDate.toLocaleDateString('en-CA');
        const existing = dailyTrendsMap.get(dStr) || { date: dStr, planned: 0, called: 0 };
        existing.planned += k.totalPlanned;
        existing.called += k.totalCalled;
        dailyTrendsMap.set(dStr, existing);
      });

      const dailyTrends = Array.from(dailyTrendsMap.values());

      return {
        breakdown,
        dailyTrends,
      };
    } catch (err) {
      fastify.log.error(err as Error, 'KPI trends error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve KPI trend statistics',
      });
    }
  });
}
