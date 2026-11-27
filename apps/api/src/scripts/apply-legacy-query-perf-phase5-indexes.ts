import dotenv from 'dotenv';
import path from 'path';
import { createLegacyIndexClient, ensureLegacyIndexesSafely } from './lib/apply-legacy-indexes.js';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const phase5Indexes = [
  {
    name: 'idx_user_contact_user_enabled_id_phone',
    table: 'user_contact',
    columns: ['user_id', 'is_disabled', 'id', 'phone_number'],
  },
  {
    name: 'idx_order_service_user_svcgroup_type',
    table: 'order_service',
    columns: ['user_id', 'service_group', 'user_service_type'],
  },
  {
    name: 'idx_slsi_type_user_call',
    table: 'sales_lead_split_item',
    columns: ['sales_lead_user_service_type_id', 'user_call_id'],
  },
] as const;

async function main() {
  const legacy = createLegacyIndexClient();

  try {
    await ensureLegacyIndexesSafely(legacy, phase5Indexes);
  } finally {
    await legacy.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to apply Phase 5 legacy performance indexes:', error);
  process.exitCode = 1;
});
