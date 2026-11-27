import dotenv from 'dotenv';
import path from 'path';
import { createLegacyIndexClient, ensureLegacyIndexesSafely } from './lib/apply-legacy-indexes.js';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const phase9Indexes = [
  {
    name: 'idx_iwci_check_item',
    table: 'inventory_warehouse_check_item',
    columns: ['inventory_warehouse_check_id', 'inventory_warehouse_item_id'],
  },
  {
    name: 'idx_iwi_wh_state_item',
    table: 'inventory_warehouse_item',
    columns: ['inventory_warehouse_id', 'item_state', 'inventory_item_id'],
  },
  {
    name: 'idx_slust_group_date_id',
    table: 'sales_lead_user_service_type',
    columns: ['service_group', 'date_created', 'id'],
  },
  {
    name: 'idx_iit_date_created',
    table: 'item_insert_tracker',
    columns: ['date_created'],
  },
] as const;

async function main() {
  const legacy = createLegacyIndexClient();

  try {
    await ensureLegacyIndexesSafely(legacy, phase9Indexes);
  } finally {
    await legacy.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to apply Phase 9 legacy query performance indexes:', error);
  process.exit(1);
});
