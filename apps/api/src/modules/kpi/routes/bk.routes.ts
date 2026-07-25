import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import {
  BkBookingLeaderboardEntry,
  BkBookingRecord,
  BkBookingResponse,
  BkDoneLeaderboardEntry,
  BkDoneRecord,
  BkDoneResponse,
  BkTipLeaderboardEntry,
  BkTipRecord,
  BkTipResponse,
  BkRevenueLeaderboardEntry,
  BkRevenueRecord,
  BkRevenueResponse,
  BkPaystubRecord,
  BkPaystubResponse,
  BkSalaryConfig,
} from '@mos-lab/shared';

type SafeAny = any;

const DEFAULT_BK_CONFIG: BkSalaryConfig = {
  activeBkIds: [43554, 50670, 52316, 32268, 49126, 50585],
  baseSalary: 5500000,
  tipsPercent: 7,
  clientBonusFullSet: {
    discount0: 35000,
    discount30: 12000,
    discount50: 6000,
    discountMore: 1000,
  },
  clientBonusRefill: {
    discount30: 9000,
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
    { minRev: 50000000, rate: 0.7 },
    { minRev: 100000000, rate: 0.8 },
    { minRev: 150000000, rate: 0.9 },
    { minRev: 200000000, rate: 1.0 },
    { minRev: 250000000, rate: 1.1 },
    { minRev: 300000000, rate: 1.2 },
  ],
};

async function getActiveBkIds(fastify: FastifyInstance): Promise<number[]> {
  try {
    const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: 'ACTIVE_BK_STAFF_CONFIG' },
    });
    if (configRecord && configRecord.value) {
      const parsed = JSON.parse(configRecord.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((id: SafeAny) => Number(id)).filter((id: number) => !isNaN(id));
      }
    }
  } catch (err) {
    fastify.log.error(err as SafeAny, 'Error fetching ACTIVE_BK_STAFF_CONFIG from DB');
  }
  return DEFAULT_BK_CONFIG.activeBkIds;
}

async function getBkSalaryConfig(fastify: FastifyInstance): Promise<BkSalaryConfig> {
  try {
    const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: 'BK_SALARY_CONFIG' },
    });
    if (configRecord && configRecord.value) {
      const parsed = JSON.parse(configRecord.value);
      return {
        ...DEFAULT_BK_CONFIG,
        ...parsed,
        activeBkIds: await getActiveBkIds(fastify),
      };
    }
  } catch (err) {
    fastify.log.error(err as SafeAny, 'Error fetching BK_SALARY_CONFIG from DB');
  }
  return {
    ...DEFAULT_BK_CONFIG,
    activeBkIds: await getActiveBkIds(fastify),
  };
}

function getMilestoneBonus(doneCount: number, tiers?: Array<{ minCount: number; bonus: number }>): number {
  const sorted = [...(tiers || DEFAULT_BK_CONFIG.doneBonusTiers)].sort((a, b) => b.minCount - a.minCount);
  const found = sorted.find((t) => doneCount >= t.minCount);
  return found ? found.bonus : 0;
}

function getMissedRateBonus(missedRatePercent: number, tiers?: Array<{ maxRate: number; bonus: number }>): number {
  const sorted = [...(tiers || DEFAULT_BK_CONFIG.missedBonusTiers)].sort((a, b) => a.maxRate - b.maxRate);
  const found = sorted.find((t) => missedRatePercent <= t.maxRate);
  return found ? found.bonus : 0;
}

function getRevCommissionRate(totalRevenue: number, tiers?: Array<{ minRev: number; rate: number }>): number {
  const sorted = [...(tiers || DEFAULT_BK_CONFIG.revBonusTiers)].sort((a, b) => b.minRev - a.minRev);
  const found = sorted.find((t) => totalRevenue >= t.minRev);
  return found ? found.rate : 0;
}

function calculateCheckinBonus(
  serviceType: string,
  serviceName: string,
  servicePrice: number,
  discountAmount: number,
  config: BkSalaryConfig
): { bonus: number; checkinCategory: string; discountRate: number } {
  const isRefill = serviceType === 'Retain' || /refill|dặm/i.test(serviceName);
  const discountRate = servicePrice > 0 ? (discountAmount / servicePrice) * 100 : 0;

  if (isRefill) {
    if (discountRate <= 30) {
      return { bonus: config.clientBonusRefill?.discount30 ?? 9000, checkinCategory: 'Dặm Mi (<=30%)', discountRate };
    } else if (discountRate <= 50) {
      return { bonus: config.clientBonusRefill?.discount50 ?? 6000, checkinCategory: 'Dặm Mi (<=50%)', discountRate };
    } else {
      return { bonus: config.clientBonusRefill?.discountMore ?? 1000, checkinCategory: 'Dặm Mi (>50%)', discountRate };
    }
  } else {
    if (discountRate <= 0) {
      return { bonus: config.clientBonusFullSet?.discount0 ?? 35000, checkinCategory: 'Nối Mới (0%)', discountRate };
    } else if (discountRate <= 30) {
      return {
        bonus: config.clientBonusFullSet?.discount30 ?? 12000,
        checkinCategory: 'Nối Mới (<=30%)',
        discountRate,
      };
    } else if (discountRate <= 50) {
      return { bonus: config.clientBonusFullSet?.discount50 ?? 6000, checkinCategory: 'Nối Mới (<=50%)', discountRate };
    } else {
      return {
        bonus: config.clientBonusFullSet?.discountMore ?? 1000,
        checkinCategory: 'Nối Mới (>50%)',
        discountRate,
      };
    }
  }
}

async function computeBkOrderCheckins(
  fastify: FastifyInstance,
  startPart: string,
  endPart: string,
  targetBkIds: number[],
  storeFilter: string = ''
) {
  const config = await getBkSalaryConfig(fastify);

  if (targetBkIds.length === 0) {
    return {
      clientBonusMap: new Map<number, number>(),
      orderCheckinMap: new Map<
        number,
        {
          bonus: number;
          checkinCategory: string;
          discountRate: number;
          isCombo: boolean;
          serviceName?: string;
          servicePrice?: number;
          discountPercent?: number;
        }
      >(),
    };
  }

  const bkIdsStr = targetBkIds.join(',');

  const sql = `
    SELECT 
      o.id as orderId,
      o.created_staff_id as bookerId,
      o.user_id as userId,
      COALESCE(ro.actual_booking_date_start, o.booking_date_start) as bookingDateStart,
      o.date_created as dateCreated,
      COALESCE(o.total_price, 0) as totalPrice
    FROM \`order\` o
    LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
    LEFT JOIN report_order ro ON o.id = ro.order_id
    WHERE COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${startPart} 00:00:00' 
      AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${endPart} 23:59:59'
      AND o.order_state = 'Completed'
      AND o.created_staff_id IN (${bkIdsStr})
      ${storeFilter}
  `;

  const orders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql);
  const orderIds = orders.map((o) => Number(o.orderId));
  const userIds = Array.from(new Set(orders.map((o) => Number(o.userId)).filter((id) => !!id)));

  const clientBonusMap = new Map<number, number>();
  const orderCheckinMap = new Map<
    number,
    {
      bonus: number;
      checkinCategory: string;
      discountRate: number;
      isCombo: boolean;
      serviceName?: string;
      servicePrice?: number;
      discountPercent?: number;
    }
  >();

  if (orderIds.length === 0) {
    return { clientBonusMap, orderCheckinMap };
  }

  // Fetch order_service
  const orderServicesMap = new Map<number, any[]>();
  const orderServices = await fastify.prisma.legacy.order_service.findMany({
    where: { order_id: { in: orderIds } },
  });
  orderServices.forEach((os) => {
    const list = orderServicesMap.get(os.order_id) || [];
    list.push(os);
    orderServicesMap.set(os.order_id, list);
  });

  const serviceIds = Array.from(new Set(orderServices.map((os) => os.service_id)));
  const serviceNameMap = new Map<number, string>();
  if (serviceIds.length > 0) {
    const serviceLanguages = await fastify.prisma.legacy.service_language.findMany({
      where: { service_id: { in: serviceIds } },
    });
    serviceLanguages.forEach((sl) => serviceNameMap.set(sl.service_id, sl.service_name));
  }

  // Fetch user_service_balance for checkHasLiveCombo
  const userBalances =
    userIds.length > 0
      ? await fastify.prisma.legacy.user_service_balance.findMany({
          where: { user_id: { in: userIds } },
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
      if (new Date(usb.date_created) >= new Date(bTime)) continue;

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

      if (isNotExpired && countLeft > 0) return true;
    }
    return false;
  };

  orders.forEach((o) => {
    const orderId = Number(o.orderId);
    const bookerId = Number(o.bookerId);
    const list = orderServicesMap.get(orderId) || [];

    let primaryService = list[0];
    for (const os of list) {
      if (os.service_price > (primaryService?.service_price || 0)) {
        primaryService = os;
      }
    }

    const serviceName = primaryService ? serviceNameMap.get(primaryService.service_id) || 'Unknown' : 'Unknown';
    const serviceType = primaryService ? primaryService.service_type : '';
    const servicePrice = primaryService ? primaryService.service_price : 0;
    const discountAmount = primaryService ? primaryService.discount_amount : 0;

    const isCombo = checkHasLiveCombo(Number(o.userId), o.bookingDateStart, o.dateCreated);

    let bonus = 0;
    let checkinCategory = 'Single (0đ)';
    let discountRate = 0;

    if (isCombo) {
      bonus = 0;
      checkinCategory = 'Combo (0đ)';
    } else {
      const calculated = calculateCheckinBonus(serviceType, serviceName, servicePrice, discountAmount, config);
      bonus = calculated.bonus;
      checkinCategory = calculated.checkinCategory;
      discountRate = calculated.discountRate;
    }

    orderCheckinMap.set(orderId, {
      bonus,
      checkinCategory,
      discountRate,
      isCombo,
      serviceName,
      servicePrice,
      discountPercent: discountRate,
    });

    const prevBonus = clientBonusMap.get(bookerId) || 0;
    clientBonusMap.set(bookerId, prevBonus + bonus);
  });

  return { clientBonusMap, orderCheckinMap };
}

export async function registerBkRoutes(fastify: FastifyInstance) {
  // 1. Booking Leaderboard
  fastify.get('/kpi/bk/booking/leaderboard', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dateFrom, dateTo, storeId } = request.query as {
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    const startStr = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    const endStr = dateTo || new Date().toLocaleDateString('en-CA');
    const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
    const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

    try {
      const activeBkIds = await getActiveBkIds(fastify);
      if (activeBkIds.length === 0) {
        return reply.send({
          leaderboard: [],
          summary: { totalBookings: 0, doneBookings: 0, conversionRate: 0, totalCalls: 0 },
        });
      }

      const bkIdsStr = activeBkIds.join(',');

      let storeFilter = '';
      if (storeId && storeId !== 'ALL') {
        storeFilter = `AND UPPER(cs.client_store_key) = '${storeId.toUpperCase()}'`;
      }

      const sql = `
        SELECT 
          up.user_id as bookerId,
          up.full_name as displayName,
          up.avatar as avatar,
          UPPER(COALESCE(cs.client_store_key, 'PXL')) as store,
          COUNT(DISTINCT o.id) as totalCreatedBookings,
          COUNT(DISTINCT CASE WHEN o.order_state = 'Completed' THEN o.id END) as doneBookings,
          COUNT(DISTINCT CASE WHEN o.order_state IN ('Cancelled', 'Missed') THEN o.id END) as missedBookings
        FROM \`user_profile\` up
        LEFT JOIN \`client_store\` cs ON cs.id = up.client_store_id
        LEFT JOIN \`order\` o ON o.created_staff_id = up.user_id 
          AND o.date_created >= '${startPart} 00:00:00' 
          AND o.date_created <= '${endPart} 23:59:59'
          ${storeFilter}
        WHERE up.user_id IN (${bkIdsStr})
        GROUP BY up.user_id, up.full_name, up.avatar, cs.client_store_key
        ORDER BY totalCreatedBookings DESC, doneBookings DESC
      `;

      const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql);

      let rank = 1;
      let grandTotalBookings = 0;
      let grandDoneBookings = 0;

      const leaderboard: BkBookingLeaderboardEntry[] = rows.map((r) => {
        const totalCreatedBookings = Number(r.totalCreatedBookings || 0);
        const doneBookings = Number(r.doneBookings || 0);
        const missedBookings = Number(r.missedBookings || 0);

        grandTotalBookings += totalCreatedBookings;
        grandDoneBookings += doneBookings;

        const conversionRate =
          totalCreatedBookings > 0 ? Number(((doneBookings / totalCreatedBookings) * 100).toFixed(1)) : 0;

        return {
          rank: rank++,
          bookerId: Number(r.bookerId),
          displayName: String(r.displayName || `BK #${r.bookerId}`),
          avatar: r.avatar ? String(r.avatar) : null,
          store: String(r.store || 'PXL'),
          totalCreatedBookings,
          doneBookings,
          missedBookings,
          conversionRate,
          callCount: 0,
        };
      });

      const avgConversionRate =
        grandTotalBookings > 0 ? Number(((grandDoneBookings / grandTotalBookings) * 100).toFixed(1)) : 0;

      return {
        leaderboard,
        summary: {
          totalBookings: grandTotalBookings,
          doneBookings: grandDoneBookings,
          conversionRate: avgConversionRate,
          totalCalls: 0,
        },
      };
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK booking leaderboard');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải Leaderboard Booking.' });
    }
  });

  // 1.2 Booking Details
  fastify.get('/kpi/bk/booking/details', { preHandler: [requireAuth] }, async (request, reply) => {
    const { bookerId, dateFrom, dateTo, storeId } = request.query as {
      bookerId?: string;
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    const startStr = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    const endStr = dateTo || new Date().toLocaleDateString('en-CA');
    const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
    const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

    try {
      const config = await getBkSalaryConfig(fastify);

      let bookerFilter = '';
      if (bookerId && bookerId !== 'ALL') {
        bookerFilter = `AND o.created_staff_id = ${Number(bookerId)}`;
      } else {
        const activeBkIds = config.activeBkIds;
        bookerFilter = `AND o.created_staff_id IN (${activeBkIds.join(',')})`;
      }

      let storeFilter = '';
      if (storeId && storeId !== 'ALL') {
        storeFilter = `AND UPPER(cs.client_store_key) = '${storeId.toUpperCase()}'`;
      }

      const sql = `
        SELECT 
          o.id as orderId,
          o.order_key as orderKey,
          o.user_id as customerId,
          COALESCE(up_c.full_name, 'Khách hàng') as clientName,
          COALESCE(uc_c.phone_number, '') as clientPhone,
          o.booking_channels as bookingChannel,
          o.booking_date_start as bookingDate,
          o.date_created as createdDate,
          UPPER(COALESCE(cs.client_store_key, 'PXL')) as store,
          o.order_state as orderState,
          COALESCE(o.total_price, 0) as totalPrice,
          o.created_staff_id as bookerId,
          up_b.full_name as bookerName,
          up_b.avatar as avatar
        FROM \`order\` o
        LEFT JOIN \`user_profile\` up_c ON up_c.user_id = o.user_id
        LEFT JOIN (
          SELECT user_id, MAX(phone_number) as phone_number
          FROM user_contact
          WHERE is_disabled = 0
          GROUP BY user_id
        ) uc_c ON uc_c.user_id = o.user_id
        LEFT JOIN \`user_profile\` up_b ON up_b.user_id = o.created_staff_id
        LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
        WHERE o.date_created >= '${startPart} 00:00:00' 
          AND o.date_created <= '${endPart} 23:59:59'
          ${bookerFilter}
          ${storeFilter}
        ORDER BY o.date_created DESC
        LIMIT 500
      `;

      const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql);

      let totalBookings = 0;
      let doneBookings = 0;

      const data: BkBookingRecord[] = rows.map((r) => {
        const orderState = String(r.orderState || 'New');
        totalBookings++;
        if (orderState === 'Completed') {
          doneBookings++;
        }

        return {
          orderId: Number(r.orderId),
          orderKey: String(r.orderKey || `#${r.orderId}`),
          bookingDate: r.bookingDate ? new Date(r.bookingDate).toISOString() : '',
          createdDate: r.createdDate ? new Date(r.createdDate).toISOString() : '',
          clientName: String(r.clientName),
          clientPhone: String(r.clientPhone || ''),
          store: String(r.store),
          status: orderState,
          bookerId: Number(r.bookerId),
          bookerName: String(r.bookerName || `BK #${r.bookerId}`),
          avatar: r.avatar ? String(r.avatar) : null,
          customerId: r.customerId ? Number(r.customerId) : undefined,
        };
      });

      const conversionRate = totalBookings > 0 ? Number(((doneBookings / totalBookings) * 100).toFixed(1)) : 0;

      return {
        data,
        total: totalBookings,
        summary: {
          totalBookings,
          doneBookings,
          conversionRate,
          totalCalls: 0,
        },
      };
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK booking details');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải chi tiết Booking.' });
    }
  });

  // 2. Done Leaderboard
  fastify.get('/kpi/bk/done/leaderboard', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dateFrom, dateTo, storeId } = request.query as {
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    const startStr = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    const endStr = dateTo || new Date().toLocaleDateString('en-CA');
    const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
    const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

    try {
      const config = await getBkSalaryConfig(fastify);
      const activeBkIds = config.activeBkIds;
      if (activeBkIds.length === 0) {
        return reply.send({ leaderboard: [], summary: { totalDone: 0, avgDoneRate: 0, totalDoneBonus: 0 } });
      }

      let storeFilter = '';
      if (storeId && storeId !== 'ALL') {
        storeFilter = `AND UPPER(cs.client_store_key) = '${storeId.toUpperCase()}'`;
      }

      // Compute Check-in bonuses per Booker (matching salary-calculator.ts and /dashboard/kpi)
      const { clientBonusMap } = await computeBkOrderCheckins(fastify, startPart, endPart, activeBkIds, storeFilter);

      const sql = `
        SELECT 
          up.user_id as bookerId,
          up.full_name as displayName,
          up.avatar as avatar,
          UPPER(COALESCE(cs.client_store_key, 'PXL')) as store,
          COUNT(DISTINCT CASE WHEN o.order_state = 'Completed' THEN o.id END) as doneCount,
          COUNT(DISTINCT CASE WHEN o.order_state IN ('Cancelled', 'Missed') THEN o.id END) as missedCount,
          COUNT(DISTINCT o.id) as totalCount
        FROM \`user_profile\` up
        LEFT JOIN \`client_store\` cs ON cs.id = up.client_store_id
        LEFT JOIN \`order\` o ON o.created_staff_id = up.user_id 
          AND o.booking_date_start >= '${startPart} 00:00:00' 
          AND o.booking_date_start <= '${endPart} 23:59:59'
          ${storeFilter}
        WHERE up.user_id IN (${activeBkIds.join(',')})
        GROUP BY up.user_id, up.full_name, up.avatar, cs.client_store_key
        ORDER BY doneCount DESC
      `;

      const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql);

      let rank = 1;
      let grandTotalDone = 0;
      let grandTotalDoneBonus = 0;

      const leaderboard: BkDoneLeaderboardEntry[] = rows.map((r) => {
        const bookerId = Number(r.bookerId);
        const doneCount = Number(r.doneCount || 0);
        const missedCount = Number(r.missedCount || 0);
        const totalCount = Number(r.totalCount || 0);
        const doneRatePercent = totalCount > 0 ? Number(((doneCount / totalCount) * 100).toFixed(1)) : 0;
        const missedRatePercent = totalCount > 0 ? Number(((missedCount / totalCount) * 100).toFixed(1)) : 0;

        const basicBonus = clientBonusMap.get(bookerId) || 0;
        const promoBonus = 0;

        const milestoneBonus = getMilestoneBonus(doneCount, config.doneBonusTiers);
        const penaltyBonus = getMissedRateBonus(missedRatePercent, config.missedBonusTiers);

        const totalDoneBonus = basicBonus + promoBonus + milestoneBonus + penaltyBonus;

        grandTotalDone += doneCount;
        grandTotalDoneBonus += totalDoneBonus;

        return {
          rank: rank++,
          bookerId,
          displayName: String(r.displayName || `BK #${r.bookerId}`),
          avatar: r.avatar ? String(r.avatar) : null,
          store: String(r.store || 'PXL'),
          doneCount,
          missedCount,
          doneRatePercent,
          basicBonus,
          promoBonus,
          milestoneBonus,
          penaltyBonus,
          totalDoneBonus,
        };
      });

      const avgDoneRate =
        leaderboard.length > 0
          ? Number((leaderboard.reduce((acc, l) => acc + l.doneRatePercent, 0) / leaderboard.length).toFixed(1))
          : 0;

      return {
        leaderboard,
        summary: {
          totalDone: grandTotalDone,
          avgDoneRate,
          totalDoneBonus: grandTotalDoneBonus,
        },
      };
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK done leaderboard');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải Leaderboard Done.' });
    }
  });

  // 2.2 Done Details
  fastify.get('/kpi/bk/done/details', { preHandler: [requireAuth] }, async (request, reply) => {
    const { bookerId, dateFrom, dateTo, storeId } = request.query as {
      bookerId?: string;
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    const startStr = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    const endStr = dateTo || new Date().toLocaleDateString('en-CA');
    const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
    const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

    try {
      const config = await getBkSalaryConfig(fastify);

      let targetBkIds = config.activeBkIds;
      let bookerFilter = '';
      if (bookerId && bookerId !== 'ALL') {
        targetBkIds = [Number(bookerId)];
        bookerFilter = `AND o.created_staff_id = ${Number(bookerId)}`;
      } else {
        bookerFilter = `AND o.created_staff_id IN (${targetBkIds.join(',')})`;
      }

      let storeFilter = '';
      if (storeId && storeId !== 'ALL') {
        storeFilter = `AND UPPER(cs.client_store_key) = '${storeId.toUpperCase()}'`;
      }

      // Compute Check-in bonuses per Order
      const { orderCheckinMap } = await computeBkOrderCheckins(fastify, startPart, endPart, targetBkIds, storeFilter);

      const sql = `
        SELECT 
          o.id as orderId,
          o.order_key as orderKey,
          o.user_id as customerId,
          COALESCE(ro.actual_booking_date_start, o.booking_date_start) as orderDate,
          COALESCE(up_c.full_name, 'Khách hàng') as clientName,
          COALESCE(uc_c.phone_number, '') as clientPhone,
          UPPER(COALESCE(cs.client_store_key, 'PXL')) as store,
          COALESCE(o.total_price, 0) as totalPrice,
          up_b.full_name as bookerName,
          COALESCE(st.tip_amount, 0) as tipAmount,
          o.order_state as orderState
        FROM \`order\` o
        LEFT JOIN \`user_profile\` up_c ON up_c.user_id = o.user_id
        LEFT JOIN (
          SELECT user_id, MAX(phone_number) as phone_number
          FROM user_contact
          WHERE is_disabled = 0
          GROUP BY user_id
        ) uc_c ON uc_c.user_id = o.user_id
        LEFT JOIN \`user_profile\` up_b ON up_b.user_id = o.created_staff_id
        LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
        LEFT JOIN \`staff_tip\` st ON st.order_id = o.id AND st.tip_percentage = 20
        LEFT JOIN report_order ro ON o.id = ro.order_id
        WHERE COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${startPart} 00:00:00' 
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${endPart} 23:59:59'
          AND o.order_state = 'Completed'
          ${bookerFilter}
          ${storeFilter}
        ORDER BY COALESCE(ro.actual_booking_date_start, o.booking_date_start) DESC
        LIMIT 500
      `;

      const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql);

      let totalDoneBonusSum = 0;

      const data: BkDoneRecord[] = rows.map((r) => {
        const orderId = Number(r.orderId);
        const totalPrice = Number(r.totalPrice || 0);

        const checkinInfo = orderCheckinMap.get(orderId) || {
          bonus: 0,
          checkinCategory: 'Single (0đ)',
          discountRate: 0,
          isCombo: false,
          serviceName: 'Không có thông tin',
          servicePrice: 0,
          discountPercent: 0,
        };

        const basicDoneBonus = checkinInfo.bonus;
        const promoBonus = 0;
        const promoLevel = checkinInfo.checkinCategory;
        const milestoneBonus = 0;
        const doneRatePenaltyBonus = 0;
        const totalDoneBonus = basicDoneBonus + promoBonus;

        totalDoneBonusSum += totalDoneBonus;

        return {
          orderId,
          orderKey: String(r.orderKey || `#${r.orderId}`),
          orderDate: r.orderDate ? new Date(r.orderDate).toISOString() : '',
          clientName: String(r.clientName),
          clientPhone: String(r.clientPhone || ''),
          bookerName: r.bookerName ? String(r.bookerName) : undefined,
          store: String(r.store),
          serviceName: checkinInfo.serviceName || 'Không có thông tin',
          servicePrice: checkinInfo.servicePrice || 0,
          discountPercent: Math.round(checkinInfo.discountPercent || 0),
          netRevenue: totalPrice,
          tipAmount: Number(r.tipAmount || 0),
          totalPrice,
          basicDoneBonus,
          promoBonus,
          promoLevel,
          milestoneBonus,
          doneRatePenaltyBonus,
          totalDoneBonus,
          status: String(r.orderState || 'Completed'),
          customerId: r.customerId ? Number(r.customerId) : undefined,
        };
      });

      return {
        data,
        total: data.length,
        summary: {
          totalDone: data.length,
          avgDoneRate: 100,
          totalDoneBonus: totalDoneBonusSum,
        },
      };
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK done details');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải chi tiết Done.' });
    }
  });

  // 3. BK Tip Leaderboard
  fastify.get('/kpi/bk/tip/leaderboard', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dateFrom, dateTo, storeId } = request.query as {
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    const startStr = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    const endStr = dateTo || new Date().toLocaleDateString('en-CA');
    const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
    const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

    try {
      const config = await getBkSalaryConfig(fastify);
      const activeBkIds = config.activeBkIds;
      if (activeBkIds.length === 0) {
        return reply.send({
          leaderboard: [],
          summary: { totalBookingsCount: 0, tippedBookingsCount: 0, totalCustomerTip: 0, totalBkTipBonus: 0 },
        });
      }

      const bkIdsStr = activeBkIds.join(',');

      let storeFilter = '';
      if (storeId && storeId !== 'ALL') {
        storeFilter = `AND UPPER(cs.client_store_key) = '${storeId.toUpperCase()}'`;
      }

      const sql = `
        SELECT 
          up.user_id as bookerId,
          up.full_name as displayName,
          up.avatar as avatar,
          UPPER(COALESCE(cs.client_store_key, 'PXL')) as store,
          COUNT(DISTINCT o.id) as totalBookingsCount,
          COUNT(DISTINCT CASE WHEN st.tip_amount > 0 THEN o.id END) as tippedBookingsCount,
          COALESCE(SUM(st.customer_tip_100), 0) as totalCustomerTip
        FROM \`user_profile\` up
        LEFT JOIN \`client_store\` cs ON cs.id = up.client_store_id
        LEFT JOIN (
          SELECT o2.*, COALESCE(ro.actual_booking_date_start, o2.booking_date_start) as final_date
          FROM \`order\` o2
          LEFT JOIN report_order ro ON o2.id = ro.order_id
        ) o ON o.created_staff_id = up.user_id 
          AND o.final_date >= '${startPart} 00:00:00' 
          AND o.final_date <= '${endPart} 23:59:59'
          AND o.order_state = 'Completed'
          ${storeFilter}
        LEFT JOIN (
          SELECT 
            order_id, 
            MAX(tip_amount) as tip_amount,
            MAX(CASE WHEN tip_percentage > 0 THEN tip_amount / (tip_percentage / 100) ELSE 0 END) as customer_tip_100
          FROM staff_tip
          GROUP BY order_id
        ) st ON st.order_id = o.id
        WHERE up.user_id IN (${bkIdsStr})
        GROUP BY up.user_id, up.full_name, up.avatar, cs.client_store_key
        ORDER BY totalCustomerTip DESC
      `;

      const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql);

      let rank = 1;
      let grandTotalBookings = 0;
      let grandTippedBookings = 0;
      let grandTotalCustomerTip = 0;
      let grandTotalBkTipBonus = 0;

      const leaderboard: BkTipLeaderboardEntry[] = rows.map((r) => {
        const totalBookingsCount = Number(r.totalBookingsCount || 0);
        const tippedBookingsCount = Number(r.tippedBookingsCount || 0);
        const totalCustomerTip = Number(r.totalCustomerTip || 0);
        const totalBkTipBonus = (totalCustomerTip * (config.tipsPercent || 7)) / 100;

        grandTotalBookings += totalBookingsCount;
        grandTippedBookings += tippedBookingsCount;
        grandTotalCustomerTip += totalCustomerTip;
        grandTotalBkTipBonus += totalBkTipBonus;

        return {
          rank: rank++,
          bookerId: Number(r.bookerId),
          displayName: String(r.displayName || `BK #${r.bookerId}`),
          avatar: r.avatar ? String(r.avatar) : null,
          store: String(r.store || 'PXL'),
          totalBookingsCount,
          tippedBookingsCount,
          totalCustomerTip,
          totalBkTipBonus,
        };
      });

      return {
        leaderboard,
        summary: {
          totalBookingsCount: grandTotalBookings,
          tippedBookingsCount: grandTippedBookings,
          totalCustomerTip: grandTotalCustomerTip,
          totalBkTipBonus: grandTotalBkTipBonus,
        },
      };
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK tip leaderboard');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải Leaderboard BK Tip.' });
    }
  });

  // 3.2 BK Tip Details
  fastify.get('/kpi/bk/tip/details', { preHandler: [requireAuth] }, async (request, reply) => {
    const { bookerId, dateFrom, dateTo, storeId } = request.query as {
      bookerId?: string;
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    const startStr = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    const endStr = dateTo || new Date().toLocaleDateString('en-CA');
    const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
    const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

    try {
      const config = await getBkSalaryConfig(fastify);

      let bookerFilter = '';
      if (bookerId && bookerId !== 'ALL') {
        bookerFilter = `AND o.created_staff_id = ${Number(bookerId)}`;
      } else {
        const activeBkIds = config.activeBkIds;
        bookerFilter = `AND o.created_staff_id IN (${activeBkIds.join(',')})`;
      }

      let storeFilter = '';
      if (storeId && storeId !== 'ALL') {
        storeFilter = `AND UPPER(cs.client_store_key) = '${storeId.toUpperCase()}'`;
      }

      const sql = `
        SELECT 
          o.id as orderId,
          COALESCE(ro.actual_booking_date_start, o.booking_date_start) as checkinTime,
          COALESCE(up_c.full_name, 'Khách hàng') as clientName,
          UPPER(COALESCE(cs.client_store_key, 'PXL')) as store,
          COALESCE(up_b.full_name, 'Booker') as bookerName,
          up_b.avatar as avatar,
          COALESCE(st.customer_tip_100, 0) as totalCustomerTip
        FROM \`order\` o
        LEFT JOIN \`user_profile\` up_c ON up_c.user_id = o.user_id
        LEFT JOIN \`user_profile\` up_b ON up_b.user_id = o.created_staff_id
        LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
        JOIN (
          SELECT 
            order_id, 
            MAX(CASE WHEN tip_percentage > 0 THEN tip_amount / (tip_percentage / 100) ELSE tip_amount END) as customer_tip_100
          FROM staff_tip
          WHERE tip_amount > 0
          GROUP BY order_id
        ) st ON st.order_id = o.id
        LEFT JOIN report_order ro ON o.id = ro.order_id
        WHERE COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${startPart} 00:00:00' 
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${endPart} 23:59:59'
          AND o.order_state = 'Completed'
          ${bookerFilter}
          ${storeFilter}
        ORDER BY COALESCE(ro.actual_booking_date_start, o.booking_date_start) DESC
        LIMIT 500
      `;

      const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql);

      let totalCustomerTipSum = 0;
      let totalBkTipBonusSum = 0;

      const data: BkTipRecord[] = rows.map((r) => {
        const totalCustomerTip = Number(r.totalCustomerTip || 0);
        const bkTipAmount = (totalCustomerTip * (config.tipsPercent || 7)) / 100;

        totalCustomerTipSum += totalCustomerTip;
        totalBkTipBonusSum += bkTipAmount;

        return {
          orderId: Number(r.orderId),
          checkinTime: r.checkinTime ? new Date(r.checkinTime).toISOString() : '',
          clientName: String(r.clientName),
          store: String(r.store),
          bookerName: String(r.bookerName),
          avatar: r.avatar ? String(r.avatar) : null,
          totalCustomerTip,
          bkTipAmount,
          bkTipPercentage: config.tipsPercent || 7,
        };
      });

      return {
        data,
        total: data.length,
        summary: {
          totalBookingsCount: data.length,
          tippedBookingsCount: data.length,
          totalCustomerTip: totalCustomerTipSum,
          totalBkTipBonus: totalBkTipBonusSum,
        },
      };
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK tip details');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải chi tiết BK Tip.' });
    }
  });

  // 4. Revenue Leaderboard
  fastify.get('/kpi/bk/revenue/leaderboard', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dateFrom, dateTo, storeId } = request.query as {
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    const startStr = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    const endStr = dateTo || new Date().toLocaleDateString('en-CA');
    const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
    const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

    try {
      const config = await getBkSalaryConfig(fastify);
      const activeBkIds = config.activeBkIds;
      if (activeBkIds.length === 0) {
        return reply.send({
          leaderboard: [],
          summary: { completedOrdersCount: 0, totalRevenue: 0, totalCommissionBonus: 0 },
        });
      }

      const bkIdsStr = activeBkIds.join(',');

      let storeFilter = '';
      if (storeId && storeId !== 'ALL') {
        storeFilter = `AND UPPER(cs.client_store_key) = '${storeId.toUpperCase()}'`;
      }

      const sql = `
        SELECT 
          up.user_id as bookerId,
          up.full_name as displayName,
          up.avatar as avatar,
          UPPER(COALESCE(cs.client_store_key, 'PXL')) as store,
          COUNT(DISTINCT o.id) as completedOrdersCount,
          COALESCE(SUM(o.total_price), 0) as totalRevenue
        FROM \`user_profile\` up
        LEFT JOIN \`client_store\` cs ON cs.id = up.client_store_id
        LEFT JOIN (
          SELECT o2.*, COALESCE(ro.actual_booking_date_start, o2.booking_date_start) as final_date
          FROM \`order\` o2
          LEFT JOIN report_order ro ON o2.id = ro.order_id
        ) o ON o.created_staff_id = up.user_id 
          AND o.final_date >= '${startPart} 00:00:00' 
          AND o.final_date <= '${endPart} 23:59:59'
          AND o.order_state = 'Completed'
          ${storeFilter}
        WHERE up.user_id IN (${bkIdsStr})
        GROUP BY up.user_id, up.full_name, up.avatar, cs.client_store_key
        ORDER BY totalRevenue DESC
      `;

      const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql);

      let rank = 1;
      let grandTotalOrders = 0;
      let grandTotalRevenue = 0;
      let grandTotalCommission = 0;

      const leaderboard: BkRevenueLeaderboardEntry[] = rows.map((r) => {
        const completedOrdersCount = Number(r.completedOrdersCount || 0);
        const totalRevenue = Number(r.totalRevenue || 0);
        const commissionRate = getRevCommissionRate(totalRevenue, config.revBonusTiers);
        const commissionBonus = (totalRevenue * commissionRate) / 100;

        grandTotalOrders += completedOrdersCount;
        grandTotalRevenue += totalRevenue;
        grandTotalCommission += commissionBonus;

        return {
          rank: rank++,
          bookerId: Number(r.bookerId),
          displayName: String(r.displayName || `BK #${r.bookerId}`),
          avatar: r.avatar ? String(r.avatar) : null,
          store: String(r.store || 'PXL'),
          completedOrdersCount,
          totalRevenue,
          commissionRate,
          totalCommissionBonus: commissionBonus,
        };
      });

      return {
        leaderboard,
        summary: {
          completedOrdersCount: grandTotalOrders,
          totalRevenue: grandTotalRevenue,
          totalCommissionBonus: grandTotalCommission,
        },
      };
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK revenue leaderboard');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải Leaderboard Doanh Thu.' });
    }
  });

  // 4.2 Revenue Details
  fastify.get('/kpi/bk/revenue/details', { preHandler: [requireAuth] }, async (request, reply) => {
    const { bookerId, dateFrom, dateTo, storeId } = request.query as {
      bookerId?: string;
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    const startStr = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    const endStr = dateTo || new Date().toLocaleDateString('en-CA');
    const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
    const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

    try {
      const config = await getBkSalaryConfig(fastify);

      let bookerFilter = '';
      if (bookerId && bookerId !== 'ALL') {
        bookerFilter = `AND o.created_staff_id = ${Number(bookerId)}`;
      } else {
        const activeBkIds = config.activeBkIds;
        bookerFilter = `AND o.created_staff_id IN (${activeBkIds.join(',')})`;
      }

      let storeFilter = '';
      if (storeId && storeId !== 'ALL') {
        storeFilter = `AND UPPER(cs.client_store_key) = '${storeId.toUpperCase()}'`;
      }

      const sql = `
        SELECT 
          o.id as orderId,
          o.order_key as orderKey,
          COALESCE(ro.actual_booking_date_start, o.booking_date_start) as orderDate,
          COALESCE(up_c.full_name, 'Khách hàng') as clientName,
          UPPER(COALESCE(cs.client_store_key, 'PXL')) as store,
          COALESCE(o.total_price, 0) as totalOrderPrice
        FROM \`order\` o
        LEFT JOIN \`user_profile\` up_c ON up_c.user_id = o.user_id
        LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
        LEFT JOIN report_order ro ON o.id = ro.order_id
        WHERE COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${startPart} 00:00:00' 
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${endPart} 23:59:59'
          AND o.order_state = 'Completed'
          ${bookerFilter}
          ${storeFilter}
        ORDER BY COALESCE(ro.actual_booking_date_start, o.booking_date_start) DESC
        LIMIT 500
      `;

      const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql);

      let totalRevenueSum = 0;
      let totalCommissionSum = 0;

      const data: BkRevenueRecord[] = rows.map((r) => {
        const totalOrderPrice = Number(r.totalOrderPrice || 0);
        const commissionRate = getRevCommissionRate(totalOrderPrice, config.revBonusTiers);
        const commissionBonus = (totalOrderPrice * commissionRate) / 100;

        totalRevenueSum += totalOrderPrice;
        totalCommissionSum += commissionBonus;

        return {
          orderId: Number(r.orderId),
          orderKey: String(r.orderKey || `#${r.orderId}`),
          orderDate: r.orderDate ? new Date(r.orderDate).toISOString() : '',
          clientName: String(r.clientName),
          store: String(r.store),
          totalOrderPrice,
          commissionRate,
          commissionBonus,
        };
      });

      return {
        data,
        total: data.length,
        summary: {
          completedOrdersCount: data.length,
          totalRevenue: totalRevenueSum,
          totalCommissionBonus: totalCommissionSum,
        },
      };
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK revenue details');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải chi tiết Doanh Thu.' });
    }
  });

  // 5. Paystub Live
  fastify.get('/kpi/bk/paystub', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dateFrom, dateTo, storeId } = request.query as {
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    const startStr = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    const endStr = dateTo || new Date().toLocaleDateString('en-CA');
    const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
    const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

    try {
      const config = await getBkSalaryConfig(fastify);
      const activeBkIds = config.activeBkIds;

      if (activeBkIds.length === 0) {
        return reply.send({
          data: [],
          total: 0,
          summary: {
            totalBaseSalary: 0,
            totalDoneBonus: 0,
            totalTipBonus: 0,
            totalRevenueBonus: 0,
            grandTotalIncome: 0,
          },
        });
      }

      const bkIdsStr = activeBkIds.join(',');

      let storeFilter = '';
      if (storeId && storeId !== 'ALL') {
        storeFilter = `AND UPPER(cs.client_store_key) = '${storeId.toUpperCase()}'`;
      }

      // Compute Check-in bonuses per Booker (matching salary-calculator.ts and /dashboard/kpi)
      const { clientBonusMap } = await computeBkOrderCheckins(fastify, startPart, endPart, activeBkIds, storeFilter);

      const sql = `
        SELECT 
          up.user_id as staffId,
          up.full_name as staffName,
          up.avatar as avatar,
          UPPER(COALESCE(cs.client_store_key, 'PXL')) as store,
          COUNT(DISTINCT CASE WHEN o.order_state = 'Completed' THEN o.id END) as doneCount,
          COUNT(DISTINCT CASE WHEN o.order_state IN ('Cancelled', 'Missed') THEN o.id END) as missedCount,
          COUNT(DISTINCT o.id) as totalCount,
          COALESCE(SUM(CASE WHEN o.order_state = 'Completed' THEN o.total_price ELSE 0 END), 0) as totalRevenue,
          COALESCE(SUM(st.customer_tip_100), 0) as totalCustomerTip
        FROM \`user_profile\` up
        LEFT JOIN \`client_store\` cs ON cs.id = up.client_store_id
        LEFT JOIN \`order\` o ON o.created_staff_id = up.user_id 
          AND o.booking_date_start >= '${startPart} 00:00:00' 
          AND o.booking_date_start <= '${endPart} 23:59:59'
          ${storeFilter}
        LEFT JOIN (
          SELECT 
            order_id, 
            MAX(CASE WHEN tip_percentage > 0 THEN tip_amount / (tip_percentage / 100) ELSE tip_amount END) as customer_tip_100
          FROM staff_tip
          GROUP BY order_id
        ) st ON st.order_id = o.id
        WHERE up.user_id IN (${bkIdsStr})
        GROUP BY up.user_id, up.full_name, up.avatar, cs.client_store_key
        ORDER BY up.full_name ASC
      `;

      const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql);

      let grandTotalBaseSalary = 0;
      let grandTotalDoneBonus = 0;
      let grandTotalTipBonus = 0;
      let grandTotalRevenueBonus = 0;
      let grandTotalIncome = 0;

      const data: BkPaystubRecord[] = rows.map((r) => {
        const staffId = Number(r.staffId);
        const doneCount = Number(r.doneCount || 0);
        const missedCount = Number(r.missedCount || 0);
        const totalCount = Number(r.totalCount || 0);
        const missedRatePercent = totalCount > 0 ? Number(((missedCount / totalCount) * 100).toFixed(1)) : 0;
        const totalRevenue = Number(r.totalRevenue || 0);
        const totalCustomerTip = Number(r.totalCustomerTip || 0);

        const actualWorkDays = 26; // Default full month
        const monthlyBaseSalary = config.baseSalary;
        const standardWorkDays = 26;
        const calculatedBaseSalary = Math.round((monthlyBaseSalary / standardWorkDays) * actualWorkDays);

        const basicCheckinBonus = clientBonusMap.get(staffId) || 0;
        const milestoneBonus = getMilestoneBonus(doneCount, config.doneBonusTiers);
        const penaltyBonus = getMissedRateBonus(missedRatePercent, config.missedBonusTiers);

        const doneBonus = basicCheckinBonus + milestoneBonus + penaltyBonus;
        const tipBonus = Math.round((totalCustomerTip * (config.tipsPercent || 7)) / 100);
        const revRate = getRevCommissionRate(totalRevenue, config.revBonusTiers);
        const revenueBonus = Math.round((totalRevenue * revRate) / 100);

        const totalIncome = calculatedBaseSalary + doneBonus + tipBonus + revenueBonus;

        grandTotalBaseSalary += calculatedBaseSalary;
        grandTotalDoneBonus += doneBonus;
        grandTotalTipBonus += tipBonus;
        grandTotalRevenueBonus += revenueBonus;
        grandTotalIncome += totalIncome;

        return {
          staffId,
          staffName: String(r.staffName || `BK #${staffId}`),
          avatar: r.avatar ? String(r.avatar) : null,
          store: String(r.store || 'PXL'),
          monthlyBaseSalary,
          standardWorkDays,
          actualWorkDays,
          calculatedBaseSalary,
          doneBonus,
          tipBonus,
          revenueBonus,
          totalIncome,
        };
      });

      return {
        data,
        total: data.length,
        summary: {
          totalBaseSalary: grandTotalBaseSalary,
          totalDoneBonus: grandTotalDoneBonus,
          totalTipBonus: grandTotalTipBonus,
          totalRevenueBonus: grandTotalRevenueBonus,
          grandTotalIncome,
        },
      };
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK paystub data');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải Bảng Lương BK.' });
    }
  });

  // 6. Config GET & POST
  fastify.get('/kpi/bk/config', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const config = await getBkSalaryConfig(fastify);

      const allStaffProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT 
          up.user_id as staffId,
          up.full_name as displayName,
          up.username as username,
          UPPER(COALESCE(cs.client_store_key, 'PXL')) as store
        FROM \`user_profile\` up
        LEFT JOIN \`client_store\` cs ON cs.id = up.client_store_id
        WHERE up.is_disabled = 0 
          AND up.client_business_id = 1
          AND (
            up.user_group_id IN (2, 31, 32, 45)
            OR FIND_IN_SET('2', up.access_user_group_ids)
            OR FIND_IN_SET('31', up.access_user_group_ids)
            OR FIND_IN_SET('32', up.access_user_group_ids)
            OR FIND_IN_SET('45', up.access_user_group_ids)
          )
        ORDER BY up.full_name ASC
      `);

      const activeSet = new Set(config.activeBkIds);

      const allStaffOptions = allStaffProfiles.map((s) => ({
        staffId: Number(s.staffId),
        displayName: String(s.displayName || `Staff #${s.staffId}`),
        username: s.username ? String(s.username) : undefined,
        isBk: activeSet.has(Number(s.staffId)),
        store: String(s.store || 'PXL'),
      }));

      return {
        activeBkIds: config.activeBkIds,
        config,
        allStaffOptions,
      };
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK config');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải cấu hình BK.' });
    }
  });

  fastify.post('/kpi/bk/config', { preHandler: [requireAuth] }, async (request, reply) => {
    const { activeBkIds, config } = request.body as {
      activeBkIds?: number[];
      config?: Partial<BkSalaryConfig>;
    };

    try {
      if (activeBkIds && Array.isArray(activeBkIds)) {
        await fastify.prisma.crm.crmConfig.upsert({
          where: { key: 'ACTIVE_BK_STAFF_CONFIG' },
          update: { value: JSON.stringify(activeBkIds) },
          create: { key: 'ACTIVE_BK_STAFF_CONFIG', value: JSON.stringify(activeBkIds) },
        });
      }

      if (config) {
        const currentConfig = await getBkSalaryConfig(fastify);
        const updatedConfig = { ...currentConfig, ...config };
        await fastify.prisma.crm.crmConfig.upsert({
          where: { key: 'BK_SALARY_CONFIG' },
          update: { value: JSON.stringify(updatedConfig) },
          create: { key: 'BK_SALARY_CONFIG', value: JSON.stringify(updatedConfig) },
        });
      }

      return reply.send({ success: true, message: 'Cập nhật cấu hình BK thành công.' });
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error saving BK config');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi lưu cấu hình BK.' });
    }
  });
}
