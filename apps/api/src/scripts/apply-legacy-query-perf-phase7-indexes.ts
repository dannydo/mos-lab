import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client/index.js';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const phase7Indexes = [
  {
    name: 'idx_usb_expiry_counts_user',
    table: 'user_service_balance',
    columns: ['date_expired', 'normal_count', 'retain_count', 'user_id'],
  },
  {
    name: 'idx_usb_normal_date_user',
    table: 'user_service_balance',
    columns: ['normal_count', 'date_expired', 'user_id'],
  },
  {
    name: 'idx_usb_retain_date_user',
    table: 'user_service_balance',
    columns: ['retain_count', 'date_expired', 'user_id'],
  },
] as const;

const quoteIdentifier = (identifier: string) => `\`${identifier.replace(/`/g, '``')}\``;

async function main() {
  const legacy = new LegacyPrismaClient({
    datasources: { db: { url: process.env.LEGACY_DATABASE_URL } },
  });

  try {
    const existing = await legacy.$queryRawUnsafe<Array<{ index_name: string }>>(
      `SELECT DISTINCT index_name FROM information_schema.statistics WHERE table_schema = DATABASE() AND index_name IN (${phase7Indexes
        .map((index) => `'${index.name}'`)
        .join(', ')})`
    );
    const existingNames = new Set(existing.map((index) => index.index_name));

    for (const index of phase7Indexes) {
      if (existingNames.has(index.name)) {
        console.log(`Index already present: ${index.name}`);
        continue;
      }

      const statement = `CREATE INDEX ${quoteIdentifier(index.name)} ON ${quoteIdentifier(index.table)} (${index.columns
        .map(quoteIdentifier)
        .join(', ')})`;
      console.log(`Creating index: ${index.name}`);
      try {
        await legacy.$executeRawUnsafe(statement);
        console.log(`Successfully created index: ${index.name}`);
      } catch (error) {
        if (error instanceof Error && error.message.includes('Duplicate key name')) {
          console.log(`Index already present after concurrent DDL: ${index.name}`);
          continue;
        }
        throw error;
      }
    }

    console.log('Refreshing optimizer statistics for modified tables...');
    await legacy.$executeRawUnsafe('ANALYZE TABLE `user_service_balance`;');
    console.log('Optimizer statistics refreshed successfully.');
  } finally {
    await legacy.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to apply Phase 7 legacy performance indexes:', error);
  process.exitCode = 1;
});
