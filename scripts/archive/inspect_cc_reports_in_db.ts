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

  console.log('=== report_staff_client_consultant FOR DIỄM HƯƠNG (37790) IN JULY 2026 ===');

  const reportCc = await legacy.$queryRawUnsafe<any[]>(`
    SELECT 
      CAST(date AS CHAR) as date_str,
      user_id,
      client_store_id,
      total_cash_bonus_amount,
      total_credit_bonus_amount,
      total_bonus_amount,
      total_equivalent_salary,
      total_salary_base
    FROM report_staff_client_consultant 
    WHERE user_id = 37790 AND date BETWEEN '2026-07-01' AND '2026-07-31'
    ORDER BY date ASC
  `);
  console.table(reportCc);

  console.log('\n=== staff_payroll_client_consultant FOR DIỄM HƯƠNG (37790) IN JULY 2026 ===');

  const payrollCc = await legacy.$queryRawUnsafe<any[]>(`
    SELECT 
      CAST(date AS CHAR) as date_str,
      user_id,
      client_store_id,
      working_minute,
      total_salary,
      date_created
    FROM staff_payroll_client_consultant 
    WHERE user_id = 37790 AND date BETWEEN '2026-07-01' AND '2026-07-31'
    ORDER BY date ASC
  `);
  console.table(payrollCc);

  await legacy.$disconnect();
}

main().catch(console.error);
