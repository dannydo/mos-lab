import dotenv from 'dotenv';
import path from 'path';
import { createLegacyIndexClient, ensureLegacyIndexesSafely } from './lib/apply-legacy-indexes.js';

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

async function main() {
  const legacy = createLegacyIndexClient();

  try {
    await ensureLegacyIndexesSafely(legacy, phase8Indexes);
  } finally {
    await legacy.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to apply Phase 8 legacy query performance indexes:', error);
  process.exit(1);
});
