import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middlewares/auth.js';
import { registerCcRoutes } from './routes/cc.routes.js';
import { registerCcPaystubRoutes } from './routes/cc-paystub.routes.js';
import { registerCcTipRoutes } from './routes/cc-tip.routes.js';
import { registerExportRoutes } from './routes/export.routes.js';
import { registerCvRoutes } from './routes/cv.routes.js';
import { registerCvTipRoutes } from './routes/cv-tip.routes.js';
import { registerCvPaystubRoutes } from './routes/cv-paystub.routes.js';
import { registerBkRoutes } from './routes/bk.routes.js';
import { registerPackageAuditRoutes } from './routes/package-audit.routes.js';
import { calculateBookerSalaryStats } from './services/salary-calculator.js';

// Default configuration parameters for Booker Salary
const DEFAULT_SALARY_CONFIG = {
  baseSalary: 5500000,
  tipsPercent: 7,
  clientBonusRefill: {
    discount30: 9000,
    discount50: 6000,
    discountMore: 1000,
  },
  clientBonusFullSet: {
    discount0: 35000,
    discount30: 12000,
    discount50: 6000,
    discountMore: 1000,
  },
  doneBonusTiers: [
    { minCount: 100, bonus: 300000 },
    { minCount: 150, bonus: 600000 },
    { minCount: 200, bonus: 900000 },
    { minCount: 250, bonus: 1200000 },
    { minCount: 300, bonus: 1500000 },
    { minCount: 350, bonus: 1800000 },
    { minCount: 400, bonus: 2100000 },
    { minCount: 450, bonus: 2400000 },
    { minCount: 500, bonus: 2700000 },
  ],
  missedBonusTiers: [
    { maxRate: 10, bonus: 1000000 },
    { maxRate: 15, bonus: 500000 },
    { maxRate: 20, bonus: 0 },
    { maxRate: 25, bonus: -500000 },
    { maxRate: 100, bonus: -1000000 },
  ],
  revBonusTiers: [
    { minRev: 50000000, rate: 0.007 },
    { minRev: 100000000, rate: 0.008 },
    { minRev: 150000000, rate: 0.009 },
    { minRev: 200000000, rate: 0.01 },
    { minRev: 250000000, rate: 0.011 },
    { minRev: 300000000, rate: 0.012 },
  ],
};

// Global in-memory cache for Booker Salary Config
let cachedSalaryConfig: SafeAny = null;

// Fetch salary config from DB or fallback to default
async function getSalaryConfig(fastify: FastifyInstance) {
  if (cachedSalaryConfig !== null) {
    return cachedSalaryConfig;
  }
  try {
    const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: 'BOOKER_SALARY_CONFIG' },
    });
    if (configRecord) {
      cachedSalaryConfig = JSON.parse(configRecord.value);
      return cachedSalaryConfig;
    }
  } catch (err) {
    fastify.log.error(err as SafeAny, 'Error fetching Booker salary config from DB');
  }
  return DEFAULT_SALARY_CONFIG;
}

async function calculateConsultantSalaryStats(
  fastify: SafeAny,
  start: Date,
  end: Date,
  targetUserId?: number
): Promise<
  Record<
    number,
    {
      role: 'oc';
      baseSalary: number;
      salesReward: number;
      servicingReward: number;
      growthReward: number;
      storeServicingReward: number;
      checkins: number;
      checkinLateMin: number;
      totalSalary: number;
    }
  >
> {
  let query = `
    SELECT p.*, u.full_name, u.username
    FROM \`staff_payroll_client_consultant\` p
    LEFT JOIN \`user_profile\` u ON p.user_id = u.user_id
    WHERE p.date >= ? AND p.date <= ?
  `;
  const params: SafeAny[] = [start, end];
  if (targetUserId !== undefined) {
    query += ` AND p.user_id = ?`;
    params.push(targetUserId);
  }
  const payrolls = (await fastify.prisma.legacy.$queryRawUnsafe(query, ...params)) as SafeAny[];

  const stats: Record<number, any> = {};

  payrolls.forEach((p: SafeAny) => {
    const uid = Number(p.user_id);
    let baseSalary = 0;
    let salesReward = 0;
    let servicingReward = 0;
    let growthReward = 0;
    let storeServicingReward = 0;
    let checkins = 0;
    let checkinLateMin = 0;

    try {
      const growth = JSON.parse(p.final_staff_growth);
      baseSalary = growth.total_wage_amount || 0;
      growthReward = growth.total_reward_amount || 0;
      checkins = growth.total_order_check_in || 0;
      checkinLateMin = growth.total_check_in_late_minute || 0;
    } catch (e) {}

    try {
      const sales = JSON.parse(p.final_staff_sales);
      salesReward = sales.total_reward_amount || 0;
    } catch (e) {}

    try {
      const serv = JSON.parse(p.final_staff_servicing);
      servicingReward = serv.total_reward_amount || 0;
    } catch (e) {}

    try {
      const store = JSON.parse(p.final_client_store_servicing);
      storeServicingReward = store.total_reward_amount || 0;
    } catch (e) {}

    const totalSalary = baseSalary + salesReward + servicingReward + growthReward + storeServicingReward;

    if (!stats[uid]) {
      stats[uid] = {
        role: 'oc',
        baseSalary: 0,
        salesReward: 0,
        servicingReward: 0,
        growthReward: 0,
        storeServicingReward: 0,
        checkins: 0,
        checkinLateMin: 0,
        totalSalary: 0,
      };
    }

    stats[uid].baseSalary += baseSalary;
    stats[uid].salesReward += salesReward;
    stats[uid].servicingReward += servicingReward;
    stats[uid].growthReward += growthReward;
    stats[uid].storeServicingReward += storeServicingReward;
    stats[uid].checkins += checkins;
    stats[uid].checkinLateMin += checkinLateMin;
    stats[uid].totalSalary += totalSalary;
  });

  return stats;
}

function getWeekNumber(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

function formatDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  const s = pad(d.getSeconds());
  return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

export async function kpiRoutes(fastify: FastifyInstance) {
  await registerCcRoutes(fastify);
  await registerCcPaystubRoutes(fastify);
  await registerCcTipRoutes(fastify);
  await registerExportRoutes(fastify);
  await registerCvRoutes(fastify);
  await registerCvTipRoutes(fastify);
  await registerCvPaystubRoutes(fastify);
  await registerBkRoutes(fastify);
  await registerPackageAuditRoutes(fastify);

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
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Export booker salary CSV error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi xuất CSV.' });
    }
  });

  // GET /api/kpi/salary-config (Accessible to all authenticated staff to display on dashboard, but edit is restricted to admin)
  fastify.get('/kpi/salary-config', { preHandler: [requireAuth] }, async (request, reply) => {
    const config = await getSalaryConfig(fastify);
    return config;
  });

  // POST /api/kpi/salary-config (Admin only)
  fastify.post('/kpi/salary-config', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string };
    if (user.role !== 'admin') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Chỉ quản trị viên mới có quyền cấu hình công thức lương.',
      });
    }

    const newConfig = request.body as SafeAny;
    if (!newConfig || typeof newConfig !== 'object') {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Cấu hình không hợp lệ.',
      });
    }

    try {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: 'BOOKER_SALARY_CONFIG' },
        update: { value: JSON.stringify(newConfig) },
        create: {
          key: 'BOOKER_SALARY_CONFIG',
          value: JSON.stringify(newConfig),
        },
      });

      // Update in-memory cache
      cachedSalaryConfig = newConfig;

      return { success: true, message: 'Cấu hình lương Booker đã được cập nhật thành công.' };
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Update salary config error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi lưu cấu hình lương.',
      });
    }
  });

  // GET /api/kpi/staff-levels
  fastify.get('/kpi/staff-levels', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'STAFF_TARGET_LEVELS' },
      });
      if (!config) {
        return {};
      }
      return JSON.parse(config.value);
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Get staff levels error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi tải danh sách cấp độ nhân sự.',
      });
    }
  });

  // POST /api/kpi/staff-levels (Admin only)
  fastify.post('/kpi/staff-levels', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string };
    if (user.role !== 'admin') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Chỉ quản trị viên mới có quyền cấu hình cấp độ mục tiêu nhân sự.',
      });
    }

    const levelsMap = request.body as SafeAny;
    if (!levelsMap || typeof levelsMap !== 'object') {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Cấu hình cấp độ không hợp lệ.',
      });
    }

    try {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: 'STAFF_TARGET_LEVELS' },
        update: { value: JSON.stringify(levelsMap) },
        create: {
          key: 'STAFF_TARGET_LEVELS',
          value: JSON.stringify(levelsMap),
        },
      });

      return { success: true, message: 'Đã cập nhật cấp độ mục tiêu nhân sự thành công.' };
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Update staff levels error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi lưu cấp độ mục tiêu nhân sự.',
      });
    }
  });

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
      profiles.forEach((p: SafeAny) => {
        staffNameToLegacyIdMap.set(p.fullName.toLowerCase().trim(), Number(p.userId));
      });

      const legacyUserIds = Array.from(staffNameToLegacyIdMap.values());

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
        const bookedOrders = await fastify.prisma.legacy.order.findMany({
          where: {
            created_staff_id: { in: legacyUserIds },
            date_created: { gte: start, lte: end },
            order_state: { not: 'Cancelled' },
          },
          select: {
            id: true,
          },
        });
        totalBooked = bookedOrders.length;
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
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Summary KPI error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve KPI summary',
      });
    }
  });

  // GET /api/kpi/leaderboard
  fastify.get('/kpi/leaderboard', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: number; role: string };

    const { startDate, endDate, role, staffIds } = request.query as {
      startDate?: string;
      endDate?: string;
      role?: string;
      staffIds?: string;
    };
    const { startStr, endStr, start, end } = parseDateRange(startDate, endDate, 30);

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
            .filter((n) => !isNaN(n)),
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
        // Strict Rule #10: Booked count MUST be calculated strictly by date_created string range without OR booking_date_start
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

        const bookedRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sqlBooked);
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

        const totalBooked = legacyUserId ? bookedCountMap.get(legacyUserId) || 0 : 0;
        const totalPlanned = totalBooked;
        const totalCalled = callStats.totalCalled;
        const totalAnswered = callStats.totalAnswered;

        const answerRate = totalCalled > 0 ? Math.round((totalAnswered / totalCalled) * 100) : 0;
        const bookingRate = totalAnswered > 0 ? Math.round((totalBooked / totalAnswered) * 100) : 0;
        const checkinRate = totalBooked > 0 ? Math.round((salary.doneCount / totalBooked) * 100) : 0;

        const totalHappy = callStats.totalHappy;

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

      if (user.role === 'admin') {
        leaderboard.sort((a, b) => b.totalEarnings - a.totalEarnings);
      } else {
        leaderboard.sort((a, b) => b.totalCheckin - a.totalCheckin);
      }
      return leaderboard;
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Leaderboard KPI error');
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
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'KPI booker appointments error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể truy vấn danh sách lịch hẹn đặt.',
      });
    }
  });

  // GET /api/kpi/trends
  fastify.get(
    '/kpi/trends',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['KPI'],
        summary: 'Get KPI call breakdown and daily trends',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            staffId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
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
      } catch (err: SafeAny) {
        fastify.log.error(err as SafeAny, 'KPI trends error');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to retrieve KPI trend statistics',
        });
      }
    }
  );
}
