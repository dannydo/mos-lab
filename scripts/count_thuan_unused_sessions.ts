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
    
    // PHP variables
    const clientBusinessId = 1;
    const userId = 25047;
    const date = '2026-07-18'; // scheduled booking date (which is booking_date_start)

    // Let's query all transactions for this user
    const txns = await legacy.$queryRaw<any[]>`
      SELECT id, user_service_balance_id, date_created, date_used, date_expired, normal_count, retain_count, used_staff_id
      FROM user_service_balance_transaction
      WHERE client_business_id = ${clientBusinessId}
        AND user_id = ${userId}
        AND DATE(date_created) < ${date}
        AND (normal_count + retain_count) > 0
    `;

    console.log(`Total balance transaction rows created before ${date}: ${txns.length}`);

    // Print all rows with date_used status
    let unused = 0;
    let usedOnDate = 0;
    let usedOther = 0;

    for (const t of txns) {
      const isUnused = t.date_used === null;
      const isUsedOnDate = t.date_used && new Date(t.date_used).toISOString().slice(0, 10) === date;
      
      if (isUnused) {
        unused++;
        console.log(`  Unused Row: ID ${t.id} | Balance ID ${t.user_service_balance_id} | Created: ${t.date_created} | Normal: ${t.normal_count} | Retain: ${t.retain_count} | Expired: ${t.date_expired}`);
      } else if (isUsedOnDate) {
        usedOnDate++;
        console.log(`  Used On Date Row: ID ${t.id} | Balance ID ${t.user_service_balance_id} | Created: ${t.date_created} | Used: ${t.date_used}`);
      } else {
        usedOther++;
      }
    }

    console.log(`\nSummary:`);
    console.log(`  Unused sessions: ${unused}`);
    console.log(`  Used on booking date: ${usedOnDate}`);
    console.log(`  Used on other dates: ${usedOther}`);
    console.log(`  Calculated count (unused + usedOnDate): ${unused + usedOnDate}`);

  } catch (err) {
    console.error(err);
  } finally {
    await legacy.$disconnect();
  }
}

main();
