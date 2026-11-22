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

    const balances = await legacy.$queryRaw<any[]>`
      SELECT *
      FROM user_service_balance
      WHERE user_id = 25047
      ORDER BY date_created DESC
    `;

    console.log(`Found ${balances.length} raw balances for Thuận (25047):`);
    for (const b of balances) {
      console.log(
        `Balance ID: ${b.id} | Date Created: ${b.date_created} | Normal Count: ${b.normal_count} | Retain: ${b.retain_count} | Expired: ${b.date_expired}`
      );
    }
  } catch (err) {
    console.error(err);
  } finally {
    await legacy.$disconnect();
  }
}

main();
