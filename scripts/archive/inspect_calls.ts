import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';

const legacy = new LegacyPrismaClient();

async function run() {
  console.log('Checking user_call table...');

  const minMaxRes = await legacy.$queryRawUnsafe<any[]>(`
    SELECT MIN(date_created) as minDate, MAX(date_created) as maxDate, COUNT(*) as count
    FROM \`user_call\`
  `);

  console.log('user_call min/max/count:', minMaxRes[0]);

  // Let's also check user_profile and staff_profile counts
  const userProfileCount = await legacy.$queryRawUnsafe<any[]>(`
    SELECT COUNT(*) as count FROM \`user_profile\`
  `);
  console.log('user_profile count:', userProfileCount[0]);

  // Let's check a few recent calls
  const recentCalls = await legacy.$queryRawUnsafe<any[]>(`
    SELECT id, created_staff_id, conversation_duration_second, date_created
    FROM \`user_call\`
    ORDER BY date_created DESC
    LIMIT 5
  `);
  console.log('Recent 5 calls:', recentCalls);

  await legacy.$disconnect();
}

run();
