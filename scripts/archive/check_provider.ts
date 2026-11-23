import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';

const legacy = new LegacyPrismaClient();

async function run() {
  const profiles = await legacy.$queryRawUnsafe<any[]>(`
    SELECT user_id as userId, full_name as fullName, provider
    FROM \`user_profile\`
    WHERE full_name = 'Bảo Hân'
  `);
  console.log('Bảo Hân Profiles:', profiles);
  await legacy.$disconnect();
}

run();
