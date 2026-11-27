import dotenv from 'dotenv';
import path from 'path';
import { createLegacyIndexClient, ensureLegacyIndexesSafely } from './lib/apply-legacy-indexes.js';

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

async function main() {
  const legacy = createLegacyIndexClient();

  try {
    await ensureLegacyIndexesSafely(legacy, phase10Indexes);
  } finally {
    await legacy.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to apply Phase 10 legacy query performance indexes:', error);
  process.exit(1);
});
