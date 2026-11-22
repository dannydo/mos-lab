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

    // Find all transactions for balance 81038
    const txns = await legacy.$queryRaw<any[]>`
      SELECT *
      FROM user_service_balance_transaction
      WHERE user_service_balance_id = 81038
      ORDER BY date_created ASC
    `;

    console.log(`Found ${txns.length} transactions for Balance 81038:`);

    let normalCount = 0;
    let retainCount = 0;

    for (const t of txns) {
      if (t.normal_count !== null) normalCount += t.normal_count;
      if (t.retain_count !== null) retainCount += t.retain_count;

      console.log(
        `Tx ID: ${t.id} | Date: ${t.date_created} | Normal: ${t.normal_count} | Retain: ${t.retain_count} | Staff: ${t.used_staff_id} | Date Used: ${t.date_used} | Date Expired: ${t.date_expired}`
      );
    }

    console.log(`\nSum of normal_count: ${normalCount}`);
    console.log(`Sum of retain_count: ${retainCount}`);
  } catch (err) {
    console.error(err);
  } finally {
    await legacy.$disconnect();
  }
}

main();
