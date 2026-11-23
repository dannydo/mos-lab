import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { BK_COMBO_LIVE_DONE_BONUS, calculateCheckinBonus, getBkSalaryConfig } from './bk-salary-config-and-rules.js';

export interface BkOrderCheckinComputationResult {
  clientBonusMap: Map<number, number>;
  singleDoneMap: Map<number, number>;
  comboLiveDoneMap: Map<number, number>;
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

const inFlightBkCheckinPromises = new Map<string, Promise<BkOrderCheckinComputationResult>>();
const bkCheckinComputedAt = new Map<string, number>();
const bkCheckinCache = new Map<string, BkOrderCheckinComputationResult>();

export async function computeBkOrderCheckins(
  fastify: FastifyInstance,
  startPart: string,
  endPart: string,
  targetBkIds: number[],
  storeFilter: string = '',
  skipCache = false
): Promise<BkOrderCheckinComputationResult> {
  if (targetBkIds.length === 0) {
    return {
      clientBonusMap: new Map<number, number>(),
      singleDoneMap: new Map<number, number>(),
      comboLiveDoneMap: new Map<number, number>(),
      orderCheckinMap: new Map(),
    };
  }

  const sortedBkIds = [...targetBkIds].sort((a, b) => a - b).join(',');
  const cacheKey = `bk:order-checkins:${startPart}:${endPart}:${sortedBkIds}:${storeFilter.trim().toUpperCase()}`;
  const now = Date.now();

  if (!skipCache) {
    const cached = bkCheckinCache.get(cacheKey);
    if (cached) {
      const computedAt = bkCheckinComputedAt.get(cacheKey) || now;
      const age = now - computedAt;

      // 1. FRESH (< 180s): Trả về ngay lập tức từ bộ nhớ RAM
      if (age < 180_000) {
        return cached;
      }

      // 2. STALE-WHILE-REVALIDATE (180s - 900s): Trả về ngay stale result (0ms) và revalidate ngầm
      if (age < 900_000) {
        if (!inFlightBkCheckinPromises.has(cacheKey)) {
          const revalidatePromise = (async () => {
            try {
              const freshResult = await executeComputeBkOrderCheckins(
                fastify,
                startPart,
                endPart,
                targetBkIds,
                storeFilter
              );
              bkCheckinComputedAt.set(cacheKey, Date.now());
              bkCheckinCache.set(cacheKey, freshResult);
              return freshResult;
            } catch (err: unknown) {
              const errMsg = err instanceof Error ? err.message : String(err);
              fastify.log?.warn?.(`[BkSalary] Background SWR revalidation failed: ${errMsg}`);
              return cached;
            } finally {
              inFlightBkCheckinPromises.delete(cacheKey);
            }
          })();
          inFlightBkCheckinPromises.set(cacheKey, revalidatePromise);
        }
        return cached;
      }
    }

    // 3. Single-flight in-progress deduplication cho cold-start
    const inFlight = inFlightBkCheckinPromises.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }
  }

  const computePromise = (async () => {
    try {
      const result = await executeComputeBkOrderCheckins(fastify, startPart, endPart, targetBkIds, storeFilter);
      bkCheckinComputedAt.set(cacheKey, Date.now());
      bkCheckinCache.set(cacheKey, result);
      return result;
    } finally {
      inFlightBkCheckinPromises.delete(cacheKey);
    }
  })();

  if (!skipCache) {
    inFlightBkCheckinPromises.set(cacheKey, computePromise);
  }

  return computePromise;
}

async function executeComputeBkOrderCheckins(
  fastify: FastifyInstance,
  startPart: string,
  endPart: string,
  targetBkIds: number[],
  storeFilter: string = ''
): Promise<BkOrderCheckinComputationResult> {
  const config = await getBkSalaryConfig(fastify);

  if (targetBkIds.length === 0) {
    return {
      clientBonusMap: new Map<number, number>(),
      singleDoneMap: new Map<number, number>(),
      comboLiveDoneMap: new Map<number, number>(),
      orderCheckinMap: new Map(),
    };
  }

  const bkIdsStr = targetBkIds.join(',');

  // Tối ưu hóa: Thay thế OR condition giữa report_order và order bằng UNION ALL để MariaDB tận dụng range indexes
  const sql = `
    SELECT 
      o.id as orderId,
      o.created_staff_id as bookerId,
      o.user_id as userId,
      ro.actual_booking_date_start as bookingDateStart,
      o.date_created as dateCreated,
      COALESCE(o.total_price, 0) as totalPrice
    FROM report_order ro
    JOIN \`order\` o ON o.id = ro.order_id
    LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
    WHERE ro.actual_booking_date_start >= '${startPart} 00:00:00' 
      AND ro.actual_booking_date_start <= '${endPart} 23:59:59'
      AND o.order_state IN ('Completed', 'CheckOut')
      AND o.created_staff_id IN (${bkIdsStr})
      ${storeFilter}
    UNION ALL
    SELECT 
      o.id as orderId,
      o.created_staff_id as bookerId,
      o.user_id as userId,
      o.booking_date_start as bookingDateStart,
      o.date_created as dateCreated,
      COALESCE(o.total_price, 0) as totalPrice
    FROM \`order\` o
    LEFT JOIN report_order ro ON o.id = ro.order_id
    LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
    WHERE o.booking_date_start >= '${startPart} 00:00:00' 
      AND o.booking_date_start <= '${endPart} 23:59:59'
      AND ro.actual_booking_date_start IS NULL
      AND o.order_state IN ('Completed', 'CheckOut')
      AND o.created_staff_id IN (${bkIdsStr})
      ${storeFilter}
  `;

  const orders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql);
  const orderIds = orders.map((o) => Number(o.orderId));
  const userIds = Array.from(new Set(orders.map((o) => Number(o.userId)).filter((id) => !!id)));

  const clientBonusMap = new Map<number, number>();
  const singleDoneMap = new Map<number, number>();
  const comboLiveDoneMap = new Map<number, number>();
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
    return { clientBonusMap, orderCheckinMap, singleDoneMap, comboLiveDoneMap };
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

  // Chunking balanceIds into batches of 500 to avoid giant SQL IN clauses
  const balanceChunkSize = 500;
  const balanceChunks: number[][] = [];
  for (let i = 0; i < balanceIds.length; i += balanceChunkSize) {
    balanceChunks.push(balanceIds.slice(i, i + balanceChunkSize));
  }

  const [serviceLanguages, chunkedBalanceTransactions] = await Promise.all([
    serviceIds.length > 0
      ? fastify.prisma.legacy.service_language.findMany({
          where: { service_id: { in: serviceIds } },
          select: { service_id: true, service_name: true },
        })
      : Promise.resolve([]),
    balanceChunks.length > 0
      ? Promise.all(
          balanceChunks.map((chunk) =>
            fastify.prisma.legacy
              .$queryRawUnsafe<SafeAny[]>(
                `
              SELECT usbt.id, usbt.user_service_balance_id, usbt.date_created, usbt.date_expired,
                     usbt.total_normal_count_left, usbt.total_retain_count_left, usbt.normal_count,
                     usbt.retain_count, usbt.used_staff_id, usbt.order_id,
                     COALESCE(ro.actual_booking_date_start, o.booking_date_start) as o_booking_date_start
              FROM user_service_balance_transaction usbt
              LEFT JOIN \`order\` o ON o.id = usbt.order_id
              LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
              WHERE usbt.user_service_balance_id IN (${chunk.join(',')})
                AND usbt.date_created <= '${endPart} 23:59:59'
            `
              )
              .catch(() => [])
          )
        ).then((res) => res.flat())
      : Promise.resolve([]),
  ]);
  const userBalanceTransactions = chunkedBalanceTransactions;
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

    if (isCombo) {
      const prevCombo = comboLiveDoneMap.get(bookerId) || 0;
      comboLiveDoneMap.set(bookerId, prevCombo + 1);
    } else {
      const prevSingle = singleDoneMap.get(bookerId) || 0;
      singleDoneMap.set(bookerId, prevSingle + 1);
    }
  });

  return { clientBonusMap, orderCheckinMap, singleDoneMap, comboLiveDoneMap };
}
