import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client/index.js';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
  const legacy = new LegacyPrismaClient({
    datasources: { db: { url: process.env.LEGACY_DATABASE_URL } },
  });

  const indexName = 'idx_order_date_updated_user';
  const tableName = 'order';

  try {
    console.log(`Checking if index \`${indexName}\` exists on \`${tableName}\`...`);
    const existing = await legacy.$queryRawUnsafe<Array<{ index_name: string }>>(
      `SELECT DISTINCT index_name
       FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = ?
         AND index_name = ?`,
      tableName,
      indexName
    );

    if (existing.length > 0) {
      console.log(`Index \`${indexName}\` already exists on \`${tableName}\`. No changes needed.`);
      return;
    }

    console.log(`Adding composite index \`${indexName}\` on \`${tableName}\` (\`date_updated\`, \`user_id\`)...`);
    const startTime = performance.now();
    await legacy.$executeRawUnsafe(
      `ALTER TABLE \`${tableName}\` ADD INDEX \`${indexName}\` (\`date_updated\`, \`user_id\`)`
    );
    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`Successfully added index \`${indexName}\` on \`${tableName}\` in ${duration}s!`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Duplicate key name')) {
      console.log(`Index \`${indexName}\` already exists (concurrent execution).`);
      return;
    }
    console.error(`Failed to add index \`${indexName}\`:`, error);
    process.exitCode = 1;
  } finally {
    await legacy.$disconnect();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
