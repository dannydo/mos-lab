import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';
import { PrismaClient as CrmPrismaClient } from '../apps/api/src/generated/crm-client/index.js';

const legacy = new LegacyPrismaClient();
const crm = new CrmPrismaClient();

async function run() {
  const staffProfiles = await legacy.$queryRawUnsafe<any[]>(`
    SELECT up.user_id as userId, up.full_name as fullName
    FROM \`staff_profile\` sp
    JOIN \`user_profile\` up ON sp.user_id = up.user_id
    WHERE up.provider = 'Staff' AND up.is_disabled = 0
  `);
  console.log('Staff Profiles in Legacy DB:');
  staffProfiles.forEach(s => {
    console.log(`User ID: ${s.userId}, Name: ${s.fullName}`);
  });

  await legacy.$disconnect();
  await crm.$disconnect();
}

run();
