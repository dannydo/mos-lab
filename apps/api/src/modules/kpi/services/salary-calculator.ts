import { FastifyInstance } from 'fastify';

const formatDateStr = (d: Date) => {
  const pad = (n: number) => (n < 10 ? '0' + n : n);
  return (
    d.getFullYear() +
    '-' +
    pad(d.getMonth() + 1) +
    '-' +
    pad(d.getDate()) +
    ' ' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes()) +
    ':' +
    pad(d.getSeconds())
  );
};

// Default configuration parameters for Booker Salary
export const DEFAULT_SALARY_CONFIG = {
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
export async function getSalaryConfig(fastify: FastifyInstance) {
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
    fastify.log.error(err as Error, 'Error fetching Booker salary config from DB');
  }
  return DEFAULT_SALARY_CONFIG;
}

export function setCachedSalaryConfig(config: SafeAny) {
  cachedSalaryConfig = config;
}

// Optimized helper function to compute complete Booker Salary & Commissions in memory using legacy DB tables
export async function calculateBookerSalaryStats(
  fastify: FastifyInstance,
  start: Date,
  end: Date,
  targetStaffId?: number
) {
  // Fetch active config
  const config = await getSalaryConfig(fastify);

  // 1. Fetch CRM Staff list
  const staffList = await fastify.prisma.crm.crmStaff.findMany({
    where: {
      role: 'telesales',
      isActive: true,
      ...(targetStaffId !== undefined ? { id: targetStaffId } : {}),
    },
  });

  const staffStats: Record<
    number,
    {
      doneCount: number;
      missedCount: number;
      clientBonus: number;
      totalTips: number;
      totalNetRev: number;
    }
  > = {};

  staffList.forEach((s) => {
    staffStats[s.id] = { doneCount: 0, missedCount: 0, clientBonus: 0, totalTips: 0, totalNetRev: 0 };
  });

  if (staffList.length > 0) {
    const staffNames = staffList.map((s) => s.displayName);

    // Fetch legacy user profiles to map displayNames to legacy user IDs
    const profiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `
      SELECT up.user_id as userId, up.full_name as fullName
      FROM \`staff_profile\` sp
      JOIN \`user_profile\` up ON sp.user_id = up.user_id
      WHERE up.provider = 'Staff' AND up.is_disabled = 0
        AND up.full_name IN (${staffNames.map(() => '?').join(',')})
    `,
      ...staffNames
    );

    // Sort ascending to let duplicates with larger user_id override
    profiles.sort((a: SafeAny, b: SafeAny) => Number(a.userId) - Number(b.userId));

    const staffNameToLegacyIdMap = new Map<string, number>();
    const legacyIdToStaffMap = new Map<number, any>();

    // Prioritize explicit legacyStaffId from crmStaff (Rule #11 Single Source of Truth)
    staffList.forEach((s) => {
      if (s.legacyStaffId) {
        staffNameToLegacyIdMap.set(s.displayName.toLowerCase().trim(), Number(s.legacyStaffId));
        legacyIdToStaffMap.set(Number(s.legacyStaffId), s);
      }
    });

    profiles.forEach((p: SafeAny) => {
      const key = p.fullName.toLowerCase().trim();
      const staff = staffList.find((s) => s.displayName.toLowerCase().trim() === key);
      if (staff && !staff.legacyStaffId && !staffNameToLegacyIdMap.has(key)) {
        staffNameToLegacyIdMap.set(key, Number(p.userId));
        legacyIdToStaffMap.set(Number(p.userId), staff);
      }
    });

    const activeLegacyUserIds = Array.from(
      new Set(
        staffList
          .map((s) => (s.legacyStaffId ? Number(s.legacyStaffId) : Number(staffNameToLegacyIdMap.get(s.displayName.toLowerCase().trim()))))
          .filter((id): id is number => typeof id === 'number' && !isNaN(id))
      )
    );

    if (activeLegacyUserIds.length > 0) {
      const startStr = formatDateStr(start);
      const endStr = formatDateStr(end);

      // Fetch completed orders by actual check-in date (Rule #15 & User Directive: COALESCE(ro.actual_booking_date_start, o.booking_date_start))
      const completedOrders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT o.id, o.created_staff_id, o.order_state, o.total_price, o.user_id,
               o.booking_date_start, o.date_created,
               COALESCE(ro.actual_booking_date_start, o.booking_date_start) as actual_checkin_date
        FROM \`order\` o
        LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
        WHERE o.created_staff_id IN (${activeLegacyUserIds.join(',')})
          AND o.order_state = 'Completed'
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${startStr}'
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${endStr}'
      `);

      // Fetch missed orders by date_created in period using raw string format to prevent timezone offset (Rule #10)
      const missedOrders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT o.created_staff_id as created_staff_id
        FROM \`order\` o
        WHERE o.created_staff_id IN (${activeLegacyUserIds.join(',')})
          AND o.date_created >= '${startStr} 00:00:00'
          AND o.date_created <= '${endStr} 23:59:59'
          AND o.order_state NOT IN ('Completed', 'Cancelled')
      `);

      missedOrders.forEach((o) => {
        const staff = legacyIdToStaffMap.get(Number(o.created_staff_id));
        if (staff) {
          staffStats[staff.id].missedCount++;
        }
      });

      if (completedOrders.length > 0) {
        const completedOrderIds = completedOrders.map((o) => Number(o.id));

        // Fetch tips
        const orderTipsMap = new Map<number, number>();
        if (completedOrderIds.length > 0) {
          const orderPayments = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
            SELECT order_id as orderId, tip_amount as tipAmount
            FROM \`order_payment\`
            WHERE order_id IN (${completedOrderIds.join(',')})
          `);
          orderPayments.forEach((op: SafeAny) => {
            const existing = orderTipsMap.get(Number(op.orderId)) || 0;
            orderTipsMap.set(Number(op.orderId), existing + Number(op.tipAmount || 0));
          });
        }

        // Fetch order services for booking bonus
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

        // Fetch user balances and transactions for checkHasLiveCombo
        const userIds = Array.from(
          new Set(completedOrders.map((o) => Number(o.user_id)).filter((id) => !isNaN(id) && id > 0))
        ) as number[];

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

        // Process completed orders
        completedOrders.forEach((o) => {
          const staff = legacyIdToStaffMap.get(Number(o.created_staff_id));
          if (!staff) return;

          const orderId = Number(o.id);
          const totalPrice = Number(o.total_price || 0);

          staffStats[staff.id].doneCount++;
          staffStats[staff.id].totalNetRev += totalPrice;
          staffStats[staff.id].totalTips += orderTipsMap.get(orderId) || 0;

          const list = orderServicesMap.get(orderId) || [];
          if (list.length > 0) {
            let primaryService = list[0];
            for (const os of list) {
              if (os.service_price > (primaryService?.service_price || 0)) {
                primaryService = os;
              }
            }

            const serviceName = serviceNameMap.get(primaryService.service_id) || 'Unknown';
            let discountPercent = 0;
            if (primaryService.service_price > 0) {
              discountPercent = Math.round((primaryService.discount_amount / primaryService.service_price) * 100);
            }

            const isRefill = serviceName.toLowerCase().includes('refill');
            const isCombo = checkHasLiveCombo(
              Number(o.user_id),
              o.actual_checkin_date || o.booking_date_start,
              o.date_created
            );

            let bonus = 0;
            if (isCombo) {
              bonus = 0;
            } else if (isRefill) {
              if (discountPercent === 0) bonus = config.clientBonusRefill.discount30;
              else if (discountPercent <= 30) bonus = config.clientBonusRefill.discount30;
              else if (discountPercent <= 50) bonus = config.clientBonusRefill.discount50;
              else bonus = config.clientBonusRefill.discountMore;
            } else {
              if (discountPercent === 0) bonus = config.clientBonusFullSet.discount0;
              else if (discountPercent <= 30) bonus = config.clientBonusFullSet.discount30;
              else if (discountPercent <= 50) bonus = config.clientBonusFullSet.discount50;
              else bonus = config.clientBonusFullSet.discountMore;
            }

            staffStats[staff.id].clientBonus += bonus;
          }
        });
      }
    }
  }

  // Calculate final salary breakdown for each staff
  const staffSalaries: Record<
    number,
    {
      baseSalary: number;
      doneCount: number;
      missedCount: number;
      missedRate: number;
      clientBonus: number;
      doneBonus: number;
      missedBonus: number;
      tipBonus: number;
      revBonus: number;
      totalTips: number;
      totalNetRev: number;
      totalSalary: number;
      doneLevelCount?: number;
      missedLevelRate?: number;
      revLevelRate?: number;
      revLevelMin?: number;
    }
  > = {};

  const sortedDoneTiers = [...config.doneBonusTiers].sort((a, b) => b.minCount - a.minCount);
  const sortedMissedTiers = [...config.missedBonusTiers].sort((a, b) => a.maxRate - b.maxRate);
  const sortedRevTiers = [...config.revBonusTiers].sort((a, b) => b.minRev - a.minRev);

  Object.entries(staffStats).forEach(([idStr, stats]) => {
    const id = parseInt(idStr, 10);
    const baseSalary = config.baseSalary;
    const totalCount = stats.doneCount + stats.missedCount;
    const missedRate = totalCount > 0 ? stats.missedCount / totalCount : 0;

    // 1. Done Bonus
    let doneBonus = 0;
    let doneLevelCount = 0;
    const matchedDone = sortedDoneTiers.find((t) => stats.doneCount >= t.minCount);
    if (matchedDone) {
      doneBonus = matchedDone.bonus;
      doneLevelCount = matchedDone.minCount;
    }

    // 2. Missed Bonus
    let missedBonus = 0;
    let missedLevelRate = 0;
    if (totalCount > 0) {
      const missedRatePct = missedRate * 100;
      const matchedMissed = sortedMissedTiers.find((t) => missedRatePct <= t.maxRate);
      if (matchedMissed) {
        missedBonus = matchedMissed.bonus;
        missedLevelRate = matchedMissed.maxRate;
      }
    }

    // 3. Tip Bonus (percentage from config)
    const tipBonus = Math.round(stats.totalTips * (config.tipsPercent / 100));

    // 4. Net Rev Bonus
    let revBonus = 0;
    let revLevelRate = 0;
    let revLevelMin = 0;
    const matchedRev = sortedRevTiers.find((t) => stats.totalNetRev >= t.minRev);
    if (matchedRev) {
      revBonus = Math.round(stats.totalNetRev * matchedRev.rate);
      revLevelRate = matchedRev.rate;
      revLevelMin = matchedRev.minRev;
    }

    const totalSalary = baseSalary + stats.clientBonus + doneBonus + missedBonus + tipBonus + revBonus;

    staffSalaries[id] = {
      baseSalary,
      doneCount: stats.doneCount,
      missedCount: stats.missedCount,
      missedRate,
      clientBonus: stats.clientBonus,
      doneBonus,
      missedBonus,
      tipBonus,
      revBonus,
      totalTips: stats.totalTips,
      totalNetRev: stats.totalNetRev,
      totalSalary,
      doneLevelCount,
      missedLevelRate,
      revLevelRate,
      revLevelMin,
    };
  });

  return staffSalaries;
}

export async function calculateConsultantSalaryStats(
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
