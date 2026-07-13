import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';

const legacy = new LegacyPrismaClient();

async function run() {
  console.log('Running EXPLAIN on original query...');
  const explain = await legacy.$queryRawUnsafe<any[]>(`
    EXPLAIN SELECT usbt.*, o.booking_date_start as o_booking_date_start
    FROM user_service_balance_transaction usbt
    LEFT JOIN \`order\` o ON o.id = usbt.order_id
    WHERE usbt.user_service_balance_id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
  `);
  
  explain.forEach((row, i) => {
    console.log(`Row ${i + 1}:`);
    for (const [key, val] of Object.entries(row)) {
      console.log(`  ${key}: ${typeof val === 'bigint' ? val.toString() : val}`);
    }
  });

  await legacy.$disconnect();
}

run();
