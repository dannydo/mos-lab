import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const customerQueryIndexes = [
  {
    name: 'idx_usb_user_created_expiry',
    table: 'user_service_balance',
    columns: ['user_id', 'date_created', 'date_expired'],
  },
  {
    name: 'idx_usbt_balance_created_id',
    table: 'user_service_balance_transaction',
    columns: ['user_service_balance_id', 'date_created', 'id'],
  },
  { name: 'idx_order_service_combo_order_total', table: 'order_service_combo', columns: ['order_id', 'total_price'] },
  { name: 'idx_order_service_order', table: 'order_service', columns: ['order_id'] },
] as const;

const quoteIdentifier = (identifier: string) => `\`${identifier.replace(/`/g, '``')}\``;

async function main() {
  const legacy = new LegacyPrismaClient({
    datasources: { db: { url: process.env.LEGACY_DATABASE_URL } },
  });

  try {
    const existing = await legacy.$queryRawUnsafe<Array<{ index_name: string }>>(
      `SELECT DISTINCT index_name
       FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND index_name IN (${customerQueryIndexes.map((index) => `'${index.name}'`).join(', ')})`
    );
    const existingNames = new Set(existing.map((index) => index.index_name));

    for (const index of customerQueryIndexes) {
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
      } catch (error) {
        if (error instanceof Error && error.message.includes('Duplicate key name')) {
          console.log(`Index already present after concurrent DDL: ${index.name}`);
          continue;
        }
        throw error;
      }
    }
  } finally {
    await legacy.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to apply customer-query legacy indexes:', error);
  process.exitCode = 1;
});
