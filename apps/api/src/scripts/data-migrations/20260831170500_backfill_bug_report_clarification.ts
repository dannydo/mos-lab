import type { RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

const migration: DataMigration = {
  id: '20260831170500_backfill_bug_report_clarification',
  description:
    'Mark pre-existing triaged Bug Inbox tickets as clarification-ready so the new Agent safety gate does not stall historical work.',
  async preflight(connection) {
    const [columns] = await connection.execute<RowDataPacket[]>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = 'crm_bug_reports'
         AND column_name IN ('clarification_status', 'clarification_summary', 'clarified_at')`
    );
    if (columns.length !== 3) {
      throw new Error('Bug report clarification columns must exist before the backfill runs.');
    }
  },
  async up(connection) {
    await connection.execute(
      `UPDATE crm_bug_reports
       SET clarification_status = 'READY',
           clarification_summary = COALESCE(
             NULLIF(business_context, ''),
             'Ticket đã được triage trước khi clarification gate được áp dụng.'
           ),
           clarified_at = COALESCE(approved_at, updated_at)
       WHERE status IN ('APPROVED', 'IN_PROGRESS', 'FIXED', 'CLOSED', 'REJECTED', 'DUPLICATE')
         AND clarification_status = 'PENDING_AGENT'`
    );
  },
};

export default migration;
