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

    const txns = await legacy.$queryRaw<any[]>`
      SELECT *
      FROM user_service_balance_transaction
      WHERE client_business_id = 1
        AND user_id = 25047
        AND DATE(date_created) < '2026-07-12'
        AND (normal_count + retain_count) > 0
        AND date_used IS NULL AND date_changed IS NULL AND date_cancelled IS NULL
    `;

    console.log(`Unused transactions without change/cancel: ${txns.length}`);
    for (const t of txns) {
      console.log(
        `Tx ID: ${t.id} | Balance ID: ${t.user_service_balance_id} | Created: ${t.date_created} | Expired: ${t.date_expired} | Normal: ${t.normal_count} | Retain: ${t.retain_count}`
      );
    }
  } catch (err) {
    console.error(err);
  } finally {
    await legacy.$disconnect();
  }
}

main();
