import dotenv from 'dotenv';
import path from 'path';
import { createLegacyIndexClient, ensureLegacyIndexesSafely } from './lib/apply-legacy-indexes.js';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const phase6Indexes = [
  {
    name: 'idx_accountant_revenue_biz_date_order',
    table: 'accountant_revenue',
    columns: ['client_business_id', 'date', 'order_id'],
  },
] as const;

async function main() {
  const legacy = createLegacyIndexClient();

  try {
    await ensureLegacyIndexesSafely(legacy, phase6Indexes);
  } finally {
    await legacy.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to apply Phase 6 legacy performance indexes:', error);
  process.exitCode = 1;
});
