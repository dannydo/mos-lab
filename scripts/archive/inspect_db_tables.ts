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

  console.log('=== SHOW TABLES LIKE %bonus% OR %report% OR %staff% OR %cc% ===');

  const tables = await legacy.$queryRawUnsafe<any[]>(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'management' 
      AND (table_name LIKE '%bonus%' OR table_name LIKE '%staff%' OR table_name LIKE '%report%' OR table_name LIKE '%xoay%')
    ORDER BY table_name ASC
  `);

  console.table(tables);

  // Check user 37790 info in user & user_profile & user_group
  const userInfo = await legacy.$queryRawUnsafe<any[]>(`
    SELECT u.id, u.username, up.full_name, up.user_group_id, ug.name as group_name
    FROM user u
    LEFT JOIN user_profile up ON u.id = up.user_id
    LEFT JOIN user_group ug ON up.user_group_id = ug.id
    WHERE u.id = 37790
  `);
  console.log('\nUser Info for 37790:');
  console.table(userInfo);

  await legacy.$disconnect();
}

main().catch(console.error);
