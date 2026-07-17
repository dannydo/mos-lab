import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client';

const legacy = new LegacyPrismaClient({
  datasources: {
    db: {
      url: 'mysql://root:chickisslove@127.0.0.1:3306/management',
    },
  },
});

async function main() {
  try {
    await legacy.$connect();

    // Date range
    const start = new Date('2026-07-12T00:00:00.000Z');
    const end = new Date('2026-07-12T23:59:59.999Z');

    // Fetch all orders created on 2026-07-12
    const allOrders = await legacy.order.findMany({
      where: {
        date_created: { gte: start, lte: end },
        order_state: { not: 'Cancelled' },
      },
    });

    console.log(`Total orders found: ${allOrders.length}`);

    // Fetch user profiles to find staff names
    const staffProfiles = await legacy.$queryRawUnsafe<any[]>(`
      SELECT up.user_id as userId, up.full_name as fullName
      FROM \`staff_profile\` sp
      JOIN \`user_profile\` up ON sp.user_id = up.user_id
      WHERE up.provider = 'Staff' AND up.is_disabled = 0
    `);
    const staffMap = new Map(staffProfiles.map((s) => [Number(s.userId), s.fullName]));

    // Fetch services
    const completedOrders = allOrders.filter((o) => o.order_state === 'Completed');
    const completedOrderIds = completedOrders.map((o) => o.id);

    const orderServicesMap = new Map<number, any[]>();
    const serviceNameMap = new Map<number, string>();

    // Query order services for all orders, not just completed!
    const allOrderIds = allOrders.map((o) => o.id);
    if (allOrderIds.length > 0) {
      const orderServices = await legacy.order_service.findMany({
        where: { order_id: { in: allOrderIds } },
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
    const userIds = Array.from(new Set(allOrders.map((o) => o.user_id)));
    const userBalances = await legacy.user_service_balance.findMany({
      where: { user_id: { in: userIds } },
    });

    const balanceIds = userBalances.map((b) => b.id);
    const userBalanceTransactions =
      balanceIds.length > 0
        ? await legacy.$queryRaw<any[]>`
      SELECT usbt.*, o.booking_date_start as o_booking_date_start
      FROM user_service_balance_transaction usbt
      LEFT JOIN \`order\` o ON o.id = usbt.order_id
      WHERE usbt.user_service_balance_id IN (${Prisma.join(balanceIds)})
    `
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

    let oldComboCount = 0;
    let newComboCount = 0;

    allOrders.forEach((o) => {
      const booker = staffMap.get(Number(o.created_staff_id)) || 'Unknown';
      if (booker !== 'Bảo Hân') return; // Only look at Bảo Hân

      const orderServicesList = orderServicesMap.get(o.id) || [];
      let primaryService = orderServicesList[0];
      for (const os of orderServicesList) {
        if (os.service_price > (primaryService?.service_price || 0)) {
          primaryService = os;
        }
      }

      const serviceName = primaryService ? serviceNameMap.get(primaryService.service_id) || 'Unknown' : 'Unknown';

      // Old logic: check if service contains 'combo'
      const isComboOld =
        serviceName.toLowerCase().includes('combo') ||
        (primaryService?.service_type || '').toLowerCase().includes('combo');

      // New logic: check if customer has live combo at time of booking
      const isComboNew = checkHasLiveCombo(o.user_id, o.booking_date_start, o.date_created);

      if (isComboOld) oldComboCount++;
      if (isComboNew) newComboCount++;

      console.log(`Order: ${o.id} | Service: ${serviceName} | Old: ${isComboOld} | New: ${isComboNew}`);
    });

    console.log('\nResults for Bảo Hân on 2026-07-12:');
    console.log('  Old Combo count:', oldComboCount);
    console.log('  New Combo count (based on checkHasLiveCombo):', newComboCount);
  } catch (err) {
    console.error(err);
  } finally {
    await legacy.$disconnect();
  }
}

import { Prisma } from '../apps/api/src/generated/legacy-client';
main();
