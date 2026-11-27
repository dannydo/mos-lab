import dotenv from 'dotenv';
import path from 'path';
import { createLegacyIndexClient, ensureLegacyIndexesSafely } from './lib/apply-legacy-indexes.js';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const phase7Indexes = [
  {
    name: 'idx_usb_expiry_counts_user',
    table: 'user_service_balance',
    columns: ['date_expired', 'normal_count', 'retain_count', 'user_id'],
  },
  {
    name: 'idx_usb_normal_date_user',
    table: 'user_service_balance',
    columns: ['normal_count', 'date_expired', 'user_id'],
  },
  {
    name: 'idx_usb_retain_date_user',
    table: 'user_service_balance',
    columns: ['retain_count', 'date_expired', 'user_id'],
  },
] as const;

async function main() {
  const legacy = createLegacyIndexClient();

  try {
    await ensureLegacyIndexesSafely(legacy, phase7Indexes);
  } finally {
    await legacy.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to apply Phase 7 legacy performance indexes:', error);
  process.exitCode = 1;
});
