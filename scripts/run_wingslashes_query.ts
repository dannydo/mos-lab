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
    const dateFromTs = '2026-07-12 00:00:00';
    const dateToTs = '2026-07-13 00:00:00';

    const sql = `
        SELECT
            o.id AS order_id,
            o.user_id AS client_id,
            TRIM(COALESCE(NULLIF(up.full_name, ''), CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, '')))) AS client_name,
            CASE WHEN EXISTS (
                SELECT 1 FROM user_service_balance usb
                WHERE usb.user_id = o.user_id
                  AND usb.date_created < COALESCE(ro.actual_booking_date_start, o.booking_date_start)
                  AND (
                      COALESCE(
                          (
                              SELECT usbt.date_expired
                              FROM user_service_balance_transaction usbt
                              LEFT JOIN report_order ro_txn ON ro_txn.order_id = usbt.order_id
                              LEFT JOIN \`order\` o_txn ON o_txn.id = usbt.order_id
                              WHERE usbt.user_service_balance_id = usb.id
                                AND COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) < COALESCE(ro.actual_booking_date_start, o.booking_date_start)
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
                                AND COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) < COALESCE(ro.actual_booking_date_start, o.booking_date_start)
                              ORDER BY COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) DESC, usbt.id DESC
                              LIMIT 1
                          ),
                          usb.date_expired
                      ) >= DATE(COALESCE(ro.actual_booking_date_start, o.booking_date_start))
                  )
                  AND LEAST(
                      COALESCE(
                          (
                              SELECT usbt.total_normal_count_left + usbt.total_retain_count_left
                              FROM user_service_balance_transaction usbt
                              LEFT JOIN report_order ro_txn ON ro_txn.order_id = usbt.order_id
                              LEFT JOIN \`order\` o_txn ON o_txn.id = usbt.order_id
                              WHERE usbt.user_service_balance_id = usb.id
                                AND COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) < COALESCE(ro.actual_booking_date_start, o.booking_date_start)
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
                            AND COALESCE(ro_txn2.actual_booking_date_start, o_txn2.booking_date_start, usbt2.date_created) >= COALESCE(ro.actual_booking_date_start, o.booking_date_start)
                            AND usbt2.used_staff_id IS NOT NULL
                      )
                  ) > 0
            ) THEN 'Live' ELSE 'Not Live' END AS combo_state
        FROM \`order\` o
        LEFT JOIN report_order ro ON ro.order_id = o.id
        JOIN order_service os ON os.order_id = o.id
        LEFT JOIN user_profile up ON up.user_id = o.user_id
        WHERE 1 = 1
          AND o.date_created >= ?
          AND o.date_created < ?
        GROUP BY o.id, o.user_id
    `;

    const rows = await legacy.$queryRawUnsafe<any[]>(sql, dateFromTs, dateToTs);
    console.log(`Query returned ${rows.length} rows`);
    
    const liveRows = rows.filter(r => r.combo_state === 'Live');
    console.log(`Live combo rows: ${liveRows.length}`);
    console.log(`Not Live combo rows: ${rows.length - liveRows.length}`);
    
    // Print live rows
    console.log("Live Rows:");
    liveRows.forEach(r => console.log(`  Order: ${r.order_id} | Client: ${r.client_id} | Name: ${r.client_name}`));

  } catch (err) {
    console.error(err);
  } finally {
    await legacy.$disconnect();
  }
}

main();
