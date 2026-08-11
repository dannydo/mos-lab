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

    console.log('=== SHOW COLUMNS FROM staff_payroll_level_rule ===');
    const cols = await legacy.$queryRawUnsafe<any[]>(`SHOW COLUMNS FROM staff_payroll_level_rule`);
    console.table(cols);

    console.log('=== SELECT ALL FROM staff_payroll_level_rule ===');
    const rows = await legacy.$queryRawUnsafe<any[]>(`SELECT * FROM staff_payroll_level_rule LIMIT 20`);
    console.table(rows);
  } catch (err) {
    console.error('Error executing query:', err);
  } finally {
    await legacy.$disconnect();
  }
}

main();
