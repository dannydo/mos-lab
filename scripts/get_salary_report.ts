import { PrismaClient as CrmPrismaClient } from '../apps/api/src/generated/crm-client/index.js';
import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';

const crm = new CrmPrismaClient();
const legacy = new LegacyPrismaClient();

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

async function run() {
  const start = new Date('2026-06-01T00:00:00.000Z');
  const end = new Date('2026-06-30T23:59:59.999Z');

  // Load config
  let config = DEFAULT_SALARY_CONFIG;
  try {
    const crmConfig = await crm.crmConfig.findUnique({
      where: { key: 'BOOKER_SALARY_CONFIG' },
    });
    if (crmConfig) {
      config = JSON.parse(crmConfig.value);
      console.log('Loaded Salary Config from DB');
    } else {
      console.log('Using default salary config fallback');
    }
  } catch (e) {
    console.log('Error loading config, using default fallback:', e);
  }

  // Fetch active telesales
  const staffList = await crm.crmStaff.findMany({
    where: {
      role: 'telesales',
      isActive: true,
    },
  });

  const staffNames = staffList.map((s) => s.displayName);

  // Fetch legacy user profiles to map displayNames to legacy user IDs
  const profiles = await legacy.$queryRawUnsafe<any[]>(
    `
    SELECT up.user_id as userId, up.full_name as fullName
    FROM \`staff_profile\` sp
    JOIN \`user_profile\` up ON sp.user_id = up.user_id
    WHERE up.provider = 'Staff' AND up.is_disabled = 0
      AND up.full_name IN (${staffNames.map(() => '?').join(',')})
  `,
    ...staffNames
  );

  profiles.sort((a: any, b: any) => Number(a.userId) - Number(b.userId));

  const staffNameToLegacyIdMap = new Map<string, number>();
  const legacyIdToStaffMap = new Map<number, any>();

  profiles.forEach((p: any) => {
    const staff = staffList.find((s) => s.displayName.toLowerCase().trim() === p.fullName.toLowerCase().trim());
    if (staff) {
      staffNameToLegacyIdMap.set(p.fullName.toLowerCase().trim(), Number(p.userId));
      legacyIdToStaffMap.set(Number(p.userId), staff);
    }
  });

  const activeLegacyUserIds = Array.from(staffNameToLegacyIdMap.values());

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

  if (activeLegacyUserIds.length > 0) {
    const allOrders = await legacy.order.findMany({
      where: {
        created_staff_id: { in: activeLegacyUserIds },
        booking_date_start: { gte: start, lte: end },
        order_state: { not: 'Cancelled' },
      },
      select: {
        id: true,
        created_staff_id: true,
        order_state: true,
        total_price: true,
        user_id: true,
        booking_date_start: true,
        date_created: true,
      },
    });

    const completedOrders = allOrders.filter((o) => o.order_state === 'Completed');
    const completedOrderIds = completedOrders.map((o) => o.id);

    // Fetch tips
    const orderTipsMap = new Map<number, number>();
    if (completedOrderIds.length > 0) {
      const orderPayments = await legacy.$queryRawUnsafe<any[]>(`
        SELECT order_id as orderId, tip_amount as tipAmount
        FROM \`order_payment\`
        WHERE order_id IN (${completedOrderIds.join(',')})
      `);
      orderPayments.forEach((op: any) => {
        const existing = orderTipsMap.get(Number(op.orderId)) || 0;
        orderTipsMap.set(Number(op.orderId), existing + Number(op.tipAmount || 0));
      });
    }

    // Fetch order services for booking bonus
    const orderServicesMap = new Map<number, any[]>();
    let serviceNameMap = new Map<number, string>();
    if (completedOrderIds.length > 0) {
      const orderServices = await legacy.order_service.findMany({
        where: { order_id: { in: completedOrderIds } },
      });
      orderServices.forEach((os) => {
        const list = orderServicesMap.get(os.order_id) || [];
        list.push(os);
        orderServicesMap.set(os.order_id, list);
      });

      const serviceIds = Array.from(new Set(orderServices.map((os) => os.service_id)));
      if (serviceIds.length > 0) {
        const serviceLanguages = await legacy.service_language.findMany({
          where: { service_id: { in: serviceIds } },
        });
        serviceLanguages.forEach((sl) => {
          serviceNameMap.set(sl.service_id, sl.service_name);
        });
      }
    }

    // Fetch user balances
    const userIds = Array.from(new Set(allOrders.map((o) => o.user_id).filter((id) => id !== null))) as number[];
    const userBalances =
      userIds.length > 0
        ? await legacy.user_service_balance.findMany({
            where: { user_id: { in: userIds } },
          })
        : [];

    const balanceIds = userBalances.map((b) => b.id);
    const userBalanceTransactions =
      balanceIds.length > 0
        ? await legacy.$queryRawUnsafe<any[]>(`
      SELECT usbt.*, o.booking_date_start as o_booking_date_start
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
          !dateExpired || new Date(dateExpired) >= new Date(new Date(bTime).toISOString().slice(0, 10));

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

    // Process orders
    allOrders.forEach((o) => {
      const staff = legacyIdToStaffMap.get(Number(o.created_staff_id));
      if (!staff) return;

      if (o.order_state === 'Completed') {
        staffStats[staff.id].doneCount++;
        staffStats[staff.id].totalNetRev += o.total_price;
        staffStats[staff.id].totalTips += orderTipsMap.get(o.id) || 0;

        const list = orderServicesMap.get(o.id) || [];
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
          const isCombo = checkHasLiveCombo(o.user_id, o.booking_date_start, o.date_created);

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
      } else {
        staffStats[staff.id].missedCount++;
      }
    });
  }

  // Fetch calls from user_call using raw SQL
  const callStatsMap = new Map<number, { totalCalled: number; totalAnswered: number }>();
  if (activeLegacyUserIds.length > 0) {
    const calls = await legacy.$queryRawUnsafe<any[]>(
      `
      SELECT created_staff_id as createdStaffId, conversation_duration_second as duration
      FROM \`user_call\`
      WHERE date_created >= ? AND date_created <= ?
        AND created_staff_id IN (${activeLegacyUserIds.join(',')})
    `,
      start,
      end
    );

    calls.forEach((c: any) => {
      const uid = Number(c.createdStaffId);
      const current = callStatsMap.get(uid) || { totalCalled: 0, totalAnswered: 0 };
      current.totalCalled++;
      if (Number(c.duration) > 0) {
        current.totalAnswered++;
      }
      callStatsMap.set(uid, current);
    });
  }

  // Fetch happy calls count per staff
  const happyLogs = await crm.crmCallLog.findMany({
    where: {
      createdAt: { gte: start, lte: new Date(end.getTime() + 24 * 60 * 60 * 1000) },
      planId: { not: null },
    },
    select: { staffId: true, planId: true },
  });

  const staffPlanIdsMap = new Map<number, number[]>();
  happyLogs.forEach((log) => {
    if (log.planId) {
      const list = staffPlanIdsMap.get(log.staffId) || [];
      list.push(log.planId);
      staffPlanIdsMap.set(log.staffId, list);
    }
  });

  const allPlanIds = Array.from(new Set(happyLogs.map((l) => l.planId as number)));
  const happyPlans =
    allPlanIds.length > 0
      ? await crm.crmDailyPlan.findMany({
          where: {
            id: { in: allPlanIds },
            bucket: 'happy',
          },
          select: { id: true },
        })
      : [];
  const happyPlanIdsSet = new Set(happyPlans.map((p) => p.id));

  const staffHappyCountMap = new Map<number, number>();
  staffPlanIdsMap.forEach((planIds, staffId) => {
    const count = planIds.filter((pid) => happyPlanIdsSet.has(pid)).length;
    staffHappyCountMap.set(staffId, count);
  });

  // Outputs
  console.log('\n=== BOOKER PERFORMANCE & SALARY BREAKDOWN (JUNE 2026) ===\n');

  const sortedDoneTiers = [...config.doneBonusTiers].sort((a, b) => b.minCount - a.minCount);
  const sortedMissedTiers = [...config.missedBonusTiers].sort((a, b) => a.maxRate - b.maxRate);
  const sortedRevTiers = [...config.revBonusTiers].sort((a, b) => b.minRev - a.minRev);

  const reportData = [];

  for (const staff of staffList) {
    const legacyUserId = staffNameToLegacyIdMap.get(staff.displayName.toLowerCase().trim());
    if (!legacyUserId) {
      continue;
    }

    const stats = staffStats[staff.id];
    const callStats = callStatsMap.get(legacyUserId) || { totalCalled: 0, totalAnswered: 0 };
    const totalHappy = staffHappyCountMap.get(staff.id) || 0;

    const baseSalary = config.baseSalary;
    const totalCount = stats.doneCount + stats.missedCount;
    const missedRate = totalCount > 0 ? stats.missedCount / totalCount : 0;

    // 1. Done Bonus
    let doneBonus = 0;
    const matchedDone = sortedDoneTiers.find((t) => stats.doneCount >= t.minCount);
    if (matchedDone) {
      doneBonus = matchedDone.bonus;
    }

    // 2. Missed Bonus
    let missedBonus = 0;
    if (totalCount > 0) {
      const missedRatePct = missedRate * 100;
      const matchedMissed = sortedMissedTiers.find((t) => missedRatePct <= t.maxRate);
      if (matchedMissed) {
        missedBonus = matchedMissed.bonus;
      }
    }

    // 3. Tip Bonus
    const tipBonus = Math.round(stats.totalTips * (config.tipsPercent / 100));

    // 4. Net Rev Bonus
    let revBonus = 0;
    const matchedRev = sortedRevTiers.find((t) => stats.totalNetRev >= t.minRev);
    if (matchedRev) {
      revBonus = Math.round(stats.totalNetRev * matchedRev.rate);
    }

    const totalSalary = baseSalary + stats.clientBonus + doneBonus + missedBonus + tipBonus + revBonus;

    reportData.push({
      displayName: staff.displayName,
      username: staff.username,
      legacyUserId,
      totalCalled: callStats.totalCalled,
      totalAnswered: callStats.totalAnswered,
      totalHappy,
      totalBooked: totalCount,
      doneCount: stats.doneCount,
      missedCount: stats.missedCount,
      missedRate,
      baseSalary,
      clientBonus: stats.clientBonus,
      doneBonus,
      missedBonus,
      tipBonus,
      revBonus,
      totalTips: stats.totalTips,
      totalNetRev: stats.totalNetRev,
      totalSalary,
    });
  }

  console.log(JSON.stringify(reportData, null, 2));

  await crm.$disconnect();
  await legacy.$disconnect();
}

run();
