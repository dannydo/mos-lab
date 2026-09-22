import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client/index.js';

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

const quoteIdentifier = (identifier: string) => `\`${identifier.replace(/`/g, '``')}\``;

async function main() {
  const legacy = new LegacyPrismaClient({
    datasources: { db: { url: process.env.LEGACY_DATABASE_URL } },
  });

  try {
    const existing = await legacy.$queryRawUnsafe<Array<{ index_name: string }>>(
      `SELECT DISTINCT index_name FROM information_schema.statistics WHERE table_schema = DATABASE() AND index_name IN (${phase2Indexes
        .map((index) => `'${index.name}'`)
        .join(', ')})`
    );
    const existingNames = new Set(existing.map((index) => index.index_name));

    for (const index of phase2Indexes) {
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
        console.log(`Successfully created index: ${index.name}`);
      } catch (error) {
        if (error instanceof Error && error.message.includes('Duplicate key name')) {
          console.log(`Index already present after concurrent DDL: ${index.name}`);
          continue;
        }
        throw error;
      }
    }

    // Run ANALYZE TABLE to refresh optimizer stats
    console.log(
      'Refreshing optimizer statistics for user_call, user_ticket, sales_lead, user_notification, staff_tip, and user_note...'
    );
    await legacy.$executeRawUnsafe(
      'ANALYZE TABLE `user_call`, `user_ticket`, `sales_lead`, `user_notification`, `staff_tip`, `user_note`;'
    );
    console.log('Optimizer statistics refreshed successfully.');
  } finally {
    await legacy.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to apply Phase 2 legacy performance indexes:', error);
  process.exitCode = 1;
});
