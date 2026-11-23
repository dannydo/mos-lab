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
    SELECT * FROM report_staff_client_consultant 
    WHERE user_id = 37790 AND date BETWEEN '2026-07-01' AND '2026-07-31'
    LIMIT 20
  `);
  console.table(reportCc);

  console.log('=== 2. staff_payroll_client_consultant for 37790 in July 2026 ===');
  const payrollCc = await legacy.$queryRawUnsafe<any[]>(`
    SELECT * FROM staff_payroll_client_consultant 
    WHERE user_id = 37790 AND date BETWEEN '2026-07-01' AND '2026-07-31'
    LIMIT 20
  `);
  console.table(payrollCc);

  console.log('=== 3. order_payscale_bonus for 37790 in July 2026 ===');
  const payscaleBonus = await legacy.$queryRawUnsafe<any[]>(`
    SELECT opb.*, ro.date 
    FROM order_payscale_bonus opb
    JOIN report_order ro ON opb.order_id = ro.order_id
    WHERE opb.user_id = 37790 AND ro.date BETWEEN '2026-07-01' AND '2026-07-31'
    LIMIT 20
  `);
  console.table(payscaleBonus);

  console.log('=== 4. order_service_bonus for 37790 in July 2026 ===');
  const serviceBonus = await legacy.$queryRawUnsafe<any[]>(`
    SELECT osb.*, ro.date 
    FROM order_service_bonus osb
    JOIN order_service os ON osb.order_service_id = os.id
    JOIN \`order\` o ON os.order_id = o.id
    JOIN report_order ro ON o.id = ro.order_id
    WHERE osb.user_id = 37790 AND ro.date BETWEEN '2026-07-01' AND '2026-07-31'
    LIMIT 20
  `);
  console.table(serviceBonus);

  console.log('=== 5. staff_bonus_level_state for 37790 in July 2026 ===');
  const levelState = await legacy.$queryRawUnsafe<any[]>(`
    SELECT * FROM staff_bonus_level_state 
    WHERE user_id = 37790 AND date BETWEEN '2026-07-01' AND '2026-07-31'
    LIMIT 20
  `);
  console.table(levelState);

  await legacy.$disconnect();
}

main().catch(console.error);
