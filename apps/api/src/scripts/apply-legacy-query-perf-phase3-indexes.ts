import dotenv from 'dotenv';
import path from 'path';
import { createLegacyIndexClient, ensureLegacyIndexesSafely } from './lib/apply-legacy-indexes.js';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const phase3Indexes = [
  {
    name: 'idx_ut_biz_type_date_store',
    table: 'user_ticket',
    columns: ['client_business_id', 'type', 'date_created', 'client_store_id'],
  },
  {
    name: 'idx_ubt_user_date',
    table: 'user_balance_transaction',
    columns: ['user_id', 'date_created'],
  },
  {
    name: 'idx_wh_item_from_item',
    table: 'inventory_warehouse_order_item',
    columns: ['from_inventory_warehouse_id', 'inventory_item_id'],
  },
  {
    name: 'idx_usbt_balance_date_used',
    table: 'user_service_balance_transaction',
    columns: ['user_service_balance_id', 'date_created', 'used_staff_id'],
  },
] as const;

async function main() {
  const legacy = createLegacyIndexClient();

  try {
    // 1. Check and align collation for user_ticket.completed_attribute_group_key
    console.log('Verifying collation for user_ticket.completed_attribute_group_key...');
    const colInfo = await legacy.$queryRawUnsafe<Array<{ COLLATION_NAME: string }>>(
      `SELECT COLLATION_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'user_ticket' 
         AND COLUMN_NAME = 'completed_attribute_group_key'`
    );
    if (colInfo.length > 0 && colInfo[0].COLLATION_NAME !== 'utf8mb4_general_ci') {
      console.log('Aligning user_ticket.completed_attribute_group_key to utf8mb4_general_ci...');
      await legacy.$executeRawUnsafe(
        `ALTER TABLE \`user_ticket\` MODIFY COLUMN \`completed_attribute_group_key\` CHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL`
      );
      console.log('Collation aligned successfully.');
    } else {
      console.log('user_ticket.completed_attribute_group_key already has correct utf8mb4 collation.');
    }

    // 2. Add missing composite indexes safely (ANALYZE runs only for modified tables)
    await ensureLegacyIndexesSafely(legacy, phase3Indexes);
  } finally {
    await legacy.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to apply Phase 3 legacy performance indexes:', error);
  process.exitCode = 1;
});
