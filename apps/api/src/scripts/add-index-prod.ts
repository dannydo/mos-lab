import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function run() {
  const legacy = new LegacyPrismaClient({
    datasources: { db: { url: process.env.LEGACY_DATABASE_URL } },
  });

  try {
    console.log('Checking index existence on production/staging database...');
    const indexes = await legacy.$queryRawUnsafe<any[]>(`SHOW INDEX FROM \`user_profile\``);
    const exists = indexes.some((i) => i.Key_name === 'idx_user_profile_full_name');
    if (exists) {
      console.log('Index idx_user_profile_full_name already exists.');
      return;
    }

    console.log('Adding index idx_user_profile_full_name on user_profile(full_name)...');
    await legacy.$executeRawUnsafe(
      `ALTER TABLE \`user_profile\` ADD INDEX \`idx_user_profile_full_name\` (\`full_name\`)`
    );
    console.log('Index idx_user_profile_full_name added successfully to user_profile(full_name)!');
  } catch (err) {
    console.error('Failed to add index:', err);
  } finally {
    await legacy.$disconnect();
  }
}

run().catch(console.error);
