import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';

const legacy = new LegacyPrismaClient();

async function run() {
  console.log('Checking staff_task table...');
  const count = await legacy.$queryRawUnsafe<any[]>(`
    SELECT COUNT(*) as count FROM \`staff_task\`
  `);
  console.log('staff_task count:', count[0]?.count);

  const sample = await legacy.$queryRawUnsafe<any[]>(`
    SELECT * FROM \`staff_task\` LIMIT 3
  `);
  console.log('Sample staff_task:', sample);

  await legacy.$disconnect();
}

run();
