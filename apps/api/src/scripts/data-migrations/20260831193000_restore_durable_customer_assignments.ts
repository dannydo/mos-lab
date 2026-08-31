import type { RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

const AUTO_EXPIRY_REASONS = [
  'Hết hạn lưu giữ data 30 ngày (Auto Expired 30d)',
  'Hết hạn phân bổ tự động (Auto Expired)',
] as const;

const migration: DataMigration = {
  id: '20260831193000_restore_durable_customer_assignments',
  description:
    'Restore customer assignments last removed by automatic expiry and make every accepted assignment durable.',
  async preflight(connection) {
    const [columns] = await connection.execute<RowDataPacket[]>(
      `SELECT table_name, column_name
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND (
           (table_name = 'crm_customer_assignments' AND column_name IN ('legacy_user_id', 'staff_id', 'expires_at'))
           OR (table_name = 'crm_assignment_history' AND column_name IN ('legacy_user_id', 'prev_staff_id', 'action_type', 'reason'))
           OR (table_name = 'crm_allocation_batches' AND column_name IN ('status', 'retention_expires_at'))
         )`
    );
    if (columns.length !== 9) {
      throw new Error('Customer assignment durability columns must exist before the repair runs.');
    }

    const [candidates] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS count
       FROM crm_assignment_history h
       LEFT JOIN crm_customer_assignments a ON a.legacy_user_id = h.legacy_user_id
       INNER JOIN crm_staff s ON s.id = h.prev_staff_id
       WHERE h.action_type = 'EXPIRE'
         AND h.reason IN (?, ?)
         AND h.prev_staff_id IS NOT NULL
         AND a.id IS NULL
         AND h.id = (
           SELECT MAX(latest.id)
           FROM crm_assignment_history latest
           WHERE latest.legacy_user_id = h.legacy_user_id
         )`,
      [...AUTO_EXPIRY_REASONS]
    );
    console.log(`Assignments eligible for automatic-expiry repair: ${Number(candidates[0]?.count || 0)}`);
  },
  async up(connection) {
    await connection.execute(
      `INSERT INTO crm_customer_assignments (
         legacy_user_id,
         staff_id,
         assigned_at,
         assigned_by,
         expires_at,
         assigned_duration_days,
         is_retained,
         retained_at
       )
       SELECT
         h.legacy_user_id,
         h.prev_staff_id,
         COALESCE(
           (
             SELECT MAX(previous.assigned_at)
             FROM crm_assignment_history previous
             WHERE previous.legacy_user_id = h.legacy_user_id
               AND previous.id < h.id
               AND previous.new_staff_id = h.prev_staff_id
           ),
           h.assigned_at
         ),
         h.assigned_by,
         NULL,
         NULL,
         0,
         NULL
       FROM crm_assignment_history h
       LEFT JOIN crm_customer_assignments a ON a.legacy_user_id = h.legacy_user_id
       INNER JOIN crm_staff s ON s.id = h.prev_staff_id
       WHERE h.action_type = 'EXPIRE'
         AND h.reason IN (?, ?)
         AND h.prev_staff_id IS NOT NULL
         AND a.id IS NULL
         AND h.id = (
           SELECT MAX(latest.id)
           FROM crm_assignment_history latest
           WHERE latest.legacy_user_id = h.legacy_user_id
         )`,
      [...AUTO_EXPIRY_REASONS]
    );

    await connection.execute('UPDATE crm_customer_assignments SET expires_at = NULL WHERE expires_at IS NOT NULL');

    await connection.execute(
      `UPDATE crm_allocation_batches batch
       SET batch.status = 'ACCEPTED',
           batch.retention_expires_at = NULL
       WHERE batch.status = 'EXPIRED'
         AND EXISTS (
           SELECT 1
           FROM crm_assignment_history h
           WHERE h.batch_id = batch.batch_code
             AND h.action_type = 'EXPIRE'
             AND h.reason = ?
         )`,
      [AUTO_EXPIRY_REASONS[0]]
    );

    await connection.execute(
      `UPDATE crm_allocation_batch_items item
       INNER JOIN crm_allocation_batches batch ON batch.id = item.batch_id
       SET item.status = 'ACCEPTED'
       WHERE batch.status = 'ACCEPTED'
         AND batch.retention_expires_at IS NULL
         AND item.status = 'EXPIRED'`
    );

    await connection.execute(
      `UPDATE crm_allocation_batches
       SET retention_expires_at = NULL
       WHERE status = 'ACCEPTED'
         AND retention_expires_at IS NOT NULL`
    );

    await connection.execute(
      `INSERT INTO crm_assignment_history (
         batch_id,
         legacy_user_id,
         prev_staff_id,
         new_staff_id,
         assigned_by,
         assigned_at,
         expires_at,
         source_type,
         action_type,
         reason
       )
       SELECT
         CONCAT('restore_', LEFT(h.batch_id, 42)),
         h.legacy_user_id,
         NULL,
         h.prev_staff_id,
         h.assigned_by,
         NOW(),
         NULL,
         'SYSTEM_REPAIR',
         'RESTORE',
         'Khôi phục assignment bị cơ chế hết hạn tự động thu hồi; từ nay chỉ Quản lý mới được thu hồi.'
       FROM crm_assignment_history h
       INNER JOIN crm_customer_assignments a
         ON a.legacy_user_id = h.legacy_user_id
        AND a.staff_id = h.prev_staff_id
       WHERE h.action_type = 'EXPIRE'
         AND h.reason IN (?, ?)
         AND h.id = (
           SELECT MAX(latest.id)
           FROM crm_assignment_history latest
           WHERE latest.legacy_user_id = h.legacy_user_id
         )`,
      [...AUTO_EXPIRY_REASONS]
    );
  },
};

export default migration;
