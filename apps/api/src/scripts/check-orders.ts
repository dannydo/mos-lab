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

  console.log('--- Orders by created_staff_id ---');
  const createdStats = await legacy.$queryRawUnsafe<any[]>(`
    SELECT o.created_staff_id as createdStaffId, up.full_name as fullName, COUNT(*) as cnt
    FROM \`order\` o
    LEFT JOIN user_profile up ON o.created_staff_id = up.user_id
    GROUP BY o.created_staff_id, up.full_name
    ORDER BY cnt DESC
    LIMIT 10
  `);
  console.log(createdStats);

  console.log('--- Orders by assigned_staff_id ---');
  const assignedStats = await legacy.$queryRawUnsafe<any[]>(`
    SELECT o.assigned_staff_id as assignedStaffId, up.full_name as fullName, COUNT(*) as cnt
    FROM \`order\` o
    LEFT JOIN user_profile up ON o.assigned_staff_id = up.user_id
    GROUP BY o.assigned_staff_id, up.full_name
    ORDER BY cnt DESC
    LIMIT 10
  `);
  console.log(assignedStats);

  await legacy.$disconnect();
}

run().catch(console.error);
