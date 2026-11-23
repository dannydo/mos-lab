import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';

const legacy = new LegacyPrismaClient({
  datasources: {
    db: {
      url: 'mysql://root:chickisslove@127.0.0.1:3306/management',
    },
  },
});

async function main() {
  await legacy.$connect();

  console.log('=== report_staff_client_consultant BONUS COLUMNS FOR 37790 IN JULY 2026 ===');

  const rows = await legacy.$queryRawUnsafe<any[]>(`
    SELECT 
      CAST(date AS CHAR) as date_str,
      user_id,
      total_check_in_order,
      total_check_in_bonus_amount,
      total_check_out_order,
      total_check_out_bonus_amount
    FROM report_staff_client_consultant 
    WHERE user_id = 37790 AND date BETWEEN '2026-07-01' AND '2026-07-31'
    ORDER BY date ASC
  `);
  console.table(rows);

  await legacy.$disconnect();
}

main().catch(console.error);
