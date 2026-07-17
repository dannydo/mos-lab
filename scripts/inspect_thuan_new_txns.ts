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

    // Find transactions for user 25047 from 2025 onwards
    const txns = await legacy.$queryRaw<any[]>`
      SELECT usbt.*, o.booking_date_start, o.order_state, o.date_created as order_created
      FROM user_service_balance_transaction usbt
      LEFT JOIN \`order\` o ON o.id = usbt.order_id
      WHERE usbt.user_id = 25047 AND usbt.date_created >= '2025-01-01 00:00:00'
      ORDER BY usbt.date_created DESC
    `;

    console.log(`Found ${txns.length} new transactions for Thuận (25047):`);
    for (const t of txns) {
      console.log(
        `Tx ID: ${t.id} | Balance ID: ${t.user_service_balance_id} | Date Created: ${t.date_created} | Normal Count: ${t.normal_count} | Retain: ${t.retain_count} | TotalNormalLeft: ${t.total_normal_count_left} | TotalRetainLeft: ${t.total_retain_count_left} | OrderState: ${t.order_state} | Order ID: ${t.order_id}`
      );
    }
  } catch (err) {
    console.error(err);
  } finally {
    await legacy.$disconnect();
  }
}

main();
