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

  console.log('=== COLUMNS OF report_staff_client_consultant ===');
  const cols1 = await legacy.$queryRawUnsafe<any[]>(`SHOW COLUMNS FROM report_staff_client_consultant`);
  console.table(cols1);

  console.log('\n=== COLUMNS OF staff_payroll_client_consultant ===');
  const cols2 = await legacy.$queryRawUnsafe<any[]>(`SHOW COLUMNS FROM staff_payroll_client_consultant`);
  console.table(cols2);

  await legacy.$disconnect();
}

main().catch(console.error);
