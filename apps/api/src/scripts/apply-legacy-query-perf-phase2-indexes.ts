import dotenv from 'dotenv';
import path from 'path';
import { createLegacyIndexClient, ensureLegacyIndexesSafely } from './lib/apply-legacy-indexes.js';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const phase2Indexes = [
  {
    name: 'idx_user_call_from_phone',
    table: 'user_call',
    columns: ['from_phone_number', 'from_user_id'],
  },
  {
    name: 'idx_user_call_to_phone',
    table: 'user_call',
    columns: ['to_phone_number', 'to_user_id'],
  },
  {
    name: 'idx_user_ticket_type_date',
    table: 'user_ticket',
    columns: ['ticket_type_attribute_option_id', 'date_created_only'],
  },
  {
    name: 'idx_sales_lead_type_date',
    table: 'sales_lead',
    columns: ['type', 'date_created'],
  },
  {
    name: 'idx_user_notification_user_template',
    table: 'user_notification',
    columns: ['to_user_id', 'template_id', 'date_created'],
  },
  {
    name: 'idx_staff_tip_user_date',
    table: 'staff_tip',
    columns: ['user_id', 'date_created_only'],
  },
  {
    name: 'idx_user_note_user_key',
    table: 'user_note',
    columns: ['user_id', 'note_field_key'],
  },
] as const;

async function main() {
  const legacy = createLegacyIndexClient();

  try {
    await ensureLegacyIndexesSafely(legacy, phase2Indexes);
  } finally {
    await legacy.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to apply Phase 2 legacy performance indexes:', error);
  process.exitCode = 1;
});
