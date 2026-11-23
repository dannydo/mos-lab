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

    const targetDateStr = '2026-07-12';
    const bookingDateOnlyDate = new Date(targetDateStr + 'T00:00:00.000Z');
    const startOfDay = new Date(targetDateStr + 'T00:00:00.000Z');
    const endOfDay = new Date(targetDateStr + 'T23:59:59.999Z');

    const comingOrders = await legacy.order.findMany({
      where: {
        OR: [{ booking_date_only: bookingDateOnlyDate }, { booking_date_start: { gte: startOfDay, lte: endOfDay } }],
        order_state: { not: 'Cancelled' },
      },
    });

    console.log(`Coming Today (${targetDateStr}) total orders: ${comingOrders.length}`);

    // Fetch balances and txns for these users
    const userIds = Array.from(new Set(comingOrders.map((o) => o.user_id)));
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

    let liveCount = 0;
    for (const o of comingOrders) {
      if (checkHasLiveCombo(o.user_id, o.booking_date_start, o.date_created)) {
        liveCount++;
      }
    }

    console.log('Coming Today Combo Live count:', liveCount);
  } catch (err) {
    console.error(err);
  } finally {
    await legacy.$disconnect();
  }
}

import { Prisma } from '../apps/api/src/generated/legacy-client';
main();
