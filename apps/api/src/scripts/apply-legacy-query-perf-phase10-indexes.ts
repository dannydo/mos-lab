import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client/index.js';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const phase10Indexes = [
  {
    name: 'idx_iwoi_from_date_item',
    table: 'inventory_warehouse_order_item',
    columns: ['from_inventory_warehouse_id', 'date_imported', 'inventory_item_id'],
  },
  {
    name: 'idx_iwoi_date_imported_item',
    table: 'inventory_warehouse_order_item',
    columns: ['date_imported', 'inventory_item_id'],
  },
] as const;

const quoteIdentifier = (identifier: string) => `\`${identifier.replace(/`/g, '``')}\``;

async function main() {
  const legacy = new LegacyPrismaClient({
    datasources: { db: { url: process.env.LEGACY_DATABASE_URL } },
  });

  try {
    const existing = await legacy.$queryRawUnsafe<Array<{ index_name: string }>>(
      `SELECT DISTINCT index_name FROM information_schema.statistics WHERE table_schema = DATABASE() AND index_name IN (${phase10Indexes
        .map((index) => `'${index.name}'`)
        .join(', ')})`
    );
    const existingNames = new Set(existing.map((index) => index.index_name));

    for (const index of phase10Indexes) {
      if (existingNames.has(index.name)) {
        console.log(`Index already present: ${index.name}`);
        continue;
      }

      const statement = `ALTER TABLE ${quoteIdentifier(index.table)} ADD INDEX ${quoteIdentifier(index.name)} (${index.columns
        .map(quoteIdentifier)
        .join(', ')}), ALGORITHM=INPLACE, LOCK=NONE`;
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
    await legacy.$executeRawUnsafe('ANALYZE TABLE `inventory_warehouse_order_item`');
    console.log('Optimizer statistics refreshed successfully.');
  } finally {
    await legacy.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to apply Phase 10 legacy query performance indexes:', error);
  process.exit(1);
});
