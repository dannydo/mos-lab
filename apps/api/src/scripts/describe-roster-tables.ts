import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function run() {
  const legacy = new LegacyPrismaClient({
    datasources: { db: { url: process.env.LEGACY_DATABASE_URL } },
  });

  const tables = ['wingsctrl_roster', 'staff_working_shift', 'staff_working_shift_schedule'];
  try {
    for (const table of tables) {
      console.log(`\n--- Schema for ${table} ---`);
      const schema = await legacy.$queryRawUnsafe<SafeAny[]>(`DESCRIBE \`${table}\``);
      console.log(JSON.stringify(schema, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await legacy.$disconnect();
  }
}

run().catch(console.error);
