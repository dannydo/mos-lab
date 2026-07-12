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

    console.log(`Querying orders between ${start} and ${end}...`);

    // Fetch orders in range using raw SQL to make sure we query exactly like PHP
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

    console.log(`Found ${orders.length} orders created on 2026-07-12`);

    // Fetch user IDs
    const userIds = Array.from(new Set(orders.map(o => Number(o.userId))));
    if (userIds.length === 0) {
      console.log("No users found");
      return;
    }

    // Fetch user balances and transactions
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

    // JS checkHasLiveCombo function
    const checkHasLiveComboJS = (userId: number, bookingDateStart: Date | null, orderCreatedDate: Date) => {
      const bTime = bookingDateStart || orderCreatedDate;
      const userBals = userBalances.filter(b => Number(b.user_id) === userId);
      
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
          return { live: true, reason: `Balance ${usb.id}: isNotExpired=${isNotExpired}, countLeft=${countLeft}` };
        }
      }
      return { live: false, reason: 'No matching live balance' };
    };

    // SQL-based evaluation using the exact PHP query for each order
    const results: any[] = [];
    let countJS = 0;
    let countSQL = 0;

    for (const o of orders) {
      // Query PHP status
      const [sqlRow] = await legacy.$queryRaw<any[]>`
        SELECT CASE WHEN EXISTS (
          SELECT 1 FROM user_service_balance usb
          WHERE usb.user_id = ${o.userId}
            AND usb.date_created < COALESCE((SELECT actual_booking_date_start FROM report_order WHERE order_id = ${o.id}), ${o.bookingDateStart})
            AND (
                COALESCE(
                    (
                        SELECT usbt.date_expired
                        FROM user_service_balance_transaction usbt
                        LEFT JOIN report_order ro_txn ON ro_txn.order_id = usbt.order_id
                        LEFT JOIN \`order\` o_txn ON o_txn.id = usbt.order_id
                        WHERE usbt.user_service_balance_id = usb.id
                          AND COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) < COALESCE((SELECT actual_booking_date_start FROM report_order WHERE order_id = ${o.id}), ${o.bookingDateStart})
                        ORDER BY COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) DESC, usbt.id DESC
                        LIMIT 1
                    ),
                    usb.date_expired
                ) IS NULL
                OR
                COALESCE(
                    (
                        SELECT usbt.date_expired
                        FROM user_service_balance_transaction usbt
                        LEFT JOIN report_order ro_txn ON ro_txn.order_id = usbt.order_id
                        LEFT JOIN \`order\` o_txn ON o_txn.id = usbt.order_id
                        WHERE usbt.user_service_balance_id = usb.id
                          AND COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) < COALESCE((SELECT actual_booking_date_start FROM report_order WHERE order_id = ${o.id}), ${o.bookingDateStart})
                        ORDER BY COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) DESC, usbt.id DESC
                        LIMIT 1
                    ),
                    usb.date_expired
                ) >= DATE(COALESCE((SELECT actual_booking_date_start FROM report_order WHERE order_id = ${o.id}), ${o.bookingDateStart}))
            )
            AND LEAST(
                COALESCE(
                    (
                        SELECT usbt.total_normal_count_left + usbt.total_retain_count_left
                        FROM user_service_balance_transaction usbt
                        LEFT JOIN report_order ro_txn ON ro_txn.order_id = usbt.order_id
                        LEFT JOIN \`order\` o_txn ON o_txn.id = usbt.order_id
                        WHERE usbt.user_service_balance_id = usb.id
                          AND COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) < COALESCE((SELECT actual_booking_date_start FROM report_order WHERE order_id = ${o.id}), ${o.bookingDateStart})
                        ORDER BY COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) DESC, usbt.id DESC
                        LIMIT 1
                    ),
                    999999
                ),
                usb.normal_count + usb.retain_count + (
                    SELECT COALESCE(SUM(usbt2.normal_count + usbt2.retain_count), 0)
                    FROM user_service_balance_transaction usbt2
                    LEFT JOIN report_order ro_txn2 ON ro_txn2.order_id = usbt2.order_id
                    LEFT JOIN \`order\` o_txn2 ON o_txn2.id = usbt2.order_id
                    WHERE usbt2.user_service_balance_id = usb.id
                      AND COALESCE(ro_txn2.actual_booking_date_start, o_txn2.booking_date_start, usbt2.date_created) >= COALESCE((SELECT actual_booking_date_start FROM report_order WHERE order_id = ${o.id}), ${o.bookingDateStart})
                      AND usbt2.used_staff_id IS NOT NULL
                )
            ) > 0
      ) THEN 1 ELSE 0 END AS has_live`;

      const liveSQL = sqlRow.has_live === 1;
      const resJS = checkHasLiveComboJS(Number(o.userId), o.bookingDateStart, o.dateCreated);

      if (liveSQL) countSQL++;
      if (resJS.live) countJS++;

      results.push({
        id: o.id,
        userId: o.userId,
        clientName: o.clientName,
        bookingDateStart: o.bookingDateStart,
        dateCreated: o.dateCreated,
        liveSQL,
        liveJS: resJS.live,
        reasonJS: resJS.reason
      });
    }

    console.log(`\nJS Count: ${countJS}`);
    console.log(`SQL Count: ${countSQL}`);

    console.log("\nDiscrepancies (SQL is true, JS is false):");
    let discCount = 0;
    for (const r of results) {
      if (r.liveSQL && !r.liveJS) {
        discCount++;
        console.log(`Order ID: ${r.id} | User ID: ${r.userId} | Name: ${r.clientName} | BookingStart: ${r.bookingDateStart?.toISOString()} | Created: ${r.dateCreated?.toISOString()}`);
        console.log(`  JS Reason: ${r.reasonJS}`);
        
        // Let's print the raw user balances and transactions for this user
        const bals = userBalances.filter(b => Number(b.user_id) === Number(r.userId));
        console.log(`  User Balances:`, bals.map(b => ({ id: b.id, normal: b.normal_count, retain: b.retain_count, exp: b.date_expired, created: b.date_created })));
        for (const b of bals) {
          const txns = txnsByBalanceId.get(b.id) || [];
          console.log(`    Txns for Balance ${b.id}:`, txns.map(t => ({ id: t.id, order_id: t.order_id, normal: t.normal_count, retain: t.retain_count, left_normal: t.total_normal_count_left, left_retain: t.total_retain_count_left, created: t.date_created, start: t.o_booking_date_start })));
        }
      }
    }
    console.log(`Total discrepancies: ${discCount}`);

  } catch (err) {
    console.error(err);
  } finally {
    await legacy.$disconnect();
  }
}

import { Prisma } from '../apps/api/src/generated/legacy-client';
main();
