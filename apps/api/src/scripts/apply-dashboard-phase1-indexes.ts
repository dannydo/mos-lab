import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client';

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
      await legacy.$executeRawUnsafe(statement);
    }
  } finally {
    await legacy.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to apply Dashboard Phase 1 legacy indexes:', error);
  process.exitCode = 1;
});
