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

  console.log('=== 1. report_staff_client_consultant for 37790 in July 2026 ===');
  const reportCc = await legacy.$queryRawUnsafe<any[]>(`
    SELECT * 
    FROM report_staff_client_consultant 
    WHERE user_id = 37790 AND date BETWEEN '2026-07-01' AND '2026-07-31'
    ORDER BY date ASC
  `);
  console.log(`Rows count: ${reportCc.length}`);
  if (reportCc.length > 0) {
    console.log('Sample row:', reportCc[0]);
  }

  console.log('\n=== 2. staff_payroll_client_consultant for 37790 in July 2026 ===');
  const payrollCc = await legacy.$queryRawUnsafe<any[]>(`
    SELECT * 
    FROM staff_payroll_client_consultant 
    WHERE user_id = 37790 AND date BETWEEN '2026-07-01' AND '2026-07-31'
    ORDER BY date ASC
  `);
  console.log(`Rows count: ${payrollCc.length}`);
  if (payrollCc.length > 0) {
    console.log('Sample row:', payrollCc[0]);
  }

  await legacy.$disconnect();
}

main().catch(console.error);
