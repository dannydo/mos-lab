import { FastifyInstance } from 'fastify';
import { BkSalaryConfig, BkPaystubRecord, SafeAny } from '@mos-lab/shared';
import { TeamService } from '../../teams/team.service.js';

export const DEFAULT_BK_CONFIG: BkSalaryConfig = {
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

export async function getActiveBkIds(fastify: FastifyInstance): Promise<number[]> {
  const ids = await TeamService.getActiveStaffIdsWithFallback(fastify, 'BK', 'ACTIVE_BK_STAFF_CONFIG');
  return ids.length > 0 ? ids : DEFAULT_BK_CONFIG.activeBkIds;
}

/**
 * BK Done is an operational Telesales leaderboard. Keep this scope tied to the
 * explicit BK_TELESALES team rather than the wider BK/CS/Control configuration.
 */
export async function getActiveBkTelesalesIds(fastify: FastifyInstance): Promise<number[]> {
  return TeamService.getActiveStaffIdsWithFallback(fastify, 'BK_TELESALES', 'ACTIVE_BK_TELESALES_STAFF_CONFIG');
}

export async function getBkSalaryConfig(fastify: FastifyInstance): Promise<BkSalaryConfig> {
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

export function getMilestoneBonus(doneCount: number, tiers?: Array<{ minCount: number; bonus: number }>): number {
  const sorted = [...(tiers || DEFAULT_BK_CONFIG.doneBonusTiers)].sort((a, b) => b.minCount - a.minCount);
  const found = sorted.find((t) => doneCount >= t.minCount);
  return found ? found.bonus : 0;
}

export function getMilestoneBonusInfo(
  doneCount: number,
  tiers?: Array<{ minCount: number; bonus: number }>
): { bonus: number; doneLevelCount: number } {
  const sorted = [...(tiers || DEFAULT_BK_CONFIG.doneBonusTiers)].sort((a, b) => b.minCount - a.minCount);
  const found = sorted.find((t) => doneCount >= t.minCount);
  return found ? { bonus: found.bonus, doneLevelCount: found.minCount } : { bonus: 0, doneLevelCount: 0 };
}

export function getMissedRateBonus(
  missedRatePercent: number,
  tiers?: Array<{ maxRate: number; bonus: number }>
): number {
  const sorted = [...(tiers || DEFAULT_BK_CONFIG.missedBonusTiers)].sort((a, b) => a.maxRate - b.maxRate);
  const found = sorted.find((t) => missedRatePercent <= t.maxRate);
  return found ? found.bonus : 0;
}

export function getMissedRateBonusInfo(
  missedRatePercent: number,
  tiers?: Array<{ maxRate: number; bonus: number }>
): { bonus: number; missedLevelRate: number } {
  const sorted = [...(tiers || DEFAULT_BK_CONFIG.missedBonusTiers)].sort((a, b) => a.maxRate - b.maxRate);
  const found = sorted.find((t) => missedRatePercent <= t.maxRate);
  return found ? { bonus: found.bonus, missedLevelRate: found.maxRate } : { bonus: 0, missedLevelRate: 0 };
}

export function getRevCommissionRate(totalRevenue: number, tiers?: Array<{ minRev: number; rate: number }>): number {
  const sorted = [...(tiers || DEFAULT_BK_CONFIG.revBonusTiers)].sort((a, b) => b.minRev - a.minRev);
  const found = sorted.find((t) => totalRevenue >= t.minRev);
  return found ? found.rate : 0;
}

export function getRevCommissionRateInfo(
  totalRevenue: number,
  tiers?: Array<{ minRev: number; rate: number }>
): { rate: number; revLevelMin: number } {
  const sorted = [...(tiers || DEFAULT_BK_CONFIG.revBonusTiers)].sort((a, b) => b.minRev - a.minRev);
  const found = sorted.find((t) => totalRevenue >= t.minRev);
  return found ? { rate: found.rate, revLevelMin: found.minRev } : { rate: 0, revLevelMin: 0 };
}

export function calculateCheckinBonus(
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

export async function computeBkOrderCheckins(
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
    WHERE ((ro.actual_booking_date_start >= '${startPart} 00:00:00' AND ro.actual_booking_date_start <= '${endPart} 23:59:59')
        OR (ro.actual_booking_date_start IS NULL AND o.booking_date_start >= '${startPart} 00:00:00' AND o.booking_date_start <= '${endPart} 23:59:59'))
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

  const orderServicesMap = new Map<number, SafeAny[]>();
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
    serviceLanguages.forEach((sl) => {
      serviceNameMap.set(sl.service_id, sl.service_name);
    });
  }

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
           COALESCE(ro.actual_booking_date_start, o.booking_date_start) as o_booking_date_start
    FROM user_service_balance_transaction usbt
    LEFT JOIN \`order\` o ON o.id = usbt.order_id
    LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
    WHERE usbt.user_service_balance_id IN (${balanceIds.join(',')})
      AND usbt.date_created <= '${endPart} 23:59:59'
  `)
      : [];

  const txnsByBalanceId = new Map<number, SafeAny[]>();
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

      let countLeft: number;
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

    let bonus: number;
    let checkinCategory: string;
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

export interface BkPaystubDetail {
  staffId: number;
  staffName: string;
  avatar: string | null;
  store: string;
  monthlyBaseSalary: number;
  standardWorkDays: number;
  actualWorkDays: number;
  calculatedBaseSalary: number;
  basicCheckinBonus: number;
  milestoneBonus: number;
  penaltyBonus: number;
  doneBonus: number;
  doneCount: number;
  missedCount: number;
  totalCount: number;
  missedRatePercent: number;
  doneLevelCount: number;
  missedLevelRate: number;
  totalCustomerTip: number;
  tipBonus: number;
  totalRevenue: number;
  revCommissionRate: number;
  revenueBonus: number;
  revLevelMin: number;
  totalIncome: number;
}

export interface BkPaystubResult {
  data: BkPaystubRecord[];
  total: number;
  summary: {
    totalBaseSalary: number;
    totalDoneBonus: number;
    totalTipBonus: number;
    totalRevenueBonus: number;
    grandTotalIncome: number;
    totalBasicCheckinBonus: number;
    totalMilestoneBonus: number;
    totalPenaltyBonus: number;
    totalCustomerTip: number;
    totalRevenue: number;
  };
  detailsMap: Map<number, BkPaystubDetail>;
  orderCheckinMap: Map<
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
  >;
}

export async function getBkPaystubData(
  fastify: FastifyInstance,
  startPart: string,
  endPart: string,
  targetBkIds?: number[],
  storeFilter: string = ''
): Promise<BkPaystubResult> {
  const config = await getBkSalaryConfig(fastify);
  const activeBkIds = targetBkIds && targetBkIds.length > 0 ? targetBkIds : config.activeBkIds;

  if (activeBkIds.length === 0) {
    return {
      data: [],
      total: 0,
      summary: {
        totalBaseSalary: 0,
        totalDoneBonus: 0,
        totalTipBonus: 0,
        totalRevenueBonus: 0,
        grandTotalIncome: 0,
        totalBasicCheckinBonus: 0,
        totalMilestoneBonus: 0,
        totalPenaltyBonus: 0,
        totalCustomerTip: 0,
        totalRevenue: 0,
      },
      detailsMap: new Map(),
      orderCheckinMap: new Map(),
    };
  }

  const bkIdsStr = activeBkIds.join(',');

  const { clientBonusMap, orderCheckinMap } = await computeBkOrderCheckins(
    fastify,
    startPart,
    endPart,
    activeBkIds,
    storeFilter
  );

  const sql = `
    SELECT 
      up.user_id as staffId,
      up.full_name as staffName,
      up.avatar as avatar,
      UPPER(COALESCE(cs.client_store_key, 'PXL')) as store,
      COUNT(DISTINCT CASE WHEN (o.order_state IN ('Completed', 'CheckOut') OR o.actual_booking_date_start IS NOT NULL OR o.total_price > 0) THEN o.id END) as doneCount,
      COUNT(DISTINCT CASE WHEN (o.booking_date_start <= NOW() OR COALESCE(o.actual_booking_date_start, o.booking_date_start) <= NOW()) AND o.actual_booking_date_start IS NULL AND (o.total_price IS NULL OR o.total_price = 0) AND o.order_state NOT IN ('Completed', 'CheckOut') THEN o.id END) as missedCount,
      COUNT(DISTINCT o.id) as totalCount,
      COALESCE(SUM(CASE WHEN o.order_state = 'Completed' THEN o.total_price ELSE 0 END), 0) as totalRevenue,
      COALESCE(SUM(st.customer_tip_100), 0) as totalCustomerTip
    FROM \`user_profile\` up
    LEFT JOIN \`client_store\` cs ON cs.id = up.client_store_id
    LEFT JOIN (
      SELECT o.id, o.created_staff_id, o.order_state, o.total_price, o.booking_date_start, ro.actual_booking_date_start
      FROM \`order\` o
      JOIN report_order ro ON ro.order_id = o.id
      WHERE ro.actual_booking_date_start >= '${startPart} 00:00:00' AND ro.actual_booking_date_start <= '${endPart} 23:59:59'
      UNION ALL
      SELECT o.id, o.created_staff_id, o.order_state, o.total_price, o.booking_date_start, NULL as actual_booking_date_start
      FROM \`order\` o
      LEFT JOIN report_order ro ON ro.order_id = o.id
      WHERE ro.actual_booking_date_start IS NULL
        AND o.booking_date_start >= '${startPart} 00:00:00' AND o.booking_date_start <= '${endPart} 23:59:59'
    ) o ON o.created_staff_id = up.user_id ${storeFilter}
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

  let grandTotalBasicCheckinBonus = 0;
  let grandTotalMilestoneBonus = 0;
  let grandTotalPenaltyBonus = 0;
  let grandTotalCustomerTip = 0;
  let grandTotalRevenue = 0;

  const detailsMap = new Map<number, BkPaystubDetail>();

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
    const { bonus: milestoneBonus, doneLevelCount } = getMilestoneBonusInfo(doneCount, config.doneBonusTiers);
    const { bonus: penaltyBonus, missedLevelRate } = getMissedRateBonusInfo(missedRatePercent, config.missedBonusTiers);

    const doneBonus = basicCheckinBonus + milestoneBonus + penaltyBonus;
    const tipBonus = Math.round((totalCustomerTip * (config.tipsPercent || 7)) / 100);
    const { rate: revCommissionRate, revLevelMin } = getRevCommissionRateInfo(totalRevenue, config.revBonusTiers);
    const revenueBonus = Math.round((totalRevenue * revCommissionRate) / 100);

    const totalIncome = calculatedBaseSalary + doneBonus + tipBonus + revenueBonus;

    grandTotalBaseSalary += calculatedBaseSalary;
    grandTotalDoneBonus += doneBonus;
    grandTotalTipBonus += tipBonus;
    grandTotalRevenueBonus += revenueBonus;
    grandTotalIncome += totalIncome;

    grandTotalBasicCheckinBonus += basicCheckinBonus;
    grandTotalMilestoneBonus += milestoneBonus;
    grandTotalPenaltyBonus += penaltyBonus;
    grandTotalCustomerTip += totalCustomerTip;
    grandTotalRevenue += totalRevenue;

    const detail: BkPaystubDetail = {
      staffId,
      staffName: String(r.staffName || `BK #${staffId}`),
      avatar: r.avatar ? String(r.avatar) : null,
      store: String(r.store || 'PXL'),
      monthlyBaseSalary,
      standardWorkDays,
      actualWorkDays,
      calculatedBaseSalary,
      basicCheckinBonus,
      milestoneBonus,
      penaltyBonus,
      doneBonus,
      doneCount,
      missedCount,
      totalCount,
      missedRatePercent,
      doneLevelCount,
      missedLevelRate,
      totalCustomerTip,
      tipBonus,
      totalRevenue,
      revCommissionRate,
      revenueBonus,
      revLevelMin,
      totalIncome,
    };

    detailsMap.set(staffId, detail);

    return {
      staffId,
      staffName: detail.staffName,
      avatar: detail.avatar,
      store: detail.store,
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
      totalBasicCheckinBonus: grandTotalBasicCheckinBonus,
      totalMilestoneBonus: grandTotalMilestoneBonus,
      totalPenaltyBonus: grandTotalPenaltyBonus,
      totalCustomerTip: grandTotalCustomerTip,
      totalRevenue: grandTotalRevenue,
    },
    detailsMap,
    orderCheckinMap,
  };
}
