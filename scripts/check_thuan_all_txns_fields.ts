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
    
    const txns = await legacy.$queryRaw<any[]>`
      SELECT id, user_service_balance_id, date_created, date_used, date_changed, date_cancelled, normal_count, retain_count
      FROM user_service_balance_transaction
      WHERE user_id = 25047 AND (normal_count + retain_count) > 0
      ORDER BY date_created DESC
    `;

    console.log(`Transactions checked: ${txns.length}`);
    for (const t of txns) {
      if (t.date_used === null && (t.date_changed !== null || t.date_cancelled !== null)) {
        console.log(`Tx ID: ${t.id} | Balance ID: ${t.user_service_balance_id} | Created: ${t.date_created} | Used: ${t.date_used} | Changed: ${t.date_changed} | Cancelled: ${t.date_cancelled}`);
      }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await legacy.$disconnect();
  }
}

main();
