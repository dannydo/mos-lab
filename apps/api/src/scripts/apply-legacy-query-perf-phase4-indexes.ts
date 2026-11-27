import dotenv from 'dotenv';
import path from 'path';
import { createLegacyIndexClient, ensureLegacyIndexesSafely } from './lib/apply-legacy-indexes.js';

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

async function main() {
  const legacy = createLegacyIndexClient();

  try {
    await ensureLegacyIndexesSafely(legacy, phase4Indexes);
  } finally {
    await legacy.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to apply Phase 4 legacy performance indexes:', error);
  process.exitCode = 1;
});
