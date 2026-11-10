import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client/index.js';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const phase8Indexes = [
  {
    name: 'idx_osp_created_order',
    table: 'order_service_progress',
    columns: ['date_created', 'order_id'],
  },
  {
    name: 'idx_osp_updated_order',
    table: 'order_service_progress',
    columns: ['date_updated', 'order_id'],
  },
  {
    name: 'idx_ar_order_id_amounts',
    table: 'accountant_revenue',
    columns: [
      'order_id',
      'paid_cash_amount',
      'paid_credit_card_amount',
      'paid_bank_transfer_amount',
      'tip_amount',
      'debt_amount',
    ],
  },
  {
    name: 'idx_usb_user_date_created',
    table: 'user_service_balance',
    columns: ['user_id', 'date_created', 'id'],
  },
  {
    name: 'idx_ubt_user_biz_date',
    table: 'user_balance_transaction',
    columns: ['user_id', 'client_business_id', 'date_created', 'currency_id', 'amount'],
  },
] as const;

const quoteIdentifier = (identifier: string) => `\`${identifier.replace(/`/g, '``')}\``;

async function main() {
  const legacy = new LegacyPrismaClient({
    datasources: { db: { url: process.env.LEGACY_DATABASE_URL } },
  });

  try {
    const existing = await legacy.$queryRawUnsafe<Array<{ index_name: string }>>(
      `SELECT DISTINCT index_name FROM information_schema.statistics WHERE table_schema = DATABASE() AND index_name IN (${phase8Indexes
        .map((index) => `'${index.name}'`)
        .join(', ')})`
    );
    const existingNames = new Set(existing.map((index) => index.index_name));

    for (const index of phase8Indexes) {
      if (existingNames.has(index.name)) {
        console.log(`Index already present: ${index.name}`);
        continue;
      }

      const statement = `CREATE INDEX ${quoteIdentifier(index.name)} ON ${quoteIdentifier(index.table)} (${index.columns
        .map(quoteIdentifier)
        .join(', ')})`;
      console.log(`Creating index: ${index.name} on ${index.table}...`);
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
    await legacy.$executeRawUnsafe(
      'ANALYZE TABLE `order_service_progress`, `accountant_revenue`, `user_service_balance`, `user_balance_transaction`'
    );
    console.log('Optimizer statistics refreshed successfully.');
  } finally {
    await legacy.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to apply Phase 8 legacy query performance indexes:', error);
  process.exit(1);
});
