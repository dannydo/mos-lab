import type { RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

const migration: DataMigration = {
  id: '20261005110000_repair_lost_history_customer_profiles',
  description:
    'Repair customer history mapping for merged/duplicate profiles (Anni 43308 -> 38217) and purge ghost assignments.',
  async preflight(connection) {
    const [tables] = await connection.execute<RowDataPacket[]>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'crm_customer_assignments'`
    );
    if (tables.length === 0) {
      throw new Error('crm_customer_assignments table must exist.');
    }
  },
  async up(connection) {
    // 1. Remap call logs from duplicate ID 43308 to original customer ID 38217
    await connection.execute(
      `UPDATE crm_call_logs SET legacy_user_id = 38217 WHERE legacy_user_id = 43308`
    );

    // 2. Remap assignment history from 43308 to 38217
    await connection.execute(
      `UPDATE crm_assignment_history SET legacy_user_id = 38217 WHERE legacy_user_id = 43308`
    );

    // 3. Remap customer assignment: if 38217 does not have an assignment, reassign 43308 to 38217; otherwise delete 43308
    const [existing38217] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM crm_customer_assignments WHERE legacy_user_id = 38217 LIMIT 1`
    );
    if (existing38217.length === 0) {
      await connection.execute(
        `UPDATE crm_customer_assignments SET legacy_user_id = 38217 WHERE legacy_user_id = 43308`
      );
    } else {
      await connection.execute(
        `DELETE FROM crm_customer_assignments WHERE legacy_user_id = 43308`
      );
    }

    // 4. Purge known ghost assignments (0 bookings, no phone number)
    await connection.execute(
      `DELETE FROM crm_customer_assignments WHERE legacy_user_id IN (52622, 52600, 52104, 52667)`
    );
  },
};

export default migration;
