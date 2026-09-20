import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client/index.js';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const phase1Indexes = [
  { name: 'idx_report_order_actual_order', table: 'report_order', columns: ['actual_booking_date_start', 'order_id'] },
  { name: 'idx_order_state_booking_date_id', table: 'order', columns: ['order_state', 'booking_date_start', 'id'] },
  { name: 'idx_order_state_booking_end_id', table: 'order', columns: ['order_state', 'booking_date_end', 'id'] },
  { name: 'idx_order_service_assigned_order', table: 'order_service', columns: ['assigned_staff_id', 'order_id'] },
  { name: 'idx_order_service_checkin_order', table: 'order_service', columns: ['check_in_staff_id', 'order_id'] },
  { name: 'idx_order_service_checkout_order', table: 'order_service', columns: ['check_out_staff_id', 'order_id'] },
  { name: 'idx_staff_bonus_user_order_service', table: 'staff_bonus', columns: ['user_id', 'order_service_id'] },
  { name: 'idx_staff_bonus_type_date_user', table: 'staff_bonus', columns: ['bonus_type', 'date_created', 'user_id'] },
  {
    name: 'idx_order_staff_queue_user_created_store_position',
    table: 'order_staff_queue',
    columns: ['user_id', 'date_created', 'client_store_id', 'position'],
  },
  {
    name: 'idx_user_profile_store_group_active',
    table: 'user_profile',
    columns: ['client_store_id', 'user_group_id', 'is_disabled', 'is_deleted'],
  },
  {
    name: 'idx_staff_task_rule_user_store_id',
    table: 'staff_task',
    columns: ['staff_task_rule_id', 'from_user_id', 'from_client_store_id', 'id'],
  },
  {
    name: 'idx_report_staff_technician_date_user',
    table: 'report_staff_technician',
    columns: ['date', 'user_id'],
  },
  {
    name: 'idx_user_type_date',
    table: 'staff_bonus',
    columns: ['user_id', 'bonus_type', 'date_created'],
  },
  {
    name: 'idx_user_profile_business_username_date',
    table: 'user_profile',
    columns: ['client_business_id', 'username_date_created'],
  },
  {
    name: 'idx_wh_item_to_date_item',
    table: 'inventory_warehouse_order_item',
    columns: ['to_inventory_warehouse_id', 'date_imported', 'inventory_item_id'],
  },
  {
    name: 'idx_user_sms_to_phone_date',
    table: 'user_sms',
    columns: ['to_phone_number', 'date_created'],
  },
  {
    name: 'idx_usb_user_expiry_counts',
    table: 'user_service_balance',
    columns: ['user_id', 'date_expired', 'normal_count', 'retain_count'],
  },
  {
    name: 'idx_osq_store_date_pos',
    table: 'order_staff_queue',
    columns: ['client_store_id', 'date_created', 'position'],
  },
  {
    name: 'idx_report_order_booking_date_start',
    table: 'report_order',
    columns: ['booking_date_start'],
  },
  {
    name: 'idx_ros_staff_order',
    table: 'report_order_service',
    columns: ['assigned_staff_id', 'order_id'],
  },
  {
    name: 'idx_rsts_store_date',
    table: 'report_staff_technician_service',
    columns: ['client_store_id', 'date'],
  },
  {
    name: 'idx_sb_holding_academy',
    table: 'staff_bonus',
    columns: ['is_holding', 'is_academy', 'bonus_currency_id', 'bonus_amount'],
  },
  {
    name: 'idx_order_order_key',
    table: 'order',
    columns: ['order_key'],
  },
  {
    name: 'idx_user_profile_customer_list',
    table: 'user_profile',
    columns: ['client_business_id', 'is_deleted', 'full_name', 'user_id'],
  },
  {
    name: 'idx_order_state_staff_date_id',
    table: 'order_state',
    columns: ['created_staff_id', 'date_created', 'id'],
  },
  {
    name: 'idx_sb_holding_perfect',
    table: 'staff_bonus',
    columns: ['user_id', 'bonus_type', 'is_holding', 'is_academy', 'id', 'date_created'],
  },
  {
    name: 'idx_news_feed_sent_store_created',
    table: 'news_feed',
    columns: ['date_sent', 'from_client_store_id', 'from_user_id', 'date_created'],
  },
  {
    name: 'idx_ubt_user_id_desc',
    table: 'user_balance_transaction',
    columns: ['user_id', 'id'],
  },
] as const;

const quoteIdentifier = (identifier: string) => `\`${identifier.replace(/`/g, '``')}\``;

async function main() {
  const legacy = new LegacyPrismaClient({
    datasources: { db: { url: process.env.LEGACY_DATABASE_URL } },
  });

  try {
    const existing = await legacy.$queryRawUnsafe<Array<{ index_name: string }>>(
      `SELECT DISTINCT index_name FROM information_schema.statistics WHERE table_schema = DATABASE() AND index_name IN (${phase1Indexes
        .map((index) => `'${index.name}'`)
        .join(', ')})`
    );
    const existingNames = new Set(existing.map((index) => index.index_name));

    for (const index of phase1Indexes) {
      if (existingNames.has(index.name)) {
        console.log(`Index already present: ${index.name}`);
        continue;
      }

      const statement = `CREATE INDEX ${quoteIdentifier(index.name)} ON ${quoteIdentifier(index.table)} (${index.columns
        .map(quoteIdentifier)
        .join(', ')})`;
      console.log(`Creating index: ${index.name}`);
      try {
        await legacy.$executeRawUnsafe(statement);
      } catch (error) {
        // A prior deploy connection can finish the same DDL between the initial inventory and this statement.
        if (error instanceof Error && error.message.includes('Duplicate key name')) {
          console.log(`Index already present after concurrent DDL: ${index.name}`);
          continue;
        }
        throw error;
      }
    }
  } finally {
    await legacy.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to apply Dashboard Phase 1 legacy indexes:', error);
  process.exitCode = 1;
});
