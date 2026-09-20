import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client/index.js';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const benchmarkOptimizationIndexes = [
  {
    name: 'idx_usb_user_expiry_counts',
    table: 'user_service_balance',
    columns: ['user_id', 'date_expired', 'normal_count', 'retain_count'],
  },
  {
    name: 'idx_sp_user_rate_id',
    table: 'staff_payroll',
    columns: ['user_id', 'working_hour_rate', 'id'],
  },
  {
    name: 'idx_sb_user_type_orderservice_amount',
    table: 'staff_bonus',
    columns: ['user_id', 'bonus_type', 'order_service_id', 'bonus_amount'],
  },
  {
    name: 'idx_order_user_state_total',
    table: 'order',
    columns: ['user_id', 'order_state', 'total_price', 'id'],
  },
  {
    name: 'idx_user_sms_to_phone_date',
    table: 'user_sms',
    columns: ['to_phone_number', 'date_created'],
  },
] as const;

const quoteIdentifier = (identifier: string) => `\`${identifier.replace(/`/g, '``')}\``;

async function main() {
  const legacy = new LegacyPrismaClient({
    datasources: { db: { url: process.env.LEGACY_DATABASE_URL } },
  });

  try {
    console.log('[IndexMigration] Checking existing database indexes...');
    const existing = await legacy.$queryRawUnsafe<Array<{ index_name: string }>>(
      `SELECT DISTINCT index_name
       FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND index_name IN (${benchmarkOptimizationIndexes.map((index) => `'${index.name}'`).join(', ')})`
    );
    const existingNames = new Set(existing.map((index) => index.index_name));

    for (const index of benchmarkOptimizationIndexes) {
      if (existingNames.has(index.name)) {
        console.log(`[IndexMigration] Index already present: ${index.name}`);
        continue;
      }

      const statement = `CREATE INDEX ${quoteIdentifier(index.name)} ON ${quoteIdentifier(index.table)} (${index.columns
        .map(quoteIdentifier)
        .join(', ')})`;
      console.log(`[IndexMigration] Creating index: ${index.name} on table ${index.table}...`);
      try {
        await legacy.$executeRawUnsafe(statement);
        console.log(`[IndexMigration] Successfully created: ${index.name}`);
      } catch (error) {
        if (error instanceof Error && error.message.includes('Duplicate key name')) {
          console.log(`[IndexMigration] Index already present: ${index.name}`);
          continue;
        }
        throw error;
      }
    }
  } finally {
    await legacy.$disconnect();
  }
}

main().catch((err) => {
  console.error('[IndexMigration] Error applying indexes:', err);
  process.exit(1);
});
