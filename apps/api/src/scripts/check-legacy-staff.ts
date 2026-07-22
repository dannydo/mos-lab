import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function run() {
  const legacy = new LegacyPrismaClient({
    datasources: {
      db: {
        url: process.env.LEGACY_DATABASE_URL,
      },
    },
  });

  await legacy.$connect();
  console.log('Connected to Legacy Database.');

  // Find user profiles where provider is 'Staff', not disabled, and user_group_id > 1
  const groups = await legacy.$queryRaw<{ user_group_id: number; count: bigint }[]>`
    SELECT 
      up.user_group_id, 
      COUNT(*) as count
    FROM user_profile up
    WHERE up.provider = 'Staff' AND up.is_disabled = 0 AND up.user_group_id > 1
    GROUP BY up.user_group_id
  `;

  console.log('Legacy Staff Group Statistics (user_group_id > 1):');
  console.log(
    groups.map((g) => ({
      user_group_id: g.user_group_id,
      count: g.count.toString(),
    }))
  );

  // Show a sample of staff with user_group_id > 1
  const sampleStaff = await legacy.$queryRaw<
    { user_id: number; full_name: string; user_group_id: number; email: string; date_created: Date }[]
  >`
    SELECT 
      up.user_id, 
      up.full_name, 
      up.user_group_id,
      u.email,
      up.date_created
    FROM user_profile up
    JOIN user u ON up.user_id = u.id
    WHERE up.provider = 'Staff' AND up.is_disabled = 0 AND up.user_group_id > 1
    ORDER BY up.full_name ASC
  `;

  console.log('\nAll Active Legacy Staff:');
  console.log(
    sampleStaff.map((s) => ({
      user_id: s.user_id,
      full_name: s.full_name,
      user_group_id: s.user_group_id,
      email: s.email,
      date_created: s.date_created,
    }))
  );

  await legacy.$disconnect();
}

run().catch(console.error);
