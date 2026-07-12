import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client';

const legacy = new LegacyPrismaClient({
  datasources: {
    db: {
      url: "mysql://root:chickisslove@127.0.0.1:3306/management"
    }
  }
});

async function main() {
  try {
    await legacy.$connect();
    
    // PHP date range for 2026-07-12
    const start = '2026-07-12 00:00:00';
    const end = '2026-07-13 00:00:00';

    const orders = await legacy.$queryRaw<any[]>`
      SELECT 
        o.id,
        o.user_id as userId,
        o.booking_date_start as bookingDateStart,
        o.date_created as dateCreated,
        o.order_state as orderState,
        up.full_name as clientName
      FROM \`order\` o
      LEFT JOIN user_profile up ON up.user_id = o.user_id
      WHERE o.date_created >= ${start} AND o.date_created < ${end}
        AND o.order_state <> 'Cancelled'
      ORDER BY o.date_created ASC
    `;

    console.log(`Orders found: ${orders.length}`);

    // Fetch user balances
    const userIds = Array.from(new Set(orders.map(o => Number(o.userId))));
    const userBalances = await legacy.user_service_balance.findMany({
      where: { user_id: { in: userIds } }
    });

    const balanceIds = userBalances.map(b => b.id);
    const userBalanceTransactions = balanceIds.length > 0 ? await legacy.$queryRaw<any[]>`
      SELECT usbt.*, o.booking_date_start as o_booking_date_start
      FROM user_service_balance_transaction usbt
      LEFT JOIN \`order\` o ON o.id = usbt.order_id
      WHERE usbt.user_service_balance_id IN (${Prisma.join(balanceIds)})
    ` : [];

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
      const userBals = userBalances.filter(b => b.user_id === userId);
      
      for (const usb of userBals) {
        if (new Date(usb.date_created) >= new Date(bTime)) {
          continue;
        }

        const txnsBefore = (txnsByBalanceId.get(usb.id) || []).filter(t => 
          new Date(t.o_booking_date_start || t.date_created) < new Date(bTime)
        );

        txnsBefore.sort((a, b) => {
          const timeA = new Date(a.o_booking_date_start || a.date_created).getTime();
          const timeB = new Date(b.o_booking_date_start || b.date_created).getTime();
          if (timeA !== timeB) return timeB - timeA;
          return b.id - a.id;
        });

        const lastTxnBefore = txnsBefore[0];

        const dateExpired = lastTxnBefore ? lastTxnBefore.date_expired : usb.date_expired;
        const isNotExpired = !dateExpired || new Date(dateExpired) >= new Date(new Date(bTime).toISOString().slice(0, 10));

        let countLeft = 0;
        if (lastTxnBefore && lastTxnBefore.total_normal_count_left !== null && lastTxnBefore.total_retain_count_left !== null) {
          countLeft = (lastTxnBefore.total_normal_count_left || 0) + (lastTxnBefore.total_retain_count_left || 0);
        } else {
          const txnsAfterOrAt = (txnsByBalanceId.get(usb.id) || []).filter(t => 
            new Date(t.o_booking_date_start || t.date_created) >= new Date(bTime)
          );
          
          let usedAfter = 0;
          txnsAfterOrAt.forEach(t => {
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

    let comboCount = 0;
    orders.forEach(o => {
      const isLiveCombo = checkHasLiveCombo(o.userId, o.bookingDateStart, o.dateCreated);
      if (isLiveCombo) {
        comboCount++;
        console.log(`Order: ${o.id} | User: ${o.userId} | Name: ${o.clientName} is COMBO_LIVE`);
      }
    });

    console.log(`Total live combo: ${comboCount}`);

  } catch (err) {
    console.error(err);
  } finally {
    await legacy.$disconnect();
  }
}

import { Prisma } from '../apps/api/src/generated/legacy-client';
main();
