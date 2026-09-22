import { FastifyInstance } from 'fastify';
import { BkSalaryConfig, BkPaystubRecord, BkWorkLogRecord, BkWorkLogResponse, SafeAny } from '@mos-lab/shared';
import { TeamService } from '../../teams/team.service.js';
import { HolidayWorkService } from '../../holiday-work/holiday-work.service.js';

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

/** Fixed operational rule: a completed Combo Live service earns the Booker 1,000 VND. */
export const BK_COMBO_LIVE_DONE_BONUS = 1000;

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

/**
 * Keeps Booking detail requests within the active BK_TELESALES roster, including
 * when a caller supplies an explicit Booker ID.
 */
export function resolveBkTelesalesStaffScope(activeTelesalesIds: number[], requestedBookerId?: string): number[] {
  if (!requestedBookerId || requestedBookerId === 'ALL') {
    return activeTelesalesIds;
  }

  const bookerId = Number(requestedBookerId);
  return Number.isInteger(bookerId) && activeTelesalesIds.includes(bookerId) ? [bookerId] : [];
}

export interface BkCallMetrics {
  callCount: number;
  pickupCount: number;
  /** Pickup rate = successful pickups / outbound calls. */
  pickupRate: number;
}

const EMPTY_BK_CALL_METRICS: BkCallMetrics = { callCount: 0, pickupCount: 0, pickupRate: 0 };

/**
 * Single definition for Booker pickup rate. Keep this on the backend so every
 * leaderboard/export consumer presents the same result.
 */
const calculateBkPickupRate = (pickupCount: number, callCount: number): number => {
  if (callCount <= 0) return 0;
  return Math.min(100, Number(((Math.max(0, pickupCount) / callCount) * 100).toFixed(1)));
};

const normalizeStaffName = (name: string) =>
  String(name || '')
    .trim()
    .toLocaleLowerCase('vi-VN');

/**
 * Reconciles each Booker's outbound-call activity from the CRM call ledger and
 * the OmiCall webhook ledger. One call can exist in both ledgers, so we use the
 * larger count per CRM staff record instead of adding both sources together.
 */
export async function getBkCallMetricsByLegacyStaffIds(
  fastify: FastifyInstance,
  startPart: string,
  endPart: string,
  legacyStaffIds: number[]
): Promise<Map<number, BkCallMetrics>> {
  const validLegacyStaffIds = [...new Set(legacyStaffIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  const metricsByLegacyStaffId = new Map<number, BkCallMetrics>();

  validLegacyStaffIds.forEach((legacyStaffId) => {
    metricsByLegacyStaffId.set(legacyStaffId, { ...EMPTY_BK_CALL_METRICS });
  });

  if (validLegacyStaffIds.length === 0) return metricsByLegacyStaffId;
  const validLegacyStaffIdSet = new Set(validLegacyStaffIds);

  const profiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
    SELECT user_id AS legacyStaffId, full_name AS displayName
    FROM user_profile
    WHERE user_id IN (${validLegacyStaffIds.join(',')})
  `);
  const legacyStaffIdByName = new Map<string, number>();
  profiles.forEach((profile) => {
    const legacyStaffId = Number(profile.legacyStaffId);
    if (validLegacyStaffIdSet.has(legacyStaffId)) {
      legacyStaffIdByName.set(normalizeStaffName(String(profile.displayName)), legacyStaffId);
    }
  });

  const profileNames = profiles.map((profile) => String(profile.displayName || '')).filter(Boolean);
  const crmStaff = await fastify.prisma.crm.crmStaff.findMany({
    where: {
      isActive: true,
      OR: [
        { legacyStaffId: { in: validLegacyStaffIds } },
        ...(profileNames.length > 0 ? [{ displayName: { in: profileNames } }] : []),
      ],
    },
    select: { id: true, legacyStaffId: true, displayName: true },
  });

  const legacyStaffIdByCrmStaffId = new Map<number, number>();
  crmStaff.forEach((staff) => {
    const legacyStaffId =
      staff.legacyStaffId && validLegacyStaffIdSet.has(Number(staff.legacyStaffId))
        ? Number(staff.legacyStaffId)
        : legacyStaffIdByName.get(normalizeStaffName(staff.displayName));
    if (legacyStaffId) {
      legacyStaffIdByCrmStaffId.set(staff.id, legacyStaffId);
    }
  });

  const crmStaffIds = Array.from(legacyStaffIdByCrmStaffId.keys());
  if (crmStaffIds.length === 0) return metricsByLegacyStaffId;

  const startIso =
    startPart.includes('+') || startPart.endsWith('Z')
      ? startPart
      : startPart.includes('T')
        ? `${startPart}+07:00`
        : `${startPart}T00:00:00+07:00`;
  const endIso =
    endPart.includes('+') || endPart.endsWith('Z')
      ? endPart
      : endPart.includes('T')
        ? `${endPart}+07:00`
        : `${endPart}T23:59:59.999+07:00`;
  const start = new Date(startIso);
  const end = new Date(endIso);
  const [crmLogs, omicallLogs] = await Promise.all([
    fastify.prisma.crm.crmCallLog.findMany({
      where: { staffId: { in: crmStaffIds }, createdAt: { gte: start, lte: end } },
      select: { staffId: true, callResult: true },
    }),
    fastify.prisma.crm.crmOmicallLog.findMany({
      where: { staffId: { in: crmStaffIds }, createdAt: { gte: start, lte: end }, direction: 'outbound' },
      select: { staffId: true, status: true },
    }),
  ]);

  const crmMetrics = new Map<number, BkCallMetrics>();
  crmLogs.forEach((log) => {
    const staffId = Number(log.staffId);
    const metric = crmMetrics.get(staffId) || { ...EMPTY_BK_CALL_METRICS };
    metric.callCount += 1;
    if (['ANSWERED', 'ANSWER', 'CONNECTED'].includes(String(log.callResult || '').toUpperCase())) {
      metric.pickupCount += 1;
    }
    crmMetrics.set(staffId, metric);
  });

  const omicallMetrics = new Map<number, BkCallMetrics>();
  omicallLogs.forEach((log) => {
    if (!log.staffId) return;
    const staffId = Number(log.staffId);
    const metric = omicallMetrics.get(staffId) || { ...EMPTY_BK_CALL_METRICS };
    metric.callCount += 1;
    if (String(log.status || '').toUpperCase() === 'ANSWER') {
      metric.pickupCount += 1;
    }
    omicallMetrics.set(staffId, metric);
  });

  crmStaffIds.forEach((crmStaffId) => {
    const legacyStaffId = legacyStaffIdByCrmStaffId.get(crmStaffId);
    if (!legacyStaffId) return;

    const crmMetric = crmMetrics.get(crmStaffId) || EMPTY_BK_CALL_METRICS;
    const omicallMetric = omicallMetrics.get(crmStaffId) || EMPTY_BK_CALL_METRICS;
    const current = metricsByLegacyStaffId.get(legacyStaffId) || { ...EMPTY_BK_CALL_METRICS };

    current.callCount += Math.max(crmMetric.callCount, omicallMetric.callCount);
    current.pickupCount += Math.max(crmMetric.pickupCount, omicallMetric.pickupCount);
    current.pickupRate = calculateBkPickupRate(current.pickupCount, current.callCount);
    metricsByLegacyStaffId.set(legacyStaffId, current);
  });

  return metricsByLegacyStaffId;
}

export async function getBkSalaryConfig(fastify: FastifyInstance): Promise<BkSalaryConfig> {
  const workDaysOverrides = await getBkWorkDaysOverrides(fastify);
  try {
    const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: 'BK_SALARY_CONFIG' },
      select: { value: true },
    });
    if (configRecord && configRecord.value) {
      const parsed = JSON.parse(configRecord.value);
      return {
        ...DEFAULT_BK_CONFIG,
        ...parsed,
        workDaysOverrides,
        activeBkIds: await getActiveBkIds(fastify),
      };
    }
  } catch (err) {
    fastify.log.error(err as SafeAny, 'Error fetching BK_SALARY_CONFIG from DB');
  }
  return {
    ...DEFAULT_BK_CONFIG,
    workDaysOverrides,
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

/**
 * Reconstructs the customer's full tip from the staff-tip ledger. A single
 * customer tip can be split across staff (for example 20% and 10% rows), so
 * the maximum normalized share represents the paid customer-tip amount once.
 */
export async function getCustomerTipAmountByOrderIds(
  fastify: FastifyInstance,
  orderIds: number[]
): Promise<Map<number, number>> {
  const validOrderIds = [...new Set(orderIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  const tipsByOrder = new Map<number, number>();

  if (validOrderIds.length === 0) return tipsByOrder;

  const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
    SELECT
      st.order_id AS orderId,
      MAX(CASE WHEN st.tip_percentage > 0 THEN st.tip_amount / (st.tip_percentage / 100) ELSE st.tip_amount END) AS customerTip
    FROM staff_tip st
    JOIN \`order\` o ON o.id = st.order_id
    WHERE st.order_id IN (${validOrderIds.join(',')})
      AND st.tip_amount > 0
      AND o.order_state = 'Completed'
    GROUP BY st.order_id
  `);

  rows.forEach((row) => tipsByOrder.set(Number(row.orderId), Math.round(Number(row.customerTip || 0))));
  return tipsByOrder;
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
  const [orderServices, userBalances] = await Promise.all([
    fastify.prisma.legacy.order_service.findMany({
      where: { order_id: { in: orderIds } },
      select: {
        order_id: true,
        service_id: true,
        service_price: true,
        service_type: true,
        discount_amount: true,
      },
    }),
    userIds.length > 0
      ? fastify.prisma.legacy.user_service_balance.findMany({
          where: { user_id: { in: userIds } },
          select: {
            id: true,
            user_id: true,
            date_created: true,
            date_expired: true,
            normal_count: true,
            retain_count: true,
          },
        })
      : Promise.resolve([]),
  ]);
  orderServices.forEach((os) => {
    const list = orderServicesMap.get(os.order_id) || [];
    list.push(os);
    orderServicesMap.set(os.order_id, list);
  });

  const serviceIds = Array.from(new Set(orderServices.map((os) => os.service_id)));
  const balanceIds = userBalances.map((b) => b.id);
  const [serviceLanguages, userBalanceTransactions] = await Promise.all([
    serviceIds.length > 0
      ? fastify.prisma.legacy.service_language.findMany({
          where: { service_id: { in: serviceIds } },
          select: { service_id: true, service_name: true },
        })
      : Promise.resolve([]),
    balanceIds.length > 0
      ? fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
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
      : Promise.resolve([]),
  ]);
  const serviceNameMap = new Map<number, string>();
  serviceLanguages.forEach((sl) => {
    serviceNameMap.set(sl.service_id, sl.service_name);
  });

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
  txnsByBalanceId.forEach((transactions) => {
    transactions.sort((a, b) => {
      const timeA = new Date(a.o_booking_date_start || a.date_created).getTime();
      const timeB = new Date(b.o_booking_date_start || b.date_created).getTime();
      if (timeA !== timeB) return timeB - timeA;
      return Number(b.id) - Number(a.id);
    });
  });

  const balancesByUserId = new Map<number, typeof userBalances>();
  userBalances.forEach((balance) => {
    const balances = balancesByUserId.get(balance.user_id) || [];
    balances.push(balance);
    balancesByUserId.set(balance.user_id, balances);
  });

  const checkHasLiveCombo = (userId: number, bookingDateStart: Date | null, orderCreatedDate: Date) => {
    const bTime = bookingDateStart || orderCreatedDate;
    const bookingTime = new Date(bTime).getTime();
    const bookingDay = new Date(new Date(bTime).toLocaleDateString('en-CA'));
    const userBals = balancesByUserId.get(userId) || [];

    for (const usb of userBals) {
      if (new Date(usb.date_created).getTime() >= bookingTime) continue;

      let lastTxnBefore: SafeAny | undefined;
      let usedAfter = 0;
      for (const transaction of txnsByBalanceId.get(usb.id) || []) {
        const transactionTime = new Date(transaction.o_booking_date_start || transaction.date_created).getTime();
        if (transactionTime < bookingTime) {
          lastTxnBefore = transaction;
          break;
        }
        if (transaction.used_staff_id !== null) {
          usedAfter += (transaction.normal_count || 0) + (transaction.retain_count || 0);
        }
      }
      const dateExpired = lastTxnBefore ? lastTxnBefore.date_expired : usb.date_expired;
      const isNotExpired = !dateExpired || new Date(dateExpired) >= bookingDay;

      let countLeft: number;
      if (
        lastTxnBefore &&
        lastTxnBefore.total_normal_count_left !== null &&
        lastTxnBefore.total_retain_count_left !== null
      ) {
        countLeft = (lastTxnBefore.total_normal_count_left || 0) + (lastTxnBefore.total_retain_count_left || 0);
      } else {
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
      bonus = BK_COMBO_LIVE_DONE_BONUS;
      checkinCategory = 'Combo Live (1.000đ)';
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

export function calculateStandardWorkDays(startDateStr: string, endDateStr: string): number {
  const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);

  const cur = new Date(Date.UTC(startYear, startMonth - 1, startDay));
  const end = new Date(Date.UTC(endYear, endMonth - 1, endDay));

  let standardDays = 0;
  while (cur <= end) {
    const dayOfWeek = cur.getUTCDay(); // 0 is Sunday
    if (dayOfWeek !== 0) {
      standardDays++;
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return standardDays;
}

export async function fetchBkAttendanceMap(
  fastify: FastifyInstance,
  startPart: string,
  endPart: string,
  bkStaffIds: number[]
): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  if (bkStaffIds.length === 0) return map;

  const bkIdsStr = bkStaffIds.join(',');
  const sql = `
    SELECT 
      user_id as staffId,
      COUNT(DISTINCT CASE WHEN (check_in_date IS NOT NULL OR working_minute > 0) THEN \`date\` END) as checkinDays
    FROM \`report_staff\`
    WHERE user_id IN (${bkIdsStr})
      AND \`date\` >= '${startPart}' AND \`date\` <= '${endPart}'
    GROUP BY user_id
  `;

  try {
    const rows =
      await fastify.prisma.legacy.$queryRawUnsafe<Array<{ staffId: number | bigint; checkinDays: number | bigint }>>(
        sql
      );
    for (const r of rows) {
      map.set(Number(r.staffId), Number(r.checkinDays || 0));
    }
  } catch (err) {
    fastify.log.error(err as SafeAny, 'Error fetching BK attendance from report_staff');
  }

  return map;
}

export async function getBkWorkDaysOverrides(fastify: FastifyInstance): Promise<Record<string, number>> {
  try {
    const cfg = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: 'BK_WORK_DAYS_OVERRIDE' },
    });
    if (cfg?.value) {
      return JSON.parse(cfg.value) as Record<string, number>;
    }
  } catch (err) {
    fastify.log.error(err as SafeAny, 'Error reading BK_WORK_DAYS_OVERRIDE config');
  }
  return {};
}

export interface BkPaystubDetail {
  staffId: number;
  staffName: string;
  avatar: string | null;
  store: string;
  monthlyBaseSalary: number;
  standardWorkDays: number;
  actualWorkDays: number;
  actualCheckInDays?: number;
  workDaysAdjustment?: number;
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
    totalHolidayBasePay: number;
    totalHolidayPremiumPay: number;
    totalHolidayPayrollAddition: number;
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
        totalHolidayBasePay: 0,
        totalHolidayPremiumPay: 0,
        totalHolidayPayrollAddition: 0,
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

  const [{ clientBonusMap, orderCheckinMap }, holidayBreakdownMap, attendanceMap, workDaysOverrides] =
    await Promise.all([
      computeBkOrderCheckins(fastify, startPart, endPart, activeBkIds, storeFilter),
      HolidayWorkService.getPayBreakdownByLegacyStaffIds(fastify, activeBkIds, startPart, endPart),
      fetchBkAttendanceMap(fastify, startPart, endPart, activeBkIds),
      getBkWorkDaysOverrides(fastify),
    ]);

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
  let grandTotalHolidayBasePay = 0;
  let grandTotalHolidayPremiumPay = 0;
  let grandTotalHolidayPayrollAddition = 0;
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

    const actualCheckInDays = attendanceMap.get(staffId) || 0;
    const monthKey = startPart.slice(0, 7);
    const overrideKeyWithMonth = `${staffId}_${monthKey}`;
    const overrideVal = workDaysOverrides[overrideKeyWithMonth] ?? workDaysOverrides[String(staffId)];
    const actualWorkDays = typeof overrideVal === 'number' ? overrideVal : actualCheckInDays;
    const workDaysAdjustment = actualWorkDays - actualCheckInDays;

    const monthlyBaseSalary = config.baseSalary;
    const standardWorkDays = calculateStandardWorkDays(startPart, endPart);
    const calculatedBaseSalary =
      standardWorkDays > 0 ? Math.round((monthlyBaseSalary / standardWorkDays) * actualWorkDays) : 0;

    const basicCheckinBonus = clientBonusMap.get(staffId) || 0;
    const { bonus: milestoneBonus, doneLevelCount } = getMilestoneBonusInfo(doneCount, config.doneBonusTiers);
    const { bonus: penaltyBonus, missedLevelRate } = getMissedRateBonusInfo(missedRatePercent, config.missedBonusTiers);

    const doneBonus = basicCheckinBonus + milestoneBonus + penaltyBonus;
    const tipBonus = Math.round((totalCustomerTip * (config.tipsPercent || 7)) / 100);
    const { rate: revCommissionRate, revLevelMin } = getRevCommissionRateInfo(totalRevenue, config.revBonusTiers);
    const revenueBonus = Math.round((totalRevenue * revCommissionRate) / 100);
    const holiday = holidayBreakdownMap.get(staffId)!;

    const totalIncome = calculatedBaseSalary + doneBonus + tipBonus + revenueBonus + holiday.holidayPaystubAdjustment;

    grandTotalBaseSalary += calculatedBaseSalary;
    grandTotalDoneBonus += doneBonus;
    grandTotalTipBonus += tipBonus;
    grandTotalRevenueBonus += revenueBonus;
    grandTotalHolidayBasePay += holiday.holidayBasePay;
    grandTotalHolidayPremiumPay += holiday.holidayPremiumPay;
    grandTotalHolidayPayrollAddition += holiday.holidayPayrollAddition;
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
      actualCheckInDays,
      workDaysAdjustment,
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
      actualCheckInDays,
      workDaysAdjustment,
      calculatedBaseSalary,
      doneBonus,
      tipBonus,
      revenueBonus,
      ...holiday,
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
      totalHolidayBasePay: grandTotalHolidayBasePay,
      totalHolidayPremiumPay: grandTotalHolidayPremiumPay,
      totalHolidayPayrollAddition: grandTotalHolidayPayrollAddition,
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

export async function getBkWorkLogs(
  fastify: FastifyInstance,
  staffId: number,
  startPart: string,
  endPart: string
): Promise<BkWorkLogResponse | null> {
  const config = await getBkSalaryConfig(fastify);
  const workDaysOverrides = await getBkWorkDaysOverrides(fastify);

  // Fetch staff profile
  const profiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
    SELECT 
      up.user_id as staffId,
      up.full_name as staffName,
      up.avatar as avatar,
      UPPER(COALESCE(cs.client_store_key, 'PXL')) as store
    FROM \`user_profile\` up
    LEFT JOIN \`client_store\` cs ON cs.id = up.client_store_id
    WHERE up.user_id = ${staffId}
    LIMIT 1
  `);

  if (profiles.length === 0) return null;
  const profile = profiles[0];

  // Fetch daily attendance from report_staff
  const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
    SELECT 
      DATE_FORMAT(rs.date, '%Y-%m-%d') as workDate,
      DAYNAME(rs.date) as dayName,
      TIME_FORMAT(rs.working_shift_start_time, '%H:%i') as scheduledStart,
      TIME_FORMAT(rs.working_shift_end_time, '%H:%i') as scheduledEnd,
      TIME_FORMAT(rs.check_in_date, '%H:%i:%s') as firstIn,
      TIME_FORMAT(rs.check_out_date, '%H:%i:%s') as lastOut,
      rs.working_minute as workingMinute
    FROM \`report_staff\` rs
    WHERE rs.user_id = ${staffId}
      AND rs.date >= '${startPart}' AND rs.date <= '${endPart}'
    ORDER BY rs.date ASC
  `);

  const standardWorkDays = calculateStandardWorkDays(startPart, endPart);
  const monthlyBaseSalary = config.baseSalary;
  const dailySalaryRate = standardWorkDays > 0 ? Math.round(monthlyBaseSalary / standardWorkDays) : 0;

  const monthKey = startPart.slice(0, 7);
  const overrideKeyWithMonth = `${staffId}_${monthKey}`;
  const overrideVal = workDaysOverrides[overrideKeyWithMonth] ?? workDaysOverrides[String(staffId)];

  let totalCheckInDays = 0;
  let totalWorkingMinutes = 0;

  const dayOfWeekMap: Record<string, string> = {
    Monday: 'Thứ Hai',
    Tuesday: 'Thứ Ba',
    Wednesday: 'Thứ Tư',
    Thursday: 'Thứ Năm',
    Friday: 'Thứ Sáu',
    Saturday: 'Thứ Bảy',
    Sunday: 'Chủ Nhật',
  };

  const logs: BkWorkLogRecord[] = rows.map((r) => {
    const isCheckIn = !!(r.firstIn || Number(r.workingMinute || 0) > 0);
    const minute = Number(r.workingMinute || 0);
    if (isCheckIn) {
      totalCheckInDays++;
      totalWorkingMinutes += minute;
    }

    return {
      workDate: String(r.workDate),
      dayOfWeek: dayOfWeekMap[String(r.dayName)] || String(r.dayName),
      scheduledStart: r.scheduledStart ? String(r.scheduledStart) : null,
      scheduledEnd: r.scheduledEnd ? String(r.scheduledEnd) : null,
      firstIn: r.firstIn ? String(r.firstIn) : null,
      lastOut: r.lastOut ? String(r.lastOut) : null,
      workingMinute: minute,
      totalHours: Number((minute / 60).toFixed(2)),
      isCheckIn,
      status: isCheckIn ? 'VALID' : 'OFF',
      dailySalary: isCheckIn ? dailySalaryRate : 0,
    };
  });

  const actualCheckInDays = totalCheckInDays;
  const actualWorkDays = typeof overrideVal === 'number' ? overrideVal : actualCheckInDays;
  const workDaysAdjustment = actualWorkDays - actualCheckInDays;
  const calculatedBaseSalary =
    standardWorkDays > 0 ? Math.round((monthlyBaseSalary / standardWorkDays) * actualWorkDays) : 0;

  return {
    staffId,
    staffName: String(profile.staffName || `BK #${staffId}`),
    avatar: profile.avatar ? String(profile.avatar) : null,
    store: String(profile.store || 'PXL'),
    monthlyBaseSalary,
    standardWorkDays,
    actualWorkDays,
    actualCheckInDays,
    workDaysAdjustment,
    calculatedBaseSalary,
    summary: {
      totalDaysInRange: rows.length,
      totalCheckInDays,
      totalWorkingMinutes,
      totalWorkingHours: Number((totalWorkingMinutes / 60).toFixed(2)),
      totalDailySalary: calculatedBaseSalary,
    },
    data: logs,
  };
}
