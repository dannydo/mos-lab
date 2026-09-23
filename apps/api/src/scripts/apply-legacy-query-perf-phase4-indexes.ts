import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client/index.js';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const phase4Indexes = [
  {
    name: 'idx_ubt_tpl_curr_user_amt',
    table: 'user_balance_transaction',
    columns: ['template_id', 'currency_id', 'user_id', 'amount', 'tracking_key'],
  },
  {
    name: 'idx_slsi_date_staff_split',
    table: 'sales_lead_split_item',
    columns: ['date_created', 'assigned_staff_id', 'sales_lead_split_id', 'user_service_type'],
  },
  {
    name: 'idx_st_rule_to_user_date',
    table: 'staff_task',
    columns: ['staff_task_rule_id', 'to_user_id', 'date_completed'],
  },
] as const;

const quoteIdentifier = (identifier: string) => `\`${identifier.replace(/`/g, '``')}\``;

async function main() {
  const legacy = new LegacyPrismaClient({
    datasources: { db: { url: process.env.LEGACY_DATABASE_URL } },
  });

  try {
    const existing = await legacy.$queryRawUnsafe<Array<{ index_name: string }>>(
      `SELECT DISTINCT index_name FROM information_schema.statistics WHERE table_schema = DATABASE() AND index_name IN (${phase4Indexes
        .map((index) => `'${index.name}'`)
        .join(', ')})`
    );
    const existingNames = new Set(existing.map((index) => index.index_name));

    for (const index of phase4Indexes) {
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
    await legacy.$executeRawUnsafe('ANALYZE TABLE `user_balance_transaction`, `sales_lead_split_item`, `staff_task`;');
    console.log('Optimizer statistics refreshed successfully.');
  } finally {
    await legacy.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to apply Phase 4 legacy performance indexes:', error);
  process.exitCode = 1;
});
