import { FastifyInstance } from 'fastify';
import {
  BkSalaryConfig,
  BkPaystubRecord,
  BkWorkLogRecord,
  BkWorkLogResponse,
  TelesalesAttendanceExceptionType,
  TelesalesAttendanceExceptionItem,
  TelesalesAttendanceExceptionAuditLog,
  TELESALES_ATTENDANCE_EXCEPTION_OPTIONS,
  TELESALES_EXECUTIVE_STANDARDS,
  SafeAny,
} from '@mos-lab/shared';
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
  const crmStaff =
    (await fastify.prisma?.crm?.crmStaff
      ?.findMany?.({
        where: {
          isActive: true,
          OR: [
            { legacyStaffId: { in: validLegacyStaffIds } },
            ...(profileNames.length > 0 ? [{ displayName: { in: profileNames } }] : []),
          ],
        },
        select: { id: true, legacyStaffId: true, displayName: true },
      })
      ?.catch?.(() => [])) || [];

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
    fastify.prisma?.crm?.crmCallLog?.findMany
      ? fastify.prisma.crm.crmCallLog
          .findMany({
            where: { staffId: { in: crmStaffIds }, createdAt: { gte: start, lte: end } },
            select: { staffId: true, callResult: true },
          })
          .catch(() => [])
      : Promise.resolve([]),
    fastify.prisma?.crm?.crmOmicallLog?.findMany
      ? fastify.prisma.crm.crmOmicallLog
          .findMany({
            where: { staffId: { in: crmStaffIds }, createdAt: { gte: start, lte: end }, direction: 'outbound' },
            select: { staffId: true, status: true },
          })
          .catch(() => [])
      : Promise.resolve([]),
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
    fastify.prisma.legacy?.order_service?.findMany
      ? fastify.prisma.legacy.order_service
          .findMany({
            where: { order_id: { in: orderIds } },
            select: {
              order_id: true,
              service_id: true,
              service_price: true,
              service_type: true,
              discount_amount: true,
            },
          })
          .catch(() => [])
      : Promise.resolve([]),
    userIds.length > 0 && fastify.prisma.legacy?.user_service_balance?.findMany
      ? fastify.prisma.legacy.user_service_balance
          .findMany({
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
          .catch(() => [])
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

export async function isStaffTelesalesExecutive(fastify: FastifyInstance, staffId: number): Promise<boolean> {
  try {
    if (fastify.prisma?.crm?.crmStaff) {
      const staff = await fastify.prisma.crm.crmStaff.findFirst({
        where: {
          isActive: true,
          OR: [{ legacyStaffId: staffId }, { id: staffId }],
        },
        select: { id: true, role: true, legacyStaffId: true },
      });
      if (staff) {
        const r = (staff.role || '').toLowerCase();
        if (
          r === 'telesales' ||
          r === 'telesales executive' ||
          r === TELESALES_EXECUTIVE_STANDARDS.roleKey ||
          r === TELESALES_EXECUTIVE_STANDARDS.roleName.toLowerCase()
        ) {
          return true;
        }
      }
    }
  } catch (err) {
    fastify.log?.warn?.(`[isStaffTelesalesExecutive] Error checking crmStaff for staffId ${staffId}: ${err}`);
  }

  try {
    if (fastify.prisma?.crm?.crmTeamMember) {
      const member = await fastify.prisma.crm.crmTeamMember.findFirst({
        where: {
          legacyStaffId: staffId,
          isActive: true,
          team: {
            code: { in: ['BK_TELESALES', 'BK', 'TELESALES'] },
          },
        },
      });
      if (member) return true;
    }
  } catch {
    // ignore
  }

  return false;
}

export async function canUserManageTelesalesAttendance(
  fastify: FastifyInstance,
  user: { id: number; role: string; username?: string },
  targetStaffId?: number
): Promise<boolean> {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();

  // 1. Admin or Super Admin
  if (role === 'admin' || role === 'super_admin') {
    return true;
  }

  // 2. Manager
  if (role === 'manager') {
    if (!targetStaffId) return true;
    const isTelesales = await isStaffTelesalesExecutive(fastify, targetStaffId);
    return isTelesales;
  }

  return false;
}

export async function fetchTelesalesAttendanceExceptions(
  fastify: FastifyInstance,
  staffId: number,
  startDateStr: string,
  endDateStr: string
): Promise<Map<string, TelesalesAttendanceExceptionItem>> {
  const map = new Map<string, TelesalesAttendanceExceptionItem>();
  try {
    if (fastify.prisma?.crm?.crmTelesalesAttendanceException) {
      const rows = await fastify.prisma.crm.crmTelesalesAttendanceException.findMany({
        where: {
          staffId,
          workDate: {
            gte: startDateStr,
            lte: endDateStr,
          },
        },
      });
      for (const r of rows) {
        map.set(r.workDate, {
          id: r.id,
          staffId: r.staffId,
          workDate: r.workDate,
          exceptionType: r.exceptionType as TelesalesAttendanceExceptionType,
          workCredit: Number(r.workCredit),
          reason: r.reason,
          approvedByStaffId: r.approvedByStaffId,
          approvedByName: r.approvedByName,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        });
      }
    }
  } catch (err) {
    fastify.log?.warn?.(`[fetchTelesalesAttendanceExceptions] Error: ${err}`);
  }
  return map;
}

export async function fetchTelesalesAttendanceAuditLogs(
  fastify: FastifyInstance,
  staffId?: number,
  startDateStr?: string,
  endDateStr?: string
): Promise<TelesalesAttendanceExceptionAuditLog[]> {
  try {
    if (fastify.prisma?.crm?.crmTelesalesAttendanceExceptionLog) {
      const where: SafeAny = {};
      if (staffId) where.staffId = staffId;
      if (startDateStr || endDateStr) {
        where.workDate = {};
        if (startDateStr) where.workDate.gte = startDateStr;
        if (endDateStr) where.workDate.lte = endDateStr;
      }
      const logs = await fastify.prisma.crm.crmTelesalesAttendanceExceptionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      return logs.map((l) => ({
        id: l.id,
        exceptionId: l.exceptionId,
        staffId: l.staffId,
        workDate: l.workDate,
        action: l.action as 'CREATE' | 'UPDATE' | 'DELETE',
        previousType: l.previousType,
        newType: l.newType,
        previousCredit: l.previousCredit !== null ? Number(l.previousCredit) : null,
        newCredit: l.newCredit !== null ? Number(l.newCredit) : null,
        reason: l.reason,
        performedByStaffId: l.performedByStaffId,
        performedByName: l.performedByName,
        createdAt: l.createdAt.toISOString(),
      }));
    }
  } catch (err) {
    fastify.log?.warn?.(`[fetchTelesalesAttendanceAuditLogs] Error: ${err}`);
  }
  return [];
}

export async function upsertTelesalesAttendanceException(
  fastify: FastifyInstance,
  params: {
    staffId: number;
    workDate: string;
    exceptionType: TelesalesAttendanceExceptionType | 'CLEAR';
    reason?: string;
    performedByStaffId?: number;
    performedByName?: string;
  }
): Promise<{ success: boolean; message: string; exception?: TelesalesAttendanceExceptionItem | null }> {
  const { staffId, workDate, exceptionType, reason, performedByStaffId, performedByName } = params;

  // 1. Verify staff is Telesales Executive
  const isTelesales = await isStaffTelesalesExecutive(fastify, staffId);
  if (!isTelesales) {
    throw new Error('Chức năng ngoại lệ chấm công chỉ áp dụng cho nhân viên có vai trò Telesales Executive.');
  }

  // 2. Find existing exception if any
  const existing = await fastify.prisma.crm.crmTelesalesAttendanceException.findUnique({
    where: { staffId_workDate: { staffId, workDate } },
  });

  if (exceptionType === 'CLEAR') {
    if (!existing) {
      return { success: true, message: 'Không có ngoại lệ để xóa.', exception: null };
    }
    await fastify.prisma.crm.crmTelesalesAttendanceException.delete({
      where: { id: existing.id },
    });

    await fastify.prisma.crm.crmTelesalesAttendanceExceptionLog.create({
      data: {
        exceptionId: existing.id,
        staffId,
        workDate,
        action: 'DELETE',
        previousType: existing.exceptionType,
        newType: null,
        previousCredit: Number(existing.workCredit),
        newCredit: null,
        reason: reason?.trim() || 'Hủy ngoại lệ chấm công',
        performedByStaffId,
        performedByName: performedByName || 'Quản lý',
      },
    });

    return { success: true, message: 'Đã hủy ngoại lệ chấm công thành công.', exception: null };
  }

  // Validate mandatory reason (Requirement 5)
  const trimmedReason = reason?.trim();
  if (!trimmedReason || trimmedReason.length < 3) {
    throw new Error('Bắt buộc nhập lý do khi duyệt ngoại lệ chấm công (tối thiểu 3 ký tự).');
  }

  const opt = TELESALES_ATTENDANCE_EXCEPTION_OPTIONS[exceptionType];
  if (!opt) {
    throw new Error(`Loại ngoại lệ ${exceptionType} không hợp lệ.`);
  }

  const workCredit = opt.workCredit;

  let resultException: TelesalesAttendanceExceptionItem;
  if (existing) {
    const updated = await fastify.prisma.crm.crmTelesalesAttendanceException.update({
      where: { id: existing.id },
      data: {
        exceptionType,
        workCredit,
        reason: trimmedReason,
        approvedByStaffId: performedByStaffId,
        approvedByName: performedByName,
      },
    });
    resultException = {
      id: updated.id,
      staffId: updated.staffId,
      workDate: updated.workDate,
      exceptionType: updated.exceptionType as TelesalesAttendanceExceptionType,
      workCredit: Number(updated.workCredit),
      reason: updated.reason,
      approvedByStaffId: updated.approvedByStaffId,
      approvedByName: updated.approvedByName,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

    await fastify.prisma.crm.crmTelesalesAttendanceExceptionLog.create({
      data: {
        exceptionId: existing.id,
        staffId,
        workDate,
        action: 'UPDATE',
        previousType: existing.exceptionType,
        newType: exceptionType,
        previousCredit: Number(existing.workCredit),
        newCredit: workCredit,
        reason: trimmedReason,
        performedByStaffId,
        performedByName: performedByName || 'Quản lý',
      },
    });
  } else {
    const created = await fastify.prisma.crm.crmTelesalesAttendanceException.create({
      data: {
        staffId,
        workDate,
        exceptionType,
        workCredit,
        reason: trimmedReason,
        approvedByStaffId: performedByStaffId,
        approvedByName: performedByName,
      },
    });
    resultException = {
      id: created.id,
      staffId: created.staffId,
      workDate: created.workDate,
      exceptionType: created.exceptionType as TelesalesAttendanceExceptionType,
      workCredit: Number(created.workCredit),
      reason: created.reason,
      approvedByStaffId: created.approvedByStaffId,
      approvedByName: created.approvedByName,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };

    await fastify.prisma.crm.crmTelesalesAttendanceExceptionLog.create({
      data: {
        exceptionId: created.id,
        staffId,
        workDate,
        action: 'CREATE',
        previousType: null,
        newType: exceptionType,
        previousCredit: null,
        newCredit: workCredit,
        reason: trimmedReason,
        performedByStaffId,
        performedByName: performedByName || 'Quản lý',
      },
    });
  }

  return {
    success: true,
    message: `Đã duyệt ngoại lệ [${opt.shortLabel}] cho ngày ${workDate}.`,
    exception: resultException,
  };
}

export async function fetchBkExceptionAdjustedAttendanceMap(
  fastify: FastifyInstance,
  startPart: string,
  endPart: string,
  staffIds: number[],
  baseAttendanceMap: Map<number, number>
): Promise<Map<number, number>> {
  const adjustedMap = new Map<number, number>(baseAttendanceMap);
  if (staffIds.length === 0) return adjustedMap;

  try {
    if (fastify.prisma?.crm?.crmTelesalesAttendanceException) {
      const exceptions = await fastify.prisma.crm.crmTelesalesAttendanceException.findMany({
        where: {
          staffId: { in: staffIds },
          workDate: { gte: startPart, lte: endPart },
        },
      });

      if (exceptions.length === 0) return adjustedMap;

      const exceptionsByStaff = new Map<number, Array<{ workDate: string; workCredit: number }>>();
      for (const ex of exceptions) {
        const list = exceptionsByStaff.get(ex.staffId) || [];
        list.push({ workDate: ex.workDate, workCredit: Number(ex.workCredit) });
        exceptionsByStaff.set(ex.staffId, list);
      }

      for (const [sid, exList] of exceptionsByStaff.entries()) {
        const rows = await fastify.prisma.legacy
          .$queryRawUnsafe<Array<{ workDate: string; isCheckIn: number }>>(
            `
          SELECT 
            DATE_FORMAT(\`date\`, '%Y-%m-%d') as workDate,
            MAX(CASE WHEN (check_in_date IS NOT NULL OR working_minute > 0) THEN 1 ELSE 0 END) as isCheckIn
          FROM \`report_staff\`
          WHERE user_id = ${sid}
            AND \`date\` >= '${startPart}' AND \`date\` <= '${endPart}'
          GROUP BY \`date\`
        `
          )
          .catch(() => []);

        const checkinMap = new Map<string, number>();
        for (const r of rows) {
          checkinMap.set(String(r.workDate), Number(r.isCheckIn || 0));
        }

        const exMap = new Map<string, number>();
        for (const ex of exList) {
          exMap.set(ex.workDate, ex.workCredit);
        }

        const allDates = new Set<string>([...checkinMap.keys(), ...exMap.keys()]);
        let totalCredit = 0;
        for (const date of allDates) {
          if (exMap.has(date)) {
            totalCredit += exMap.get(date)!;
          } else {
            totalCredit += (checkinMap.get(date) || 0) > 0 ? 1.0 : 0.0;
          }
        }

        adjustedMap.set(sid, Number(totalCredit.toFixed(1)));
      }
    }
  } catch (err) {
    fastify.log?.warn?.(`[fetchBkExceptionAdjustedAttendanceMap] Error adjusting attendance: ${err}`);
  }

  return adjustedMap;
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

  const effectiveAttendanceMap = await fetchBkExceptionAdjustedAttendanceMap(
    fastify,
    startPart,
    endPart,
    activeBkIds,
    attendanceMap
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
    const exceptionAdjustedDays = effectiveAttendanceMap.get(staffId) ?? actualCheckInDays;
    const monthKey = startPart.slice(0, 7);
    const overrideKeyWithMonth = `${staffId}_${monthKey}`;
    const overrideVal = workDaysOverrides[overrideKeyWithMonth] ?? workDaysOverrides[String(staffId)];
    const actualWorkDays = typeof overrideVal === 'number' ? overrideVal : exceptionAdjustedDays;
    const workDaysAdjustment = Number((actualWorkDays - actualCheckInDays).toFixed(1));

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
  endPart: string,
  currentUser?: { id: number; role: string; displayName?: string }
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

  const isTelesalesExecutive = await isStaffTelesalesExecutive(fastify, staffId);
  const canManageExceptions = currentUser
    ? await canUserManageTelesalesAttendance(fastify, currentUser, staffId)
    : false;

  const exceptionMap = isTelesalesExecutive
    ? await fetchTelesalesAttendanceExceptions(fastify, staffId, startPart, endPart)
    : new Map<string, TelesalesAttendanceExceptionItem>();

  const auditLogs = isTelesalesExecutive
    ? await fetchTelesalesAttendanceAuditLogs(fastify, staffId, startPart, endPart)
    : [];

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
  let totalEffectiveCreditDays = 0;
  let totalExceptionDays = 0;
  const rowDateSet = new Set<string>();

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
    const workDate = String(r.workDate);
    rowDateSet.add(workDate);

    if (isCheckIn) {
      totalCheckInDays++;
      totalWorkingMinutes += minute;
    }

    const ex = exceptionMap.get(workDate) || null;
    let effectiveWorkCredit = isCheckIn ? 1.0 : 0.0;
    let dailySalary = isCheckIn ? dailySalaryRate : 0;
    let status: 'VALID' | 'OFF' | 'ADJUSTED' = isCheckIn ? 'VALID' : 'OFF';
    let exceptionBadge: BkWorkLogRecord['exceptionBadge'] = null;

    if (ex) {
      totalExceptionDays++;
      effectiveWorkCredit = ex.workCredit;
      dailySalary = Math.round(effectiveWorkCredit * dailySalaryRate);
      status = 'ADJUSTED';
      const opt = TELESALES_ATTENDANCE_EXCEPTION_OPTIONS[ex.exceptionType];
      if (opt) {
        exceptionBadge = {
          text: opt.badgeText,
          color: opt.badgeColor,
          type: ex.exceptionType,
        };
      }
    }

    totalEffectiveCreditDays += effectiveWorkCredit;

    return {
      workDate,
      dayOfWeek: dayOfWeekMap[String(r.dayName)] || String(r.dayName),
      scheduledStart: r.scheduledStart ? String(r.scheduledStart) : null,
      scheduledEnd: r.scheduledEnd ? String(r.scheduledEnd) : null,
      firstIn: r.firstIn ? String(r.firstIn) : null,
      lastOut: r.lastOut ? String(r.lastOut) : null,
      workingMinute: minute,
      totalHours: Number((minute / 60).toFixed(2)),
      isCheckIn,
      status,
      dailySalary,
      exception: ex,
      effectiveWorkCredit,
      exceptionBadge,
    };
  });

  // If there are exceptions for dates that don't have a report_staff row in `rows` (e.g. Sunday overtime):
  for (const [exDate, ex] of exceptionMap.entries()) {
    if (!rowDateSet.has(exDate)) {
      totalExceptionDays++;
      const effectiveWorkCredit = ex.workCredit;
      totalEffectiveCreditDays += effectiveWorkCredit;
      const opt = TELESALES_ATTENDANCE_EXCEPTION_OPTIONS[ex.exceptionType];
      const dt = new Date(exDate);
      const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const dayOfWeek = dayNames[dt.getUTCDay()] || '';

      logs.push({
        workDate: exDate,
        dayOfWeek,
        scheduledStart: null,
        scheduledEnd: null,
        firstIn: null,
        lastOut: null,
        workingMinute: 0,
        totalHours: 0,
        isCheckIn: false,
        status: 'ADJUSTED',
        dailySalary: Math.round(effectiveWorkCredit * dailySalaryRate),
        exception: ex,
        effectiveWorkCredit,
        exceptionBadge: opt
          ? {
              text: opt.badgeText,
              color: opt.badgeColor,
              type: ex.exceptionType,
            }
          : null,
      });
    }
  }

  // Sort logs by workDate ASC
  logs.sort((a, b) => a.workDate.localeCompare(b.workDate));

  const actualCheckInDays = totalCheckInDays;
  let actualWorkDays: number;
  if (typeof overrideVal === 'number') {
    actualWorkDays = overrideVal;
  } else if (isTelesalesExecutive && exceptionMap.size > 0) {
    actualWorkDays = Number(totalEffectiveCreditDays.toFixed(1));
  } else {
    actualWorkDays = actualCheckInDays;
  }

  const workDaysAdjustment = Number((actualWorkDays - actualCheckInDays).toFixed(1));
  const calculatedBaseSalary =
    standardWorkDays > 0 ? Math.round((monthlyBaseSalary / standardWorkDays) * actualWorkDays) : 0;

  return {
    staffId,
    staffName: String(profile.staffName || `BK #${staffId}`),
    avatar: profile.avatar ? String(profile.avatar) : null,
    store: String(profile.store || 'PXL'),
    isTelesalesExecutive,
    canManageExceptions,
    monthlyBaseSalary,
    standardWorkDays,
    actualWorkDays,
    actualCheckInDays,
    workDaysAdjustment,
    calculatedBaseSalary,
    summary: {
      totalDaysInRange: logs.length,
      totalCheckInDays,
      totalWorkingMinutes,
      totalWorkingHours: Number((totalWorkingMinutes / 60).toFixed(2)),
      totalDailySalary: calculatedBaseSalary,
      totalExceptionDays,
    },
    data: logs,
    auditLogs,
  };
}
